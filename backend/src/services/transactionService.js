/**
 * Transaction Service
 * Handles stock inward/outward transactions and inventory movements
 */

const { Product, Transaction } = require("../db");
const { AppError } = require("../middleware/errorHandler");
const { validateRequired } = require("../middleware/validation");

class TransactionService {
  async createTransaction(userId, productId, type, quantity, notes = "") {
    const validationError = validateRequired(
      { productId, type, quantity },
      ["productId", "type", "quantity"]
    );
    if (validationError) {
      throw new AppError(validationError, 400, "VALIDATION_ERROR");
    }

    if (!["inward", "outward"].includes(type)) {
      throw new AppError("Transaction type must be 'inward' or 'outward'", 400, "INVALID_TYPE");
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new AppError("Quantity must be a positive integer", 400, "INVALID_QUANTITY");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    if (product.status === "deleted") {
      throw new AppError(
        "Cannot record stock movement for a deleted product. Please restore the product first.",
        400,
        "PRODUCT_DELETED"
      );
    }

    // Check stock availability for outward transaction
    if (type === "outward") {
      if (product.quantity < qty) {
        throw new AppError(
          `Insufficient stock. Available: ${product.quantity} ${product.unit || "units"}, Requested: ${qty}`,
          422,
          "INSUFFICIENT_STOCK"
        );
      }
    }

    const previousQuantity = product.quantity;

    if (type === "inward") {
      product.quantity += qty;
    } else {
      product.quantity -= qty;
    }

    await product.save();

    const transaction = new Transaction({
      product: product._id,
      type,
      quantity: qty,
      previousQuantity,
      newQuantity: product.quantity,
      notes: notes?.trim() || "",
      user: userId,
    });

    await transaction.save();

    // Populate for response
    if (typeof transaction.populate === "function") {
      await transaction.populate("product", "sku name category unit price status");
      await transaction.populate("user", "username name role");
    }

    return {
      transaction,
      product,
    };
  }

  async getTransactions(page = 1, limit = 20, filters = {}) {
    let query = {};

    if (filters.type && ["inward", "outward"].includes(filters.type)) {
      query.type = filters.type;
    }

    if (filters.productId) {
      query.product = filters.productId;
    }

    if (filters.userId) {
      query.user = filters.userId;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate("product", "sku name category unit price")
        .populate("user", "username name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(query),
    ]);

    return {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTransactionById(id) {
    const transaction = await Transaction.findById(id)
      .populate("product")
      .populate("user", "username name role");
    if (!transaction) {
      throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
    }
    return transaction;
  }

  async getProductTransactionHistory(productId, limit = 50) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404, "PRODUCT_NOT_FOUND");
    }

    const transactions = await Transaction.find({ product: String(productId) })
      .populate("user", "username name role")
      .sort({ createdAt: -1 })
      .limit(limit);

    return transactions;
  }

  async getTransactionStats(filters = {}) {
    let matchStage = {};
    if (filters.productId) matchStage.product = filters.productId;
    if (filters.dateFrom || filters.dateTo) {
      matchStage.createdAt = {};
      if (filters.dateFrom) matchStage.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) matchStage.createdAt.$lte = new Date(filters.dateTo);
    }

    return Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
        },
      },
    ]);
  }
}

module.exports = new TransactionService();
