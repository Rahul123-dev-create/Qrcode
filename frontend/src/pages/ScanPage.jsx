import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import QRScanner from "../components/QRScanner";
import StockBadge from "../components/StockBadge";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import {
  ScanLine,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Package,
  Printer,
  RotateCcw,
  Clock,
  Search,
  Tag,
  Boxes,
  X,
  FileSpreadsheet,
} from "lucide-react";

// Web Audio API beep feedback
function playScanBeep(isSuccess = true) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {}
}

export default function ScanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Scanned product details & audit history
  const isScanningLocked = useRef(false);
  const [scanResult, setScanResult] = useState(null);
  const [scannerKey, setScannerKey] = useState(0);

  // Stock movement modal state
  const [movementModal, setMovementModal] = useState({
    isOpen: false,
    type: "inward", // "inward" | "outward"
    quantity: "1",
    notes: "",
    isSubmitting: false,
  });

  // QR Enlarged Preview Modal
  const [showQrModal, setShowQrModal] = useState(false);

  const toast = useToast();

  const handleInspect = useCallback(
    async (codeToLookup) => {
      if (!codeToLookup || !codeToLookup.trim()) return;
      if (isScanningLocked.current) return; // <-- Prevents repeated trigger
      isScanningLocked.current = true;
      setError("");
      setLoading(true);

      try {
        const { data } = await api.post("/products/scan", {
          code: codeToLookup.trim(),
        });
        const result = data?.data || data;
        setScanResult(result);
        playScanBeep(true);
        toast.success(`Scanned: ${result.product.name}`);
      } catch (err) {
        playScanBeep(false);
        const errMsg = err?.response?.data?.message || "Product not found";
        setError(errMsg);
        toast.error(errMsg);
        setScanResult(null);
        isScanningLocked.current = false; // Release lock on error
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Auto-lookup if ?sku=... or ?code=... is in the URL
  useEffect(() => {
    const urlSku = searchParams.get("sku") || searchParams.get("code");
    if (urlSku) {
      handleInspect(urlSku);
    }
  }, [searchParams, handleInspect]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (scanInput.trim()) {
      handleInspect(scanInput.trim());
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!scanResult?.product) return;

    const qty = Number(movementModal.quantity);
    if (!qty || qty < 1) {
      toast.error("Please enter a valid positive quantity");
      return;
    }

    if (movementModal.type === "outward" && qty > scanResult.balance) {
      toast.error(`Insufficient stock! Available: ${scanResult.balance} ${scanResult.product.unit || "units"}`);
      return;
    }

    setMovementModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const { data } = await api.post("/transactions", {
        productId: scanResult.product._id,
        type: movementModal.type,
        quantity: qty,
        notes: movementModal.notes,
      });

      toast.success(
        `Successfully ${movementModal.type === "inward" ? "added" : "removed"} ${qty} ${
          scanResult.product.unit || "units"
        }`
      );

      // Re-inspect the product to refresh current balance and recent transactions
      await handleInspect(scanResult.product.sku);

      // Close modal
      setMovementModal({
        isOpen: false,
        type: "inward",
        quantity: "1",
        notes: "",
        isSubmitting: false,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Transaction failed";
      toast.error(msg);
    } finally {
      setMovementModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleRestoreProduct = async () => {
    if (!scanResult?.product?._id) return;
    try {
      await api.post(`/products/${scanResult.product._id}/restore`);
      toast.success("Product restored to active inventory!");
      await handleInspect(scanResult.product.sku);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to restore product");
    }
  };

  const resetScanner = () => {
    isScanningLocked.current = false; // <-- Reset lock
    setScanResult(null);
    setScanInput("");
    setError("");
    setScannerKey((k) => k + 1);
    setSearchParams({});
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
          <ScanLine className="w-7 h-7 text-blue-500" />
          QR Code Scanner & Stock Inspector
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Scan any product QR code or enter SKU to inspect status, live balance, and recent transaction history.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* SCANNING INTERFACE (When no product is currently inspected) */}
      {!scanResult && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Camera / File Upload Scanner */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-blue-400" />
              Scan QR Code (Camera or File)
            </h2>
            <QRScanner key={scannerKey} onScan={handleInspect} onError={(msg) => setError(msg)} />
            {loading && (
              <div className="flex items-center justify-center gap-2.5 py-4 text-blue-400 text-sm font-medium">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Retrieving product data & transaction history...
              </div>
            )}
          </div>

          {/* Quick Manual SKU Search & Demo Test Items */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                Barcode Gun / Manual SKU
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Type or paste a SKU / QR payload to inspect immediately:
              </p>
              <form onSubmit={handleManualSearch} className="space-y-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="e.g. BISCUIT-001"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading || !scanInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-semibold transition"
                >
                  Lookup Product
                </button>
              </form>
            </div>

            {/* Quick Demo Test Buttons */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">⚡ Quick Test Sample Products:</h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { sku: "BISCUIT-001", label: "Parle-G Biscuit" },
                  { sku: "BISCUIT-002", label: "Bourbon Biscuit" },
                  { sku: "TEA-101", label: "Tata Tea Leaf" },
                  { sku: "MILK-201", label: "Amul Milk (Low)" },
                  { sku: "CHOC-301", label: "Cadbury Silk (0 Stock)" },
                ].map((item) => (
                  <button
                    key={item.sku}
                    type="button"
                    onClick={() => handleInspect(item.sku)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTED PRODUCT CARD & TRANSACTION AUDIT LOG */}
      {scanResult && (
        <div className="space-y-6">
          {/* TOP DELETED / STATUS ALERT */}
          {scanResult.isDeleted ? (
            <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-900/50 text-rose-300 rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-200">
                    ATTENTION: THIS PRODUCT IS ARCHIVED / DELETED
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    Removed on {new Date(scanResult.deletedAt).toLocaleString()}. You can review its historical records below or restore it.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRestoreProduct}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Product
              </button>
            </div>
          ) : scanResult.balance === 0 ? (
            <div className="bg-red-950/30 border border-red-800/60 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-xs text-red-300 font-medium">
                Out of Stock: Current inventory is 0 units. Inward stock movement is required.
              </p>
            </div>
          ) : scanResult.balance <= scanResult.product.lowStockThreshold ? (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300 font-medium">
                Low Stock Alert: Balance ({scanResult.balance}) is at or below the threshold ({scanResult.product.lowStockThreshold}).
              </p>
            </div>
          ) : null}

          {/* MAIN PRODUCT SUMMARY CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              {/* Product Info */}
              <div className="flex items-start gap-4">
                <div
                  onClick={() => setShowQrModal(true)}
                  className="w-20 h-20 bg-white p-1 rounded-xl shadow cursor-pointer hover:opacity-90 transition shrink-0"
                  title="Click to view QR label"
                >
                  <img
                    src={scanResult.product.qrCode}
                    alt="Product QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-blue-400 border border-slate-700 font-semibold">
                      {scanResult.product.sku}
                    </span>
                    <StockBadge
                      quantity={scanResult.balance}
                      threshold={scanResult.product.lowStockThreshold}
                      status={scanResult.status}
                    />
                    <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                      {scanResult.product.category || "General"}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">
                    {scanResult.product.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    {scanResult.product.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* CURRENT BALANCE DISPLAY (Prominent Motto Metric) */}
              <div className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Current Stock Balance
                  </p>
                  <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                    <span
                      className={`text-3xl md:text-4xl font-extrabold ${
                        scanResult.isDeleted
                          ? "text-slate-400"
                          : scanResult.balance === 0
                          ? "text-red-400"
                          : scanResult.balance <= scanResult.product.lowStockThreshold
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {scanResult.balance}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {scanResult.product.unit || "units"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Alert threshold: {scanResult.product.lowStockThreshold} units
                  </p>
                </div>
              </div>
            </div>

            {/* ACTION TOOLBAR: INWARD, OUTWARD, PRINT, SCAN ANOTHER */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={scanResult.isDeleted}
                  onClick={() =>
                    setMovementModal({
                      isOpen: true,
                      type: "inward",
                      quantity: "1",
                      notes: "",
                      isSubmitting: false,
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  + Stock In (Inward)
                </button>

                <button
                  type="button"
                  disabled={scanResult.isDeleted || scanResult.balance <= 0}
                  onClick={() =>
                    setMovementModal({
                      isOpen: true,
                      type: "outward",
                      quantity: "1",
                      notes: "",
                      isSubmitting: false,
                    })
                  }
                  className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  - Stock Out (Outward)
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print QR Label
                </button>
              </div>

              <button
                type="button"
                onClick={resetScanner}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Scan Another Product
              </button>
            </div>
          </div>

          {/* RECENT TRANSACTIONS / AUDIT TRAIL TABLE FOR THIS SCANNED PRODUCT */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Recent Transaction History & Movements
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete audit trail of inward receipts and outward dispatches for {scanResult.product.name}
                </p>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-3">
                <span className="text-emerald-400 font-semibold">
                  Inward: +{scanResult.summary?.totalInward || 0}
                </span>
                <span className="text-rose-400 font-semibold">
                  Outward: -{scanResult.summary?.totalOutward || 0}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/20 text-slate-400 text-xs uppercase">
                    <th className="text-left px-5 py-3">Type</th>
                    <th className="text-right px-5 py-3">Quantity</th>
                    <th className="text-right px-5 py-3">Balance Change</th>
                    <th className="text-left px-5 py-3">Date & Time</th>
                    <th className="text-left px-5 py-3">Handled By</th>
                    <th className="text-left px-5 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(!scanResult.recentTransactions || scanResult.recentTransactions.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        No transactions recorded for this product yet.
                      </td>
                    </tr>
                  ) : (
                    scanResult.recentTransactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              tx.type === "inward"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {tx.type === "inward" ? (
                              <ArrowDownCircle className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                            )}
                            {tx.type === "inward" ? "INWARD" : "OUTWARD"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-white">
                          {tx.type === "inward" ? "+" : "-"}
                          {tx.quantity} {scanResult.product.unit || "units"}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-xs text-slate-400">
                          {tx.previousQuantity ?? "—"} → <span className="font-bold text-white">{tx.newQuantity}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-300">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-300">
                          {tx.user?.name || tx.user?.username || "Staff"}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 max-w-xs truncate">
                          {tx.notes || <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STOCK INWARD / OUTWARD TRANSACTION */}
      {movementModal.isOpen && scanResult && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMovementModal((p) => ({ ...p, isOpen: false }))}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {movementModal.type === "inward" ? (
                  <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-rose-400" />
                )}
                {movementModal.type === "inward" ? "Record Stock Inward" : "Record Stock Outward"}
              </h3>
              <button
                type="button"
                onClick={() => setMovementModal((p) => ({ ...p, isOpen: false }))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Product: <strong className="text-white">{scanResult.product.name}</strong> ({scanResult.product.sku})
              <br />
              Current Available Balance: <strong className="text-blue-400">{scanResult.balance} {scanResult.product.unit || "units"}</strong>
            </p>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quantity ({scanResult.product.unit || "units"}) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={movementModal.type === "outward" ? scanResult.balance : undefined}
                  value={movementModal.quantity}
                  onChange={(e) =>
                    setMovementModal((prev) => ({ ...prev, quantity: e.target.value }))
                  }
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Quick Increment Buttons */}
                <div className="flex gap-1.5 mt-2">
                  {[1, 5, 10, 25].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() =>
                        setMovementModal((prev) => ({ ...prev, quantity: String(amt) }))
                      }
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1 rounded-lg border border-slate-700"
                    >
                      +{amt}
                    </button>
                  ))}
                  {movementModal.type === "outward" && (
                    <button
                      type="button"
                      onClick={() =>
                        setMovementModal((prev) => ({ ...prev, quantity: String(scanResult.balance) }))
                      }
                      className="flex-1 bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs py-1 rounded-lg border border-rose-800"
                    >
                      Max ({scanResult.balance})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notes / Reference # (Optional)
                </label>
                <input
                  type="text"
                  value={movementModal.notes}
                  onChange={(e) =>
                    setMovementModal((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="e.g. Batch receipt #8812, counter dispatch, damaged return"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModal((p) => ({ ...p, isOpen: false }))}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={movementModal.isSubmitting}
                  className={`flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 ${
                    movementModal.type === "inward"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {movementModal.isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Confirm {movementModal.type === "inward" ? "Stock In" : "Stock Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE ENLARGED & PRINT PREVIEW */}
      {showQrModal && scanResult && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Product QR Label</h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block mb-3">
              <img
                src={scanResult.product.qrCode}
                alt={scanResult.product.name}
                className="w-48 h-48 mx-auto"
              />
              <p className="font-mono font-bold text-xs text-slate-900 mt-2">
                {scanResult.product.sku}
              </p>
              <p className="text-[11px] text-slate-600 truncate max-w-[200px] mx-auto">
                {scanResult.product.name}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={scanResult.product.qrCode}
                download={`${scanResult.product.sku}-qrcode.png`}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition"
              >
                Download PNG
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
