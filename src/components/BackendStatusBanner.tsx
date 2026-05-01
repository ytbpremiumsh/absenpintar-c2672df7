import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "checking" | "online" | "degraded" | "offline";

interface Props {
  /** Force show banner (e.g. after a login failure detected as network error) */
  forceShow?: boolean;
  /** Reset trigger from parent to re-check */
  recheckKey?: number;
  className?: string;
}

const HEALTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;

export default function BackendStatusBanner({ forceShow, recheckKey, className = "" }: Props) {
  const [status, setStatus] = useState<Status>("checking");
  const [retrying, setRetrying] = useState(false);

  const check = useCallback(async () => {
    setStatus("checking");
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(HEALTH_URL, {
        method: "GET",
        signal: ctrl.signal,
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" },
      });
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      if (res.ok) {
        setStatus(elapsed > 4000 ? "degraded" : "online");
      } else if (res.status === 522 || res.status === 524 || res.status >= 500) {
        setStatus("offline");
      } else {
        setStatus("degraded");
      }
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    check();
  }, [check, recheckKey]);

  // Auto re-check every 20s if not online
  useEffect(() => {
    if (status === "online") return;
    const id = setInterval(check, 20000);
    return () => clearInterval(id);
  }, [status, check]);

  const handleRetry = async () => {
    setRetrying(true);
    await check();
    setRetrying(false);
  };

  const visible = forceShow || status === "offline" || status === "degraded" || status === "checking";
  if (!visible) return null;

  const config = {
    checking: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      title: "Memeriksa koneksi backend…",
      desc: "Mohon tunggu sebentar.",
      cls: "bg-sky-50 border-sky-200 text-sky-900",
    },
    online: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "Backend terhubung",
      desc: "Server merespons normal.",
      cls: "bg-emerald-50 border-emerald-200 text-emerald-900",
    },
    degraded: {
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "Koneksi lambat",
      desc: "Server merespons tapi lebih lambat dari biasanya. Login mungkin perlu beberapa detik.",
      cls: "bg-amber-50 border-amber-200 text-amber-900",
    },
    offline: {
      icon: <AlertTriangle className="h-4 w-4" />,
      title: "Server sedang gangguan (timeout)",
      desc: "Backend tidak merespons (kemungkinan HTTP 522 / sedang restart). Pesan \"Failed to fetch\" muncul karena ini, bukan karena password salah. Silakan coba lagi dalam 1–2 menit.",
      cls: "bg-red-50 border-red-200 text-red-900",
    },
  }[status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${config.cls} ${className}`}
      >
        <div className="mt-0.5 shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-tight">{config.title}</div>
          <div className="text-xs opacity-90 mt-0.5">{config.desc}</div>
        </div>
        {status !== "checking" && status !== "online" && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white/70 hover:bg-white px-2.5 py-1 text-xs font-medium border border-current/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
            Coba lagi
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/** Detect whether an error message indicates a backend connectivity problem rather than a credentials problem. */
export function isBackendNetworkError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("522") ||
    m.includes("524") ||
    m.includes("503") ||
    m.includes("load failed") ||
    m.includes("networkerror")
  );
}
