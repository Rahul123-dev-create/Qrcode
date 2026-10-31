import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRScanner from "../components/QRScanner";
import api from "../lib/api";
import { useToast } from "../context/ToastContext";
import { ScanLine, Search, AlertCircle, ArrowRight } from "lucide-react";

// Short Web Audio API beep so the operator gets audible scan feedback.
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
  } catch {
    // audio feedback is best-effort only
  }
}

/**
 * Scan / Inspect view.
 * Resolves a scanned code (camera, uploaded image or manual SKU) to a product
 * and immediately navigates to that product's dedicated screen.
 * An in-flight lock debounces the many frames a live camera emits so a single
 * scan never triggers duplicate lookups / toasts.
 */
export default function ScanPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lockedRef = useRef(false);

  const handleScan = useCallback(
    async (rawCode) => {
      const code = (rawCode || "").trim();
      if (!code) return;
      // Debounce: ignore duplicate frames while a lookup is being resolved.
      if (lockedRef.current) return;

      lockedRef.current = true;
      setError("");
      setLoading(true);

      try {
        const { data } = await api.post("/products/scan", { code });
        const result = data?.data || data;
        playScanBeep(true);
        toast.success(`Found: ${result.product.name}`);
        // Navigate straight to the product screen (scanner unmounts, camera stops).
        navigate(`/products/${result.product._id}`);
      } catch (err) {
        playScanBeep(false);
        const msg = err?.response?.data?.message || "No product found for this code";
        setError(msg);
        toast.error(msg);
        // Unlock so the operator can retry after a failed scan.
        lockedRef.current = false;
      } finally {
        setLoading(false);
      }
    },
    [navigate, toast]
  );

  const handleManualSearch = (e) => {
    e.preventDefault();
    handleScan(scanInput);
  };

  // Stable identity so the scanner never restarts on an unrelated re-render.
  const handleError = useCallback((msg) => setError(msg), []);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
          <ScanLine className="w-7 h-7 text-blue-500" />
          Scan Product
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Scan a product QR code with your camera, upload a QR image, or type a SKU to open its
          dedicated screen.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Camera / upload scanner */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-blue-400" />
            Scan QR Code (Camera or Image Upload)
          </h2>
          <QRScanner onScan={handleScan} onError={handleError} />
          {loading && (
            <div className="flex items-center justify-center gap-2.5 py-4 text-blue-400 text-sm font-medium">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Opening product...
            </div>
          )}
        </div>

        {/* Manual SKU lookup */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-fit">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Barcode Gun / Manual SKU
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Type or paste a SKU / QR payload to jump straight to the product:
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
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Open Product
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
