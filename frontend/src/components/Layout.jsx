import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  FileSpreadsheet,
  Printer,
  Users,
  LogOut,
  Menu,
  X,
  Boxes,
  SunMedium,
  Moon,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("stockqr-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const activeTheme = storedTheme || (prefersDark ? "dark" : "light");
    setDarkMode(activeTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("stockqr-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleTheme = () => setDarkMode((val) => !val);

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/products", label: "Products Catalog", icon: Package },
    { to: "/scan", label: "QR Scanner", icon: ScanLine, highlight: true },
    { to: "/transactions", label: "Stock Ledger", icon: FileSpreadsheet },
    { to: "/print-labels", label: "Print Labels", icon: Printer },
    ...(isAdmin ? [{ to: "/users", label: "User Access", icon: Users }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 fixed inset-y-0 left-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">StockQR</p>
            <p className="text-[11px] text-slate-500 font-medium">Inventory & Scanner</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, highlight }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : highlight
                    ? "text-blue-400 hover:text-white hover:bg-slate-800/80"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : highlight ? "text-blue-400" : "text-slate-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Controls */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-800">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                user?.role === "admin" ? "bg-purple-600" : "bg-blue-600"
              }`}
            >
              {user?.role === "admin" ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name || user?.username}</p>
              <p className="text-[10px] uppercase font-semibold text-slate-400">{user?.role || "operator"}</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {darkMode ? <SunMedium className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            {darkMode ? "Light mode" : "Dark mode"}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Boxes className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">StockQR</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="text-slate-400 hover:text-white p-1.5">
            {darkMode ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-slate-400 hover:text-white p-1.5">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute top-14 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 space-y-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  location.pathname === to ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen bg-slate-950">
        {children}
      </main>
    </div>
  );
}
