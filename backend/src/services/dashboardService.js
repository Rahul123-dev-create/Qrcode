/**
 * Dashboard Service
 * Handles metrics, analytics, valuation, alerts, and CSV exports
 */

const { Product, Transaction, getDatabaseStatus } = require("../db");

class DashboardService {
  async getDashboardStats() {
    try {
      const [
        totalProducts,
        products,
        recentTransactions,
        transactionStats,
      ] = await Promise.all([
        Product.countDocuments({ status: "active" }),
        Product.find({ status: "active" }).sort({ quantity: 1 }),
        Transaction.find()
          .populate("product", "sku name category unit")
          .populate("user", "username name role")
          .sort({ createdAt: -1 })
          .limit(10),
        Transaction.aggregate([
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              totalQuantity: { $sum: "$quantity" },
            },
          },
        ]),
      ]);

      const lowStockProducts = products.filter(
        (p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold
      );
      const outOfStockProducts = products.filter((p) => p.quantity === 0);
      const inStockProducts = products.filter(
        (p) => p.quantity > p.lowStockThreshold
      );
      const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);

      // Inventory Valuation
      const totalValuation = products.reduce(
        (sum, p) => sum + (p.quantity || 0) * (p.price || 0),
        0
      );

      const inwardStats = transactionStats.find((s) => s._id === "inward") || { count: 0, totalQuantity: 0 };
      const outwardStats = transactionStats.find((s) => s._id === "outward") || { count: 0, totalQuantity: 0 };

      return {
        overview: {
          totalProducts,
          inStockCount: inStockProducts.length,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          totalStock,
          totalValuation: Math.round(totalValuation * 100) / 100,
        },
        transactions: {
          totalInward: inwardStats.count,
          totalInwardQuantity: inwardStats.totalQuantity,
          totalOutward: outwardStats.count,
          totalOutwardQuantity: outwardStats.totalQuantity,
          totalTransactions: inwardStats.count + outwardStats.count,
        },
        inventory: {
          lowStockProducts,
          outOfStockProducts,
          inStockProducts,
        },
        recentTransactions,
        database: getDatabaseStatus(),
      };
    } catch (err) {
      console.error("Dashboard stats error:", err);
      throw err;
    }
  }

  async getInventoryReport(sortBy = "quantity", sortOrder = 1) {
    const products = await Product.find({ status: "active" })
      .sort({ [sortBy]: sortOrder });

    return products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: p.price,
      quantity: p.quantity,
      valuation: (p.quantity || 0) * (p.price || 0),
      lowStockThreshold: p.lowStockThreshold,
      status: p.quantity === 0 ? "Out of Stock" : p.quantity <= p.lowStockThreshold ? "Low Stock" : "In Stock",
      createdAt: p.createdAt,
    }));
  }

  async getTransactionReport(filters = {}) {
    let query = {};
    if (filters.type && ["inward", "outward"].includes(filters.type)) {
      query.type = filters.type;
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const transactions = await Transaction.find(query)
      .populate("product", "sku name category unit")
      .populate("user", "username name role")
      .sort({ createdAt: -1 });

    return transactions;
  }

  async getLowStockAlert() {
    const products = await Product.find({ status: "active" });
    const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
    const outOfStock = products.filter((p) => p.quantity === 0);

    return {
      lowStock,
      outOfStock,
      totalAlerts: lowStock.length + outOfStock.length,
    };
  }

  async exportTransactionsCsv(filters = {}) {
    const transactions = await this.getTransactionReport(filters);

    const headers = [
      "Transaction ID",
      "Date & Time",
      "Type",
      "Product SKU",
      "Product Name",
      "Quantity Moved",
      "Previous Balance",
      "New Balance",
      "Operator",
      "Notes",
    ];

    const rows = transactions.map((t) => [
      t._id,
      new Date(t.createdAt).toISOString(),
      t.type.toUpperCase(),
      `"${(t.product?.sku || "").replace(/"/g, '""')}"`,
      `"${(t.product?.name || "").replace(/"/g, '""')}"`,
      t.quantity,
      t.previousQuantity,
      t.newQuantity,
      `"${(t.user?.username || t.user?.name || "").replace(/"/g, '""')}"`,
      `"${(t.notes || "").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  async exportInventoryCsv() {
    const products = await this.getInventoryReport();

    const headers = [
      "SKU",
      "Product Name",
      "Category",
      "Unit",
      "Unit Price",
      "Current Stock",
      "Total Valuation",
      "Low Stock Threshold",
      "Stock Status",
      "Created At",
    ];

    const rows = products.map((p) => [
      `"${(p.sku || "").replace(/"/g, '""')}"`,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.category || "").replace(/"/g, '""')}"`,
      `"${(p.unit || "").replace(/"/g, '""')}"`,
      p.price || 0,
      p.quantity || 0,
      p.valuation || 0,
      p.lowStockThreshold || 0,
      p.status,
      new Date(p.createdAt).toISOString(),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}

module.exports = new DashboardService();
