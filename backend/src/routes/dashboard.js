const express = require("express");
const { asyncHandler } = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboardService");
const { requireAuth } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();
router.use(requireAuth);
router.use(apiLimiter);

/**
 * GET /api/dashboard
 * Get dashboard statistics and metrics
 */
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const stats = await dashboardService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * GET /api/dashboard/alerts
 * Get low stock and out of stock alerts
 */
router.get(
  "/alerts",
  asyncHandler(async (_req, res) => {
    const alerts = await dashboardService.getLowStockAlert();
    res.json({
      success: true,
      data: alerts,
    });
  })
);

/**
 * GET /api/dashboard/export-transactions
 * Download transaction ledger as CSV
 */
router.get(
  "/export-transactions",
  asyncHandler(async (req, res) => {
    const csv = await dashboardService.exportTransactionsCsv(req.query);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="transactions-report.csv"');
    res.status(200).send(csv);
  })
);

/**
 * GET /api/dashboard/export-inventory
 * Download inventory summary as CSV
 */
router.get(
  "/export-inventory",
  asyncHandler(async (_req, res) => {
    const csv = await dashboardService.exportInventoryCsv();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory-report.csv"');
    res.status(200).send(csv);
  })
);

/**
 * GET /api/dashboard/inventory-report
 * Get JSON inventory report
 */
router.get(
  "/inventory-report",
  asyncHandler(async (req, res) => {
    const { sortBy = "quantity", sortOrder = 1 } = req.query;
    const report = await dashboardService.getInventoryReport(
      sortBy,
      parseInt(sortOrder)
    );
    res.json({
      success: true,
      data: report,
    });
  })
);

module.exports = router;
