import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import {
  FileSpreadsheet,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Layers,
  RefreshCw,
} from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState(""); // "" | "inward" | "outward"
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const toast = useToast();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        limit: 100,
        ...(typeFilter && { type: typeFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      };

      const { data } = await api.get("/transactions", { params });
      const items = data?.data?.transactions || data?.data || data || [];
      setTransactions(items);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (typeFilter) params.append("type", typeFilter);
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);

    window.open(`/api/dashboard/export-transactions?${params.toString()}`, "_blank");
    toast.success("Downloading transactions CSV report...");
  };

  // Filter transactions by product search
  const filtered = transactions.filter((t) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    const sku = t.product?.sku?.toLowerCase() || "";
    const name = t.product?.name?.toLowerCase() || "";
    const operator = t.user?.username?.toLowerCase() || "";
    const notes = t.notes?.toLowerCase() || "";
    return sku.includes(query) || name.includes(query) || operator.includes(query) || notes.includes(query);
  });

  // Calculate stats
  let totalInwardUnits = 0;
  let totalOutwardUnits = 0;
  for (const t of filtered) {
    if (t.type === "inward") totalInwardUnits += t.quantity || 0;
    if (t.type === "outward") totalOutwardUnits += t.quantity || 0;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-blue-500" />
            Stock Movements & Audit Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Complete transaction ledger of inward stock receipts and outward dispatches.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow"
        >
          <Download className="w-4 h-4 text-blue-400" />
          Export to CSV
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400">Total Movements</p>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{filtered.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Recorded events matching filters</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-emerald-400">Total Inward Received</p>
            <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">+{totalInwardUnits} units</p>
          <p className="text-[11px] text-slate-500 mt-1">Stock added into warehouse</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-rose-400">Total Outward Dispatched</p>
            <ArrowUpCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">-{totalOutwardUnits} units</p>
          <p className="text-[11px] text-slate-500 mt-1">Stock removed or sold</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Type Filter Tabs */}
          <div className="flex bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTypeFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === "" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter("inward")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === "inward" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Inward (+ In)
            </button>
            <button
              onClick={() => setTypeFilter("outward")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === "outward" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Outward (- Out)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, product, operator, notes..."
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-[10px] text-slate-500">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <span className="text-[10px] text-slate-500">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base mb-1">No transactions found</h3>
          <p className="text-slate-500 text-xs">
            Try adjusting your search criteria or date filters.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 text-xs uppercase">
                  <th className="text-left px-5 py-3.5">Type</th>
                  <th className="text-left px-5 py-3.5">Product</th>
                  <th className="text-right px-5 py-3.5">Qty Moved</th>
                  <th className="text-right px-5 py-3.5">Balance Change</th>
                  <th className="text-left px-5 py-3.5">Date & Time</th>
                  <th className="text-left px-5 py-3.5">Handled By</th>
                  <th className="text-left px-5 py-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
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

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {tx.product?.sku || "—"}
                        </span>
                        <span className="font-medium text-white">
                          {tx.product?.name || "Deleted Product"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right font-bold text-white">
                      {tx.type === "inward" ? "+" : "-"}
                      {tx.quantity} {tx.product?.unit || "units"}
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-400">
                      {tx.previousQuantity ?? "—"} →{" "}
                      <span className="font-bold text-white">{tx.newQuantity}</span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {tx.user?.name || tx.user?.username || "Staff"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-400 max-w-xs truncate">
                      {tx.notes || <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
