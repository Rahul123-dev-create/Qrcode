import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Upload, AlertCircle, RefreshCw, SwitchCamera } from "lucide-react";

export default function QRScanner({ onScan, onError }) {
  const elementId = "qr-reader-container";
  const scannerRef = useRef(null);
  const isStartingRef = useRef(false);
  const fileInputRef = useRef(null);

  const [scanMode, setScanMode] = useState("camera"); // "camera" | "upload"
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (scanMode !== "camera") {
      return;
    }

    const startScanner = async () => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setCameraError(null);

      const container = document.getElementById(elementId);
      if (!container) return;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error("No camera detected on this device. Use 'Upload QR Image' or manual search.");
        }

        if (!isMounted) return;
        setCameras(devices);

        const scanner = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = scanner;

        const targetCamera = devices[currentCameraIndex % devices.length] || devices[0];

        await scanner.start(
          targetCamera.id,
          {
            fps: 12,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) onScan(decodedText);
          },
          () => {} // silent scan frame failure
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to access camera";
        if (isMounted) {
          setCameraError(msg);
          onError?.(msg);
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      const cleanup = async () => {
        const scanner = scannerRef.current;
        if (!scanner) return;
        try {
          const state = scanner.getState();
          if (state === 2 || state === 3) await scanner.stop();
        } catch {}
        try {
          scanner.clear();
        } catch {}
        scannerRef.current = null;
      };
      cleanup();
    };
  }, [scanMode, currentCameraIndex, onScan, onError]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-file-dummy");
      const decodedText = await html5QrCode.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      alert("Could not decode a valid QR code from this image. Please ensure the QR is clear and well-lit.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setCurrentCameraIndex((prev) => (prev + 1) % cameras.length);
  };

  return (
    <div className="space-y-3">
      {/* Mode Selector Tabs */}
      <div className="flex bg-slate-800 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setScanMode("camera")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
            scanMode === "camera"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Live Camera
        </button>
        <button
          type="button"
          onClick={() => setScanMode("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
            scanMode === "upload"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Upload QR Image
        </button>
      </div>

      {/* Hidden container for file scanning */}
      <div id="qr-file-dummy" className="hidden" />

      {scanMode === "camera" && (
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 min-h-[280px] flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">Camera Unavailable</p>
              <p className="text-xs text-slate-500 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => setScanMode("upload")}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload QR Image Instead
              </button>
            </div>
          ) : (
            <>
              <div id={elementId} className="w-full" />
              {/* Aiming Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-52 h-52 border-2 border-blue-400/40 rounded-xl">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-blue-400/30 animate-pulse" />
                </div>
              </div>

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-sm transition"
                  title="Switch camera"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {scanMode === "upload" && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-900/50 hover:bg-slate-900"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-12 h-12 bg-blue-600/10 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Upload QR Code Image</h4>
          <p className="text-xs text-slate-500 mb-3">
            Click to upload a screenshot, photo, or saved QR image
          </p>
          <span className="inline-block bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700">
            {isProcessingFile ? "Decoding QR Code..." : "Browse Files"}
          </span>
        </div>
      )}
    </div>
  );
}
