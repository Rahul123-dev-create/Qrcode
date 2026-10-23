/**
 * Product Service
 * Handles product creation, retrieval, updates, scanning inspection, and lifecycle
 */

const QRCode = require("qrcode");
const { Product, Transaction } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const { validateRequired } = require("../middleware/validation");

class ProductService {
  async createProduct(data, userId = null) {
    const validationError = validateRequired(data, ["sku", "name"]);
    if (validationError) {
      throw new AppError(validationError, 400, "VALIDATION_ERROR");
    }

    const {
      sku,
      name,
      description = "",
      category = "General",
      unit = "units",
      price = 0,
      quantity = 0,
      lowStockThreshold = 10,
    } = data;

    if (sku.length < 2 || sku.length > 50) {
      throw new AppError("SKU must be between 2 and 50 characters", 400, "INVALID_SKU");
    }

    if (name.length < 2 || name.length > 100) {
      throw new AppError("Product name must be between 2 and 100 characters", 400, "INVALID_NAME");
    }

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty < 0) {
      throw new AppError("Quantity must be a non-negative integer", 400, "INVALID_QUANTITY");
    }

    const parsedThreshold = Number(lowStockThreshold);
    if (!Number.isInteger(parsedThreshold) || parsedThreshold < 0) {
      throw new AppError("Low stock threshold must be a non-negative integer", 400, "INVALID_THRESHOLD");
    }

