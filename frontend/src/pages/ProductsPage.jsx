import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { StockBadge } from "../components/StockBadge";
import { useToast } from "../context/ToastContext";
import {
  Package,
  Plus,
  Search,
  Trash2,
  X,
  AlertCircle,
  Printer,
  Download,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

/**
 * Inventory List — primary view #1.
 * Lists every product with its QR code and live balance and opens the
 * dedicated product screen on click.
 */
export default function ProductsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("active"); // "active" | "deleted" | "all"
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrProduct, setQrProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/products", {
        params: { limit: 100, search, status: statusTab },
      });
      const items = data?.data?.products || data?.data || data || [];
      setProducts(items);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, statusTab]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (e, product) => {
    e.stopPropagation();
    if (!confirm(`Archive / delete "${product.name}"? Printed QR codes will still resolve to its history.`)) {
      return;
    }
    try {
      await api.delete(`/products/${product._id}`);
      toast.success(`Product "${product.name}" archived`);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete product");
    }
  };

  const handleRestore = async (e, product) => {
    e.stopPropagation();
    try {
      await api.post(`/products/${product._id}/restore`);
      toast.success(`Product "${product.name}" restored`);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to restore product");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-500" />
            Inventory
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Every product has a unique QR code. Click a product to open its balance and movement
            history.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex bg-slate-800/80 p-1 rounded-xl w-fit">
          {[
            { key: "active", label: "Active" },
            { key: "deleted", label: "Archived" },
            { key: "all", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === tab.key ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, name, or category..."
            className="w-full bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base mb-1">No products found</h3>
          <p className="text-slate-500 text-xs mb-5">
            {statusTab === "deleted"
              ? "No archived products yet."
              : "Add a product to generate its unique QR code."}
          </p>
          {statusTab !== "deleted" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-semibold transition"
            >
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 text-xs uppercase">
                  <th className="text-left px-5 py-3.5">QR</th>
                  <th className="text-left px-5 py-3.5">Product</th>
                  <th className="text-left px-5 py-3.5">Category</th>
                  <th className="text-right px-5 py-3.5">Balance</th>
                  <th className="text-right px-5 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => navigate(`/products/${p._id}`)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrProduct(p);
                        }}
                        className="w-10 h-10 bg-white p-0.5 rounded-lg shadow hover:opacity-90 shrink-0"
                        title="View QR label"
                      >
                        <img src={p.qrCode} alt={p.sku} className="w-full h-full object-contain" />
                      </button>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {p.sku}
                      </span>
                      <p className="font-semibold text-white mt-1">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      <span className="bg-slate-800/60 px-2 py-1 rounded-md border border-slate-800">
                        {p.category || "General"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="font-extrabold text-base text-white">{p.quantity}</span>{" "}
                      <span className="text-xs text-slate-400">{p.unit || "units"}</span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <StockBadge quantity={p.quantity} threshold={p.lowStockThreshold} status={p.status} />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5"
                          title="Open product screen"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                          View
                        </span>
                        {p.status === "deleted" ? (
                          <button
                            onClick={(e) => handleRestore(e, p)}
                            className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded-lg px-2.5 py-1.5 transition"
                            title="Restore product"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleDelete(e, p)}
                            className="text-xs text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-1.5 transition"
                            title="Archive / delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setStatusTab("active");
            fetchProducts();
          }}
        />
      )}

      {qrProduct && <QRModal product={qrProduct} onClose={() => setQrProduct(null)} />}
    </div>
  );
}

function QRModal({ product, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm">Product QR Code</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-white p-4 rounded-xl inline-block mb-3">
          <img src={product.qrCode} alt={product.sku} className="w-48 h-48 mx-auto" />
          <p className="font-mono font-bold text-xs text-slate-900 mt-2">{product.sku}</p>
          <p className="text-[11px] text-slate-600 truncate max-w-[180px] mx-auto">{product.name}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={product.qrCode}
            download={`${product.sku}-qr.png`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function AddProductModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "Groceries",
    unit: "packs",
    price: "0",
    quantity: "10",
    lowStockThreshold: "5",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/products", {
        sku: form.sku.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        price: Number(form.price) || 0,
        quantity: Number(form.quantity) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 10,
      });

      toast.success(`Product "${form.name}" created with a unique QR code!`);
      onAdded();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            Add Product
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SKU / Code <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. BISCUIT-003"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Marie Gold Biscuits"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. 200g tea-time crispy biscuits"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Groceries"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. packs, kg, boxes"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Initial Quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Recorded as an initial inward entry</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Alert triggers at or below this level</p>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Create &amp; Generate QR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
