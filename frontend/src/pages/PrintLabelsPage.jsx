import { useState, useEffect } from "react";
import api from "../lib/api";
import { Printer, CheckSquare, Square, QrCode, Tag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrintLabelsPage() {
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get("/products", { params: { limit: 100, status: "active" } });
        const items = data?.data?.products || data?.data || data || [];
        setProducts(items);
        // By default select all
        setSelectedIds(new Set(items.map((p) => p._id)));
      } catch (err) {
        console.error("Failed to load products for labels:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p._id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedProducts = products.filter((p) => selectedIds.has(p._id));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* On-screen control bar (Hidden during print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/products"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <Printer className="w-7 h-7 text-blue-500" />
              Batch QR Label Printing
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Generate print-ready sticky QR labels for inventory packaging, cartons, and warehouse shelves.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              {selectedIds.size === products.length ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              {selectedIds.size === products.length ? "Deselect All" : "Select All"}
            </button>

            <button
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Printer className="w-4 h-4" />
              Print Selected ({selectedProducts.length})
            </button>
          </div>
        </div>

        {/* Selection Pill Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Select Products to Print:</p>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {products.map((p) => {
              const isSelected = selectedIds.has(p._id);
              return (
                <button
                  key={p._id}
                  onClick={() => toggleSelect(p._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-blue-600/20 border-blue-500 text-blue-300"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-[11px] font-semibold">{p.sku}</span>
                  <span className="truncate max-w-[140px]">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PRINT-READY STICKER GRID */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : selectedProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          No products selected for printing. Please select at least one product above.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
          {selectedProducts.map((p) => (
            <div
              key={p._id}
              className="bg-white text-slate-900 border border-slate-300 rounded-xl p-3.5 flex flex-col items-center justify-between shadow-sm page-break-inside-avoid print:border-black print:p-2"
            >
              <div className="text-center w-full mb-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 print:text-black">
                  StockQR Inventory
                </p>
                <h4 className="font-extrabold text-xs text-slate-900 truncate w-full" title={p.name}>
                  {p.name}
                </h4>
              </div>

              {/* QR Image */}
              <div className="my-1.5 bg-white p-1 rounded-lg">
                <img
                  src={p.qrCode}
                  alt={`QR ${p.sku}`}
                  className="w-28 h-28 object-contain mx-auto"
                />
              </div>

              {/* SKU & Category footer */}
              <div className="w-full text-center border-t border-slate-200 pt-1 mt-0.5 print:border-black">
                <p className="font-mono font-bold text-xs text-slate-900 tracking-wider">
                  {p.sku}
                </p>
                <p className="text-[9px] text-slate-600 print:text-black">
                  {p.category} · {p.unit || "units"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