    // Check duplicate SKU (only among active products)
    const existing = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existing && existing.status !== "deleted") {
      throw new AppError("A product with this SKU already exists", 409, "DUPLICATE_SKU");
    }

    const product = new Product({
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      description: description?.trim() || "",
      category: category?.trim() || "General",
      unit: unit?.trim() || "units",
      price: Number(price) >= 0 ? Number(price) : 0,
      quantity: parsedQty,
      lowStockThreshold: parsedThreshold,
      status: "active",
      qrCode: "pending",
    });

    try {
      const qrPayload = JSON.stringify({
        id: String(product._id),
        sku: product.sku,
        name: product.name,
      });

      const qrCode = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: "M",
        width: 320,
        margin: 2,
        type: "image/png",
      });

      product.qrCode = qrCode;
    } catch (err) {
      throw new AppError("Failed to generate QR code", 500, "QR_GENERATION_ERROR");
    }

    await product.save();

    // If initial quantity > 0, record initial inward transaction in audit ledger
    if (parsedQty > 0 && userId) {
      try {
        const initialTx = new Transaction({
          product: product._id,
          type: "inward",
          quantity: parsedQty,
          previousQuantity: 0,
          newQuantity: parsedQty,
          notes: "Initial inventory setup on product creation",
          user: userId,
        });
        await initialTx.save();
      } catch (e) {
        console.warn("Could not record initial transaction:", e.message);
      }
    }

    return product;
  }

  async getProducts(
    page = 1,
    limit = 20,
    search = "",
    sortBy = "createdAt",
    sortOrder = -1,
    status = "active",
    category = ""
  ) {
    let query = {};

    if (status !== "all") {
      query.status = status || "active";
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { sku: searchRegex },
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProductById(id) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }
    return product;
  }

  /**
   * Scan Inspector:
   * Decodes scan input (ID, SKU, or JSON), returns full product status,
   * balance, and chronological transaction history
   */
  async inspectProductByScan(scanInput) {
    if (!scanInput) {
      throw new AppError("Scan code is required", 400, "MISSING_SCAN_CODE");
    }

    let parsedId = null;
    let parsedSku = null;

    // Check if input is JSON payload
    try {
      const parsed = JSON.parse(scanInput);
      if (parsed.id) parsedId = parsed.id;
      if (parsed.sku) parsedSku = parsed.sku;
    } catch {
      // Treat as direct ID or SKU
      const trimmed = scanInput.trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        parsedId = trimmed;
      } else {
        parsedSku = trimmed.toUpperCase();
      }
    }

    let product = null;
    if (parsedId) {
      product = await Product.findById(parsedId);
    }
    if (!product && parsedSku) {
      product = await Product.findOne({ sku: parsedSku });
    }

    if (!product) {
      throw new AppError(
        `No product found matching code "${scanInput}". Please verify the QR code.`,
        404,
        "PRODUCT_NOT_FOUND"
      );
    }

    // Fetch transaction history for this product
    const transactions = await Transaction.find({ product: String(product._id) })
      .populate("user", "username name role")
      .sort({ createdAt: -1 })
      .limit(50);

    // Compute inward vs outward stats
    let totalInward = 0;
    let totalOutward = 0;
    for (const tx of transactions) {
      if (tx.type === "inward") totalInward += tx.quantity || 0;
      if (tx.type === "outward") totalOutward += tx.quantity || 0;
    }

    return {
      product,
      balance: product.quantity,
      status: product.status, // "active", "deleted", or "archived"
      isDeleted: product.status === "deleted",
      deletedAt: product.deletedAt || null,
      summary: {
        totalInward,
        totalOutward,
        transactionCount: transactions.length,
      },
      recentTransactions: transactions,
    };
  }

  async updateProduct(id, data) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    let qrNeedsRegen = false;

    if (data.sku && data.sku.toUpperCase().trim() !== product.sku) {
      const newSku = data.sku.toUpperCase().trim();
      const duplicate = await Product.findOne({
        sku: newSku,
        _id: { $ne: id },
      });
      if (duplicate && duplicate.status !== "deleted") {
        throw new AppError("A product with this SKU already exists", 409, "DUPLICATE_SKU");
      }
      product.sku = newSku;
      qrNeedsRegen = true;
    }

    if (data.name && data.name.trim() !== product.name) {
      product.name = data.name.trim();
      qrNeedsRegen = true;
    }

    if (data.description !== undefined) {
      product.description = data.description?.trim() || "";
    }

    if (data.category !== undefined) {
      product.category = data.category?.trim() || "General";
    }

    if (data.unit !== undefined) {
      product.unit = data.unit?.trim() || "units";
    }

    if (data.price !== undefined) {
      product.price = Number(data.price) >= 0 ? Number(data.price) : 0;
    }

    if (data.lowStockThreshold !== undefined) {
      const threshold = Number(data.lowStockThreshold);
      if (!Number.isInteger(threshold) || threshold < 0) {
        throw new AppError("Low stock threshold must be a non-negative integer", 400, "INVALID_THRESHOLD");
      }
      product.lowStockThreshold = threshold;
    }

    if (qrNeedsRegen) {
      try {
        const qrPayload = JSON.stringify({
          id: String(product._id),
          sku: product.sku,
          name: product.name,
        });
        product.qrCode = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          width: 320,
          margin: 2,
        });
      } catch (err) {
        console.warn("Failed to regenerate QR code:", err.message);
      }
    }

    await product.save();
    return product;
  }

  /**
   * Soft-delete: Marks status as "deleted" so that QR codes still resolve
   * and display status: "deleted" with history!
   */
  async deleteProduct(id, userId = null) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    product.status = "deleted";
    product.deletedAt = new Date().toISOString();
    product.deletedBy = userId;
    await product.save();

    // Record deletion event in transaction ledger
    try {
      const delTx = new Transaction({
        product: product._id,
        type: "outward",
        quantity: 0,
        previousQuantity: product.quantity,
        newQuantity: product.quantity,
        notes: `Product marked deleted/archived by user on ${new Date().toLocaleDateString()}`,
        user: userId || "system",
      });
      await delTx.save();
    } catch (e) {
      // Non-fatal
    }

    return {
      success: true,
      message: "Product archived/deleted successfully",
      product,
    };
  }

  async restoreProduct(id) {
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    product.status = "active";
    product.deletedAt = null;
    product.deletedBy = null;
    await product.save();

    return {
      success: true,
      message: "Product restored to active inventory",
      product,
    };
  }

  async permanentDeleteProduct(id) {
    if (typeof Product.findByIdAndDelete === "function") {
      await Product.findByIdAndDelete(id);
    }
    return { success: true, message: "Product permanently removed" };
  }

  async getCategories() {
    const products = await Product.find({ status: "active" });
    const categories = new Set();
    products.forEach((p) => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories);
  }
}

module.exports = new ProductService();
