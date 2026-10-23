import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { StockBadge } from "../components/StockBadge";
import { useToast } from "../context/ToastContext";
import {
  Package,
  Plus,
  Search,
  QrCode,
  Trash2,
  X,
  AlertCircle,
  ScanLine,
  Printer,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  Tag,
  Filter,
} from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusTab, setStatusTab] = useState("active"); // "active" | "deleted" | "all"
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "in_stock" | "low_stock" | "out_of_stock"

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrProduct, setQrProduct] = useState(null);
  const [movementModal, setMovementModal] = useState({
    isOpen: false,
    product: null,
    type: "inward",
    quantity: "1",
    notes: "",
  });

  const toast = useToast();
  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        limit: 100,
        search,
        status: statusTab,
      };
      if (selectedCategory) params.category = selectedCategory;

      const { data } = await api.get("/products", { params });
      const items = data?.data?.products || data?.data || data || [];
      setProducts(items);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, statusTab, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/products/categories");
      setCategories(data?.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Archive / Delete product "${name}"? Physical QR codes can still be scanned to view its history.`)) {
      return;
    }
    try {
      await api.delete(`/products/${id}`);
      toast.success(`Product "${name}" archived`);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete product");
    }
  };

  const handleRestore = async (id, name) => {
    try {
      await api.post(`/products/${id}/restore`);
      toast.success(`Product "${name}" restored`);
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to restore product");
    }
  };

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    if (!movementModal.product) return;

    const qty = Number(movementModal.quantity);
    if (!qty || qty < 1) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      await api.post("/transactions", {
        productId: movementModal.product._id,
        type: movementModal.type,
        quantity: qty,
        notes: movementModal.notes,
      });

      toast.success(
        `Recorded ${movementModal.type === "inward" ? "receipt" : "dispatch"} of ${qty} ${
          movementModal.product.unit || "units"
        }`
      );

      setMovementModal({ isOpen: false, product: null, type: "inward", quantity: "1", notes: "" });
      fetchProducts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Movement failed");
    }
  };

  // Local stock status filter
  const filteredProducts = products.filter((p) => {
    if (stockFilter === "out_of_stock") return p.quantity === 0;
    if (stockFilter === "low_stock") return p.quantity > 0 && p.quantity <= p.lowStockThreshold;
    if (stockFilter === "in_stock") return p.quantity > p.lowStockThreshold;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-blue-500" />
            Product Inventory
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage stock items, auto-generate unique QR codes, and monitor warehouse levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/print-labels"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-3.5 py-2.5 rounded-xl transition"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            Batch Print Labels
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Active vs Deleted Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl w-fit">
            <button
              onClick={() => setStatusTab("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === "active" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Active Stock
            </button>
            <button
              onClick={() => setStatusTab("deleted")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === "deleted" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              Archived / Trash
            </button>
            <button
              onClick={() => setStatusTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusTab === "all" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              All Records
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, product name, or category..."
              className="w-full bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-base mb-1">No products found</h3>
          <p className="text-slate-500 text-xs mb-5">
            {statusTab === "deleted" ? "No archived products in trash." : "Add a new product to generate a unique QR code."}
          </p>
          {statusTab === "active" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-xs font-semibold transition"
            >
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 text-xs uppercase">
                  <th className="text-left px-5 py-3.5">SKU & QR</th>
                  <th className="text-left px-5 py-3.5">Product Name</th>
                  <th className="text-left px-5 py-3.5">Category</th>
                  <th className="text-right px-5 py-3.5">Unit Price</th>
                  <th className="text-right px-5 py-3.5">Stock Balance</th>
                  <th className="text-right px-5 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredProducts.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQrProduct(p)}
                          className="w-10 h-10 bg-white p-0.5 rounded-lg shadow hover:opacity-90 shrink-0"
                          title="Click to view QR label"
                        >
                          <img src={p.qrCode} alt={p.sku} className="w-full h-full object-contain" />
                        </button>
                        <span className="font-mono text-xs font-semibold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {p.sku}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-white">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-500 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      <span className="bg-slate-800/60 px-2 py-1 rounded-md border border-slate-800">
                        {p.category || "General"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right font-medium text-slate-300">
                      ₹{Number(p.price || 0).toFixed(2)}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <span className="font-extrabold text-base text-white">{p.quantity}</span>{" "}
                      <span className="text-xs text-slate-400">{p.unit || "units"}</span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <StockBadge
                        quantity={p.quantity}
                        threshold={p.lowStockThreshold}
                        status={p.status}
                      />
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Scan & Inspect button */}
                        <button
                          onClick={() => navigate(`/scan?sku=${p.sku}`)}
                          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 py-1.5 transition"
                          title="Scan / Inspect Product History"
                        >
                          <ScanLine className="w-3.5 h-3.5 text-blue-400" />
                          Inspect
                        </button>

                        {/* Quick Stock Movement */}
                        {p.status !== "deleted" && (
                          <button
                            onClick={() =>
                              setMovementModal({
                                isOpen: true,
                                product: p,
                                type: "inward",
                                quantity: "1",
                                notes: "",
                              })
                            }
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-1.5 transition"
                            title="Quick Stock In / Out"
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* QR Preview */}
                        <button
                          onClick={() => setQrProduct(p)}
                          className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-1.5 transition"
                          title="View QR Label"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete or Restore */}
                        {p.status === "deleted" ? (
                          <button
                            onClick={() => handleRestore(p._id, p.name)}
                            className="text-xs text-rose-400 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-800 rounded-lg px-2 py-1.5 transition flex items-center gap-1"
                            title="Restore Product"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(p._id, p.name)}
                            className="text-xs text-slate-500 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-1.5 transition"
                            title="Archive / Delete"
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

      {/* MODAL: ADD PRODUCT */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            fetchProducts();
            fetchCategories();
          }}
        />
      )}

      {/* MODAL: ENLARGED QR CODE */}
      {qrProduct && <QRModal product={qrProduct} onClose={() => setQrProduct(null)} />}

      {/* MODAL: QUICK MOVEMENT */}
      {movementModal.isOpen && movementModal.product && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setMovementModal({ ...movementModal, isOpen: false })}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {movementModal.type === "inward" ? (
                  <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5 text-rose-400" />
                )}
                Stock Movement
              </h3>
              <button
                onClick={() => setMovementModal({ ...movementModal, isOpen: false })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Product: <strong className="text-white">{movementModal.product.name}</strong>
              <br />
              Current Stock: <span className="text-blue-400 font-bold">{movementModal.product.quantity} {movementModal.product.unit || "units"}</span>
            </p>

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div className="flex bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMovementModal((p) => ({ ...p, type: "inward" }))}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    movementModal.type === "inward" ? "bg-emerald-600 text-white" : "text-slate-400"
                  }`}
                >
                  + Inward (Add)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementModal((p) => ({ ...p, type: "outward" }))}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                    movementModal.type === "outward" ? "bg-rose-600 text-white" : "text-slate-400"
                  }`}
                >
                  - Outward (Remove)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity ({movementModal.product.unit || "units"})
                </label>
                <input
                  type="number"
                  min="1"
                  max={movementModal.type === "outward" ? movementModal.product.quantity : undefined}
                  value={movementModal.quantity}
                  onChange={(e) =>
                    setMovementModal((p) => ({ ...p, quantity: e.target.value }))
                  }
                  required
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={movementModal.notes}
                  onChange={(e) =>
                    setMovementModal((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="e.g. Counter sale, shipment #12"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovementModal({ ...movementModal, isOpen: false })}
                  className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 text-white py-2 rounded-xl text-xs font-semibold ${
                    movementModal.type === "inward" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold transition"
          >
            Download PNG
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

      toast.success(`Product "${form.name}" created with unique QR code!`);
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
            Add New Product
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
                SKU / Barcode <span className="text-red-400">*</span>
              </label>
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. BISCUIT-003"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Product Name <span className="text-red-400">*</span>
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
              Description (Optional)
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit of Measure</label>
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
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Initial inward batch will be recorded</p>
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
              <p className="text-[10px] text-slate-500 mt-0.5">Alert triggered below this quantity</p>
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
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Create Product & Generate QR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
