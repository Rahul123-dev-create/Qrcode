import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Users, UserPlus, Shield, User, Trash2, X, AlertCircle } from "lucide-react";

export default function UsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/users");
      setUsers(data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleDeleteUser = async (targetId, targetUsername) => {
    if (targetId === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }
    if (!confirm(`Delete user account "${targetUsername}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/auth/users/${targetId}`);
      toast.success(`User "${targetUsername}" removed`);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete user");
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-400">Only system administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-500" />
            User Management & Access Control
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manage system administrators and warehouse floor operators.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Users List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/40">
          <h3 className="text-sm font-semibold text-white">System Accounts ({users.length})</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <div key={u.id} className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                        u.role === "admin"
                          ? "bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-600/20"
                          : "bg-gradient-to-br from-blue-600 to-cyan-700 shadow-blue-600/20"
                      }`}
                    >
                      {u.role === "admin" ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{u.name || u.username}</p>
                        {isSelf && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                            You
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            u.role === "admin"
                              ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">@{u.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Created: {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                    {!isSelf && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="text-xs text-slate-500 hover:text-rose-400 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD USER */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "operator",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/users", form);
      toast.success(`Account for @${form.username} created successfully!`);
      onAdded();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create user");
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
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            Add System Account
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
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
              placeholder="e.g. jdoe"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password <span className="text-red-400">*</span> (min 6 chars)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Set initial password"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              User Role <span className="text-red-400">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="operator">Operator (Scan QR, Inward/Outward movements, View Stock)</option>
              <option value="admin">Administrator (Full Access: Products, Users, Financial Valuation, Deletion)</option>
            </select>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
