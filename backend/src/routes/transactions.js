const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const transactionService = require("../services/transactionService");
const { requireAuth } = require("../middleware/auth");
const { validatePaginationQuery } = require("../middleware/validation");
const { apiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();
router.use(requireAuth);
router.use(apiLimiter);

/**
 * GET /api/transactions
 * Get all transactions with pagination
 */
router.get(
  "/",
  validatePaginationQuery,
  asyncHandler(async (req, res) => {
    const { page, limit } = req.pagination;
    const { type, productId, dateFrom, dateTo } = req.query;

    const filters = {
      ...(type && { type }),
      ...(productId && { productId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    };

    const result = await transactionService.getTransactions(page, limit, filters);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/transactions/product/:productId/history
 * Get transaction history for a product
 */
router.get(
  "/product/:productId/history",
  asyncHandler(async (req, res) => {
    const transactions = await transactionService.getProductTransactionHistory(
      req.params.productId,
      req.query.limit || 50
    );

    res.json({
      success: true,
      data: transactions,
    });
  })
);

/**
 * GET /api/transactions/:id
 * Get a specific transaction
 */
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const transaction = await transactionService.getTransactionById(req.params.id);
    res.json({
      success: true,
      data: transaction,
    });
  })
);

/**
 * POST /api/transactions
 * Create a new transaction
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId, type, quantity, notes } = req.body;
    const result = await transactionService.createTransaction(
      req.userId,
      productId,
      type,
      quantity,
      notes
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/transactions/product/:productId/history
 * Get transaction history for a product
 */
router.get(
  "/product/:productId/history",
  asyncHandler(async (req, res) => {
    const transactions = await transactionService.getProductTransactionHistory(
      req.params.productId,
      req.query.limit || 50
    );

    res.json({
      success: true,
      data: transactions,
    });
  })
);

module.exports = router;
