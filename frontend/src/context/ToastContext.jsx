import { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, duration = 3000) => {
    return addToast(message, "success", duration);
  }, [addToast]);

  const error = useCallback((message, duration = 4000) => {
    return addToast(message, "error", duration);
  }, [addToast]);

  const warning = useCallback((message, duration = 3000) => {
    return addToast(message, "warning", duration);
  }, [addToast]);

  const info = useCallback((message, duration = 3000) => {
    return addToast(message, "info", duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const typeConfig = {
    success: {
      icon: CheckCircle,
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      iconColor: "text-emerald-400",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-red-500/15",
      border: "border-red-500/30",
      text: "text-red-400",
      iconColor: "text-red-400",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-500/15",
      border: "border-amber-500/30",
      text: "text-amber-400",
      iconColor: "text-amber-400",
    },
    info: {
      icon: Info,
      bg: "bg-blue-500/15",
      border: "border-blue-500/30",
      text: "text-blue-400",
      iconColor: "text-blue-400",
    },
  };

  const config = typeConfig[toast.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 ${config.bg} ${config.border} ${config.text} border rounded-lg px-4 py-3 pointer-events-auto animate-in slide-in-from-bottom-3 duration-300`}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 ${config.iconColor}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-current hover:opacity-75 transition shrink-0"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
