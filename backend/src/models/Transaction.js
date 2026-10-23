const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    type: { type: String, enum: ["inward", "outward"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    notes: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
