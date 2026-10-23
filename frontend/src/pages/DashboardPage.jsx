import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { StockBadge } from "../components/StockBadge";
import {
  Package,
  AlertTriangle,
  XCircle,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  ScanLine,
  Printer,
  FileSpreadsheet,
  IndianRupee,
  ShieldCheck,
  Server,
  Clock,
} from "lucide-react";

function StatCard({ label, value, subtext, icon: Icon, color, linkTo }) {
  const content = (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-extrabold text-white">{value}</p>
      {subtext && <p className="text-[11px] text-slate-500 mt-1">{subtext}</p>}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/dashboard");
      if (d.success) {
        setData(d.data);
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.message || "Failed to load dashboard data";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const overview = data?.overview || {};
  const transactions = data?.transactions || {};
  const recentTransactions = data?.recentTransactions || [];
  const lowStockItems = data?.inventory?.lowStockProducts || [];
  const outOfStockItems = data?.inventory?.outOfStockProducts || [];
  const databaseStatus = data?.database || {};

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-blue-500" />
            Warehouse Overview & Stock Status
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time QR-tracked inventory metrics, inward/outward flow, and valuation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            {databaseStatus.type || "Local Storage"}
          </span>

          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3.5 py-2.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/scan"
          className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 p-4 rounded-2xl text-white font-semibold text-sm transition shadow-lg shadow-blue-600/20"
        >
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Scan QR Code</p>
            <p className="text-[11px] text-blue-100/80 font-normal">Check stock & history</p>
          </div>
        </Link>

        <Link
          to="/products"
          className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-white font-semibold text-sm transition hover:bg-slate-800/60"
        >
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Products Catalog</p>
            <p className="text-[11px] text-slate-400 font-normal">Manage inventory</p>
          </div>
        </Link>

        <Link
          to="/transactions"
          className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-white font-semibold text-sm transition hover:bg-slate-800/60"
        >
          <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Stock Ledger</p>
            <p className="text-[11px] text-slate-400 font-normal">Audit movements</p>
          </div>
        </Link>

        <Link
          to="/print-labels"
          className="flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl text-white font-semibold text-sm transition hover:bg-slate-800/60"
        >
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Print Labels</p>
            <p className="text-[11px] text-slate-400 font-normal">Batch QR stickers</p>
          </div>
        </Link>
      </div>

      {/* METRIC STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={overview.totalProducts ?? 0}
          subtext="Unique registered SKUs"
          icon={Package}
          color="bg-blue-600/20 text-blue-400"
          linkTo="/products"
        />
        <StatCard
          label="Total Stock Units"
          value={overview.totalStock ?? 0}
          subtext="Across all categories"
          icon={Layers}
          color="bg-violet-600/20 text-violet-400"
          linkTo="/products"
        />
        <StatCard
          label="Total Valuation"
          value={`₹${(overview.totalValuation ?? 0).toLocaleString()}`}
          subtext="Total asset market value"
          icon={IndianRupee}
          color="bg-emerald-600/20 text-emerald-400"
        />
        <StatCard
          label="Low / Out of Stock"
          value={(overview.lowStockCount ?? 0) + (overview.outOfStockCount ?? 0)}
          subtext={`${overview.outOfStockCount ?? 0} items at 0 units`}
          icon={AlertTriangle}
          color="bg-amber-600/20 text-amber-400"
          linkTo="/products"
        />
      </div>

      {/* FLOW BANNER: INWARD VS OUTWARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Overall Warehouse Flow & Balance
          </h3>
          <p className="text-xs text-slate-400">
            Cumulative stock movements recorded through QR scanning
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <ArrowDownCircle className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Inward</p>
              <p className="text-lg font-extrabold text-emerald-400">
                +{transactions.totalInwardQuantity ?? 0} units
              </p>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <ArrowUpCircle className="w-6 h-6 text-rose-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Outward</p>
              <p className="text-lg font-extrabold text-rose-400">
                -{transactions.totalOutwardQuantity ?? 0} units
              </p>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <Layers className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Net Balance</p>
              <p className="text-lg font-extrabold text-white">
                {overview.totalStock ?? 0} units
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: LOW STOCK ALERTS & RECENT ACTIVITY */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts & Fast Inward Action */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Low Stock & Reorder Alert Center ({lowStockItems.length + outOfStockItems.length})
            </h2>
            <Link to="/products" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View All Products →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/50 max-h-96 overflow-y-auto">
            {outOfStockItems.length === 0 && lowStockItems.length === 0 ? (
              <p className="p-8 text-center text-slate-500 text-xs">
                ✅ All stock levels are currently above reorder thresholds!
              </p>
            ) : (
              <>
                {outOfStockItems.map((p) => (
                  <div key={p._id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center font-bold text-xs">
                        0
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                        </div>
                        <p className="text-[11px] text-rose-400">Out of Stock · Threshold: {p.lowStockThreshold}</p>
                      </div>
                    </div>
                    <Link
                      to={`/scan?sku=${p.sku}`}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      Restock via QR
                    </Link>
                  </div>
                ))}

                {lowStockItems.map((p) => (
                  <div key={p._id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {p.quantity}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                        </div>
                        <p className="text-[11px] text-amber-400">
                          Low Stock: {p.quantity} units remaining (Threshold: {p.lowStockThreshold})
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/scan?sku=${p.sku}`}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      Inspect
                    </Link>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Recent Warehouse Activity
            </h2>
            <Link to="/transactions" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              Ledger →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/50 max-h-96 overflow-y-auto">
            {!recentTransactions.length ? (
              <p className="p-8 text-center text-slate-500 text-xs">No transactions recorded yet.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx._id} className="p-3.5 flex items-start gap-3 hover:bg-slate-800/30 transition">
                  <div
                    className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "inward"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-rose-500/15 text-rose-400"
                    }`}
                  >
                    {tx.type === "inward" ? (
                      <ArrowDownCircle className="w-4 h-4" />
                    ) : (
                      <ArrowUpCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {tx.product?.name || "Deleted Product"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      <strong className={tx.type === "inward" ? "text-emerald-400" : "text-rose-400"}>
                        {tx.type === "inward" ? "+" : "-"}
                        {tx.quantity} {tx.product?.unit || "units"}
                      </strong>{" "}
                      by {tx.user?.username || "Staff"}
                    </p>
                    {tx.notes && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{tx.notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
