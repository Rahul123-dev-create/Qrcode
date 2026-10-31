import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/api";
import { StockBadge } from "../components/StockBadge";
import { useToast } from "../context/ToastContext";
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  Printer,
  Download,
  Trash2,
  RotateCcw,
  Clock,
  Wallet,
  X,
} from "lucide-react";

/**
 * Dedicated scanned-product screen.
 * Displays the product header + QR, three metric cards
 * (current balance / total inward / total outward) and two separate
 * chronological movement logs with quick inward/outward actions.
 */
export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [movement, setMovement] = useState({
    isOpen: false,
    type: "inward",
    quantity: "1",
    notes: "",
    submitting: false,
  });
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/products/${id}`);
      setDetail(data?.data || data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const openMovement = (type) =>
    setMovement({ isOpen: true, type, quantity: "1", notes: "", submitting: false });

  const submitMovement = async (e) => {
    e.preventDefault();
    if (!detail) return;

    const qty = Number(movement.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Please enter a valid positive quantity");
      return;
    }
    if (movement.type === "outward" && qty > detail.balance) {
      toast.error(
        `Cannot remove more than the available balance (${detail.balance} ${detail.product.unit || "units"})`
      );
      return;
    }

    setMovement((m) => ({ ...m, submitting: true }));
    try {
      await api.post("/transactions", {
        productId: detail.product._id,
        type: movement.type,
        quantity: qty,
        notes: movement.notes,
      });
      toast.success(
        `${movement.type === "inward" ? "Added" : "Removed"} ${qty} ${detail.product.unit || "units"}`
      );
      setMovement({ isOpen: false, type: "inward", quantity: "1", notes: "", submitting: false });
      await fetchDetail();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Stock movement failed");
    } finally {
      setMovement((m) => ({ ...m, submitting: false }));
    }
  };

  const handleRestore = async () => {
    try {
      await api.post(`/products/${id}/restore`);
      toast.success("Product restored to active inventory");
      await fetchDetail();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to restore product");
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!confirm(`Archive / delete "${detail.product.name}"? Printed QR codes will still resolve to its history.`)) {
      return;
    }
    try {
      await api.delete(`/products/${id}`);
      toast.success(`Product "${detail.product.name}" archived`);
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete product");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to inventory
        </Link>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-white font-bold mb-1">Product unavailable</h2>
          <p className="text-slate-500 text-sm">{error || "This product could not be found."}</p>
        </div>
      </div>
    );
  }

  const { product, balance, status, isDeleted, deletedAt, summary, inwardTransactions, outwardTransactions } =
    detail;
  const unit = product.unit || "units";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Back + header actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to inventory
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={product.qrCode}
            download={`${product.sku}-qr.png`}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" /> Download QR
          </a>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {!isDeleted && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-rose-950 border border-slate-700 text-slate-400 hover:text-rose-300 text-xs font-semibold px-3 py-2 rounded-xl transition"
              title="Archive / delete this product"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Soft-delete banner */}
      {isDeleted && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-200">Status: Archived / Deleted</h3>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {deletedAt
                  ? `Removed on ${new Date(deletedAt).toLocaleString()}.`
                  : "This product has been removed."}{" "}
                Its full audit trail is preserved below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRestore}
            className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore Product
          </button>
        </div>
      )}

      {/* Product header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-5">
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="w-28 h-28 bg-white p-2 rounded-2xl shadow shrink-0"
            title="View QR label"
          >
            <img src={product.qrCode} alt={product.sku} className="w-full h-full object-contain" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-800 text-blue-400 border border-slate-700 font-semibold">
                {product.sku}
              </span>
              <StockBadge quantity={balance} threshold={product.lowStockThreshold} status={status} />
            </div>
            <h1 className="text-2xl font-bold text-white">{product.name}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {product.description || "No description provided."}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Meta label="Category" value={product.category || "General"} />
              <Meta label="Unit" value={unit} />
              <Meta label="Unit Price" value={`₹${Number(product.price || 0).toFixed(2)}`} />
              <Meta label="Low Stock Threshold" value={product.lowStockThreshold} />
            </div>
          </div>
        </div>
      </div>

      {/* Three metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          tone="indigo"
          icon={Wallet}
          label="Current Balance"
          value={balance}
          suffix={unit}
        />
        <MetricCard
          tone="emerald"
          icon={ArrowDownCircle}
          label="Total Inward Stock"
          value={`+${summary?.totalInward ?? 0}`}
          suffix={unit}
        />
        <MetricCard
          tone="rose"
          icon={ArrowUpCircle}
          label="Total Outward Stock"
          value={`-${summary?.totalOutward ?? 0}`}
          suffix={unit}
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isDeleted}
          onClick={() => openMovement("inward")}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20"
        >
          <ArrowDownCircle className="w-4 h-4" /> + Add Stock (Inward)
        </button>
        <button
          type="button"
          disabled={isDeleted || balance <= 0}
          onClick={() => openMovement("outward")}
          className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-3 rounded-xl transition shadow-lg shadow-rose-600/20"
        >
          <ArrowUpCircle className="w-4 h-4" /> - Remove / Delete Stock (Outward)
        </button>
      </div>

      {/* Two separate movement tables */}
      <MovementTable
        tone="emerald"
        icon={ArrowDownCircle}
        title="Inward History"
        subtitle={`Stock added to ${product.name}`}
        total={summary?.totalInward ?? 0}
        totalLabel="Total added"
        transactions={inwardTransactions}
        unit={unit}
      />
      <MovementTable
        tone="rose"
        icon={ArrowUpCircle}
        title="Outward History"
        subtitle={`Stock removed from ${product.name}`}
        total={summary?.totalOutward ?? 0}
        totalLabel="Total removed"
        transactions={outwardTransactions}
        unit={unit}
      />

      {/* Stock movement modal */}
      {movement.isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMovement((m) => ({ ...m, isOpen: false }))}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {movement.type === "inward" ? (
                  <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-rose-400" />
                )}
                {movement.type === "inward" ? "Add Stock (Inward)" : "Remove Stock (Outward)"}
              </h3>
              <button
                type="button"
                onClick={() => setMovement((m) => ({ ...m, isOpen: false }))}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Product: <strong className="text-white">{product.name}</strong> ({product.sku})
              <br />
              Current balance:{" "}
              <strong className="text-blue-400">
                {balance} {unit}
              </strong>
            </p>

            <form onSubmit={submitMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quantity ({unit}) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={movement.type === "outward" ? balance : undefined}
                  value={movement.quantity}
                  onChange={(e) => setMovement((m) => ({ ...m, quantity: e.target.value }))}
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-1.5 mt-2">
                  {[1, 5, 10, 25].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMovement((m) => ({ ...m, quantity: String(amt) }))}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1 rounded-lg border border-slate-700"
                    >
                      +{amt}
                    </button>
                  ))}
                  {movement.type === "outward" && (
                    <button
                      type="button"
                      onClick={() => setMovement((m) => ({ ...m, quantity: String(balance) }))}
                      className="flex-1 bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs py-1 rounded-lg border border-rose-800"
                    >
                      Max ({balance})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Notes / Reference (optional)
                </label>
                <input
                  type="text"
                  value={movement.notes}
                  onChange={(e) => setMovement((m) => ({ ...m, notes: e.target.value }))}
                  placeholder="e.g. Batch receipt #8812, counter dispatch"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMovement((m) => ({ ...m, isOpen: false }))}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={movement.submitting}
                  className={`flex-1 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2 ${
                    movement.type === "inward"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {movement.submitting && (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Confirm {movement.type === "inward" ? "Stock In" : "Stock Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR modal */}
      {showQrModal && (
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
            <div className="bg-white p-4 rounded-xl inline-block mb-3">
              <img src={product.qrCode} alt={product.name} className="w-48 h-48 mx-auto" />
              <p className="font-mono font-bold text-xs text-slate-900 mt-2">{product.sku}</p>
              <p className="text-[11px] text-slate-600 truncate max-w-[200px] mx-auto">
                {product.name}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={product.qrCode}
                download={`${product.sku}-qr.png`}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition"
              >
                Download PNG
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="bg-slate-800/50 border border-slate-800 rounded-xl px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
      <p className="text-sm font-semibold text-slate-200 truncate">{value}</p>
    </div>
  );
}

const METRIC_TONES = {
  indigo: {
    wrap: "border-indigo-500/30 bg-indigo-500/10",
    icon: "bg-indigo-500/20 text-indigo-300",
    value: "text-indigo-300",
  },
  emerald: {
    wrap: "border-emerald-500/30 bg-emerald-500/10",
    icon: "bg-emerald-500/20 text-emerald-300",
    value: "text-emerald-300",
  },
  rose: {
    wrap: "border-rose-500/30 bg-rose-500/10",
    icon: "bg-rose-500/20 text-rose-300",
    value: "text-rose-300",
  },
};

function MetricCard({ tone, icon: Icon, label, value, suffix }) {
  const t = METRIC_TONES[tone];
  return (
    <div className={`rounded-2xl border p-5 ${t.wrap}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.icon}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mt-3">
        <span className={`text-3xl font-extrabold ${t.value}`}>{value}</span>
        {suffix && <span className="text-xs font-medium text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

const TABLE_TONES = {
  emerald: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", total: "text-emerald-400" },
  rose: { badge: "bg-rose-500/15 text-rose-400 border-rose-500/30", total: "text-rose-400" },
};

function MovementTable({ tone, icon: Icon, title, subtitle, total, totalLabel, transactions, unit }) {
  const t = TABLE_TONES[tone];
  const rows = transactions || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Icon className={`w-4 h-4 ${t.total}`} /> {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-sm font-bold ${t.total}`}>
          {totalLabel}: {total} {unit}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-800/20 text-slate-400 text-xs uppercase">
              <th className="text-left px-5 py-3">Date &amp; Time</th>
              <th className="text-right px-5 py-3">Quantity</th>
              <th className="text-right px-5 py-3">Resulting Balance</th>
              <th className="text-left px-5 py-3">Operator</th>
              <th className="text-left px-5 py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500 text-xs">
                  No {title.toLowerCase()} recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((tx) => (
                <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-300 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${t.badge}`}
                    >
                      {tone === "emerald" ? "+" : "-"}
                      {tx.quantity} {unit}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-slate-400 whitespace-nowrap">
                    {tx.previousQuantity ?? "—"} → <span className="font-bold text-white">{tx.newQuantity}</span>
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
  );
}
