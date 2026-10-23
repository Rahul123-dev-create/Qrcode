const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const productService = require("../services/productService");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validatePaginationQuery } = require("../middleware/validation");
const { apiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();
router.use(requireAuth);
router.use(apiLimiter);

/**
 * GET /api/products
 * Get all products with pagination, search, category, and status filter
 */
router.get(
  "/",
  validatePaginationQuery,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.pagination;
    const { search = "", sortBy = "createdAt", sortOrder = -1, status = "active", category = "" } = req.query;

    const result = await productService.getProducts(
      page,
      limit,
      search,
      sortBy,
      parseInt(sortOrder),
      status,
      category
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/products/categories
 * Get list of available product categories
 */
router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await productService.getCategories();
    res.json({
      success: true,
      data: categories,
    });
  })
);

/**
 * POST /api/products/scan
 * Lookup product by scan code (ID, SKU, or JSON payload)
 * Returns status, quantity/balance, and transaction audit log
 */
router.post(
  "/scan",
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    const result = await productService.inspectProductByScan(code);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/products/scan/:code
 * Also support GET scan for direct URL or query lookups
 */
router.get(
  "/scan/:code",
  asyncHandler(async (req, res) => {
    const result = await productService.inspectProductByScan(req.params.code);
    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/products/:id
 * Get a specific product by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * POST /api/products
 * Create a new product
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { sku, name, description, category, unit, price, quantity, lowStockThreshold } = req.body;
    const product = await productService.createProduct(
      {
        sku,
        name,
        description,
        category,
        unit,
        price,
        quantity,
        lowStockThreshold,
      },
      req.userId
    );

    res.status(201).json({
      success: true,
      data: product,
    });
  })
);

/**
 * PUT /api/products/:id
 * Update a product
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json({
      success: true,
      data: product,
    });
  })
);

/**
 * DELETE /api/products/:id
 * Soft-delete / archive a product (retains QR scan history & displays status: deleted)
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await productService.deleteProduct(req.params.id, req.userId);
    res.json({
      success: true,
      message: "Product archived/deleted successfully",
      data: result,
    });
  })
);

/**
 * POST /api/products/:id/restore
 * Restore a soft-deleted product
 */
router.post(
  "/:id/restore",
  asyncHandler(async (req, res) => {
    const result = await productService.restoreProduct(req.params.id);
    res.json({
      success: true,
      message: "Product restored to active inventory",
      data: result,
    });
  })
);

/**
 * DELETE /api/products/:id/permanent
 * Permanently purge product (Admin only)
 */
router.delete(
  "/:id/permanent",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const result = await productService.permanentDeleteProduct(req.params.id);
    res.json({
      success: true,
      data: result,
    });
  })
);

module.exports = router;
