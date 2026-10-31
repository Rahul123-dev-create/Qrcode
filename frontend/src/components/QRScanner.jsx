import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Camera, Upload, AlertCircle, SwitchCamera } from "lucide-react";

const ELEMENT_ID = "qr-reader-container";
const FILE_ELEMENT_ID = "qr-file-dummy";
// A live camera re-reads the same code many times per second; ignore repeat
// reads of an identical code within this window so one scan = one lookup.
const SCAN_DEBOUNCE_MS = 2500;

const isLive = (state) =>
  state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED;

// Stop (if running) then clear the injected DOM so the element is reusable.
async function disposeScanner(scanner) {
  if (!scanner) return;
  try {
    if (isLive(scanner.getState())) await scanner.stop();
  } catch {}
  try {
    scanner.clear();
  } catch {}
}

export default function QRScanner({ onScan, onError }) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const lastScanRef = useRef({ code: "", at: 0 });
  const cameraIdsRef = useRef([]);
  const generationRef = useRef(0);
  // Serialises teardown so a previous camera is fully released (and its DOM
  // cleared) before the next instance attaches to the same element.
  const teardownRef = useRef(Promise.resolve());
  const fileInputRef = useRef(null);

  const [scanMode, setScanMode] = useState("camera"); // "camera" | "upload"
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Hold the latest callbacks in refs: a new/toast-driven identity must never
  // be an effect dependency, otherwise the camera restarts on every render.
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (scanMode !== "camera") return undefined;

    const generation = ++generationRef.current;
    let cancelled = false;
    setCameraError(null);

    const start = async () => {
      // Let the previous instance finish releasing the element first.
      await teardownRef.current;
      if (cancelled || generationRef.current !== generation) return;
      if (!document.getElementById(ELEMENT_ID)) return;

      const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });

      const handleDecoded = (decodedText) => {
        if (cancelled || generationRef.current !== generation) return;
        const code = (decodedText || "").trim();
        if (!code) return;
        const now = Date.now();
        const last = lastScanRef.current;
        if (code === last.code && now - last.at < SCAN_DEBOUNCE_MS) return;
        lastScanRef.current = { code, at: now };
        onScanRef.current?.(decodedText);
      };

      // Prefer an explicitly chosen device; otherwise ask for the rear camera
      // directly. Requesting facingMode triggers the permission prompt itself,
      // which is far more reliable than starting from a pre-enumerated id.
      const preferredId = cameraIdsRef.current[cameraIndex];
      const cameraSource = preferredId
        ? { deviceId: { exact: preferredId } }
        : { facingMode: "environment" };

      try {
        await scanner.start(
          cameraSource,
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          handleDecoded,
          () => {} // per-frame decode miss: expected while aiming
        );
      } catch (err) {
        await disposeScanner(scanner);
        if (cancelled || generationRef.current !== generation) return;
        const msg =
          err instanceof Error && err.message
            ? err.message
            : "Unable to access the camera. Check browser permissions, or use image upload.";
        setCameraError(msg);
        onErrorRef.current?.(msg);
        return;
      }

      // Torn down while starting: release the camera we just opened.
      if (cancelled || generationRef.current !== generation) {
        await disposeScanner(scanner);
        return;
      }

      scannerRef.current = scanner;

      // Enumerate devices only after permission is granted, purely to power the
      // camera-flip button. Failure here must not affect the running stream.
      if (cameraIdsRef.current.length <= 1) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (!cancelled && generationRef.current === generation && devices?.length) {
            cameraIdsRef.current = devices;
            setCameras(devices);
          }
        } catch {}
      }
    };

    start();

    return () => {
      cancelled = true;
      // Invalidate any in-flight start for this generation.
      generationRef.current++;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      teardownRef.current = teardownRef.current
        .catch(() => {})
        .then(() => disposeScanner(scanner));
    };
  }, [scanMode, cameraIndex]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    let decoder = null;
    try {
      decoder = new Html5Qrcode(FILE_ELEMENT_ID);
      // showImage=false so the decoder never injects an <img> into the DOM.
      const decodedText = await decoder.scanFile(file, false);
      onScanRef.current?.(decodedText);
    } catch {
      onErrorRef.current?.(
        "Could not decode a valid QR code from this image. Ensure the QR is clear and well lit."
      );
    } finally {
      if (decoder) {
        try {
          decoder.clear();
        } catch {}
      }
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const switchCamera = () => {
    if (cameraIdsRef.current.length <= 1) return;
    setCameraIndex((prev) => (prev + 1) % cameraIdsRef.current.length);
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

      {/* Hidden container used by the image-upload decoder */}
      <div id={FILE_ELEMENT_ID} className="hidden" />

      {scanMode === "camera" && (
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950 min-h-[280px] flex items-center justify-center">
          {/* Kept mounted at all times so React never removes the DOM that
              html5-qrcode injects into it. */}
          <div id={ELEMENT_ID} className="w-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {!cameraError && (
            <>
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

          {cameraError && (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center p-6 text-center">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-300">Camera Unavailable</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setScanMode("upload")}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload QR Image Instead
                </button>
              </div>
            </div>
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
