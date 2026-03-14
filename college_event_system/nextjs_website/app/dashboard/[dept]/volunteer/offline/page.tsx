"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  WifiOff, Upload, CheckCircle, Loader2, RotateCcw, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface QueuedScan {
  qr_payload: string;
  scanned_at: string;
  local_id: string;
}

const STORAGE_KEY = "volunteer_offline_queue";

export default function VolunteerOfflinePage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [qrInput, setQrInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{ id: string; success: boolean; message: string }>>([]);
  const [isOnline, setIsOnline] = useState(true);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setQueue(JSON.parse(stored));
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function saveQueue(q: QueuedScan[]) {
    setQueue(q);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
  }

  function addToQueue() {
    const trimmed = qrInput.trim();
    if (!trimmed) return;
    const newScan: QueuedScan = {
      qr_payload: trimmed,
      scanned_at: new Date().toISOString(),
      local_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    saveQueue([...queue, newScan]);
    setQrInput("");
  }

  function removeFromQueue(localId: string) {
    saveQueue(queue.filter((q) => q.local_id !== localId));
  }

  async function syncQueue() {
    if (!isOnline) return;
    setUploading(true);
    setUploadResults([]);
    const token = await getToken();
    const results: typeof uploadResults = [];

    for (const scan of queue) {
      try {
        const res = await fetch(`${flaskUrl}/api/attendance/scan`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ qr_payload: scan.qr_payload }),
        });
        const data = await res.json();
        results.push({
          id: scan.local_id,
          success: res.ok,
          message: res.ok ? (data.student_name ?? "Marked") : (data.error ?? "Failed"),
        });
        if (res.ok || res.status === 409) {
          // Remove from queue if synced or already marked
          saveQueue(queue.filter((q) => q.local_id !== scan.local_id));
        }
      } catch {
        results.push({ id: scan.local_id, success: false, message: "Network error" });
      }
    }
    setUploadResults(results);
    setUploading(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${dept}/volunteer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
            <span className="font-bold text-foreground">Offline Mode</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isOnline ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
          }`}>
            {isOnline ? <CheckCircle className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Offline notice */}
        {!isOnline && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-700 text-sm">Offline Mode Active</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Scans are being queued locally. They will sync when you come back online.
              </p>
            </div>
          </div>
        )}

        {/* Queue input */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Queue a Scan</h2>
          <input
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addToQueue(); }}
            placeholder="Scan QR payload or type manually…"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
          />
          <button
            onClick={addToQueue}
            disabled={!qrInput.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
          >
            Add to Queue
          </button>
        </div>

        {/* Queue list */}
        {queue.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-muted/30 border-b border-border">
              <span className="font-semibold text-foreground text-sm">
                Queued Scans ({queue.length})
              </span>
              <button
                onClick={syncQueue}
                disabled={uploading || !isOnline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Syncing…" : "Sync Now"}
              </button>
            </div>
            <div className="divide-y divide-border">
              {queue.map((scan, i) => {
                const uploadRes = uploadResults.find((r) => r.id === scan.local_id);
                return (
                  <motion.div key={scan.local_id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-foreground truncate">{scan.qr_payload.slice(0, 30)}…</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(scan.scanned_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {uploadRes && (
                        <p className={`text-xs mt-0.5 ${uploadRes.success ? "text-green-600" : "text-destructive"}`}>
                          {uploadRes.success ? `✓ ${uploadRes.message}` : `✗ ${uploadRes.message}`}
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeFromQueue(scan.local_id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition">
                      Remove
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {queue.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-60" />
            <p className="text-muted-foreground text-sm">Queue is empty — all scans are synced!</p>
            <Link href={`/dashboard/${dept}/volunteer/scanner`} className="text-sm text-primary hover:underline mt-2 block">
              → Go to Online Scanner
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
