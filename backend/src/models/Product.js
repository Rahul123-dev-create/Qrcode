const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General", trim: true },
    unit: { type: String, default: "units", trim: true },
    price: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    status: { type: String, enum: ["active", "deleted", "archived"], default: "active" },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    qrCode: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
