import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Boxes, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(username, password);
        toast.success("Welcome back!");
      } else {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        await register(username, password);
        toast.success("Account created successfully!");
      }
      navigate("/");
    } catch (err) {
      const errorMessage = err?.response?.data?.message || "Something went wrong";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
            <Boxes className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">StockQR</h1>
          <p className="text-slate-400 text-sm mt-2">Inventory Management System</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">
            {mode === "login" ? "Sign in to your account" : "Create an account"}
          </h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoFocus
                autoComplete="username"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === "login" ? (
              <>
                No account?{" "}
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Demo credentials: Use any username and password (min 6 chars)
        </p>
      </div>
    </div>
  );
}
