"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CheckCircle, AlertCircle, Loader2, RotateCcw, Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

interface ScanResult {
  success: boolean;
  student_name?: string;
  event_title?: string;
  roll_no?: string;
  message?: string;
}

export default function GlobalScannerPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const dept = params?.dept as string;

  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  async function submitScan(rawQR: string) {
    const trimmed = rawQR.trim();
    if (!trimmed) return;
    setScanning(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/attendance/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ qr_payload: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error ?? "Scan failed" });
      } else {
        setResult({
          success: true,
          student_name: data.student_name,
          roll_no: data.roll_no,
          event_title: data.event_title,
          message: "Attendance marked successfully!",
        });
        setScanCount((c) => c + 1);
      }
    } catch {
      setResult({ success: false, message: "Network error. Check connection." });
    } finally {
      setScanning(false);
      setQrInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submitScan(qrInput);
    }
  }

  function reset() {
    setResult(null);
    setQrInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              ← Back
            </button>
            <span className="font-bold text-foreground">QR Scanner</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-green-500" />
            <span>{scanCount} scanned</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-center space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Camera className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg mb-1">Scan QR Code</h2>
            <p className="text-sm text-muted-foreground">
              Department: {dept?.replace(/-/g, " ")}. Scan a student QR ticket payload and press Enter.
            </p>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan QR code here or type payload..."
            className="w-full px-4 py-3 rounded-xl border-2 border-primary/50 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center font-mono"
          />

          <button
            onClick={() => submitScan(qrInput)}
            disabled={scanning || !qrInput.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-60"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {scanning ? "Processing..." : "Mark Attendance"}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.success ? "success" : "fail"}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`rounded-2xl border p-6 text-center ${
                result.success
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-destructive/30 bg-destructive/10"
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                result.success ? "bg-green-500/20" : "bg-destructive/20"
              }`}>
                {result.success
                  ? <CheckCircle className="w-7 h-7 text-green-600" />
                  : <AlertCircle className="w-7 h-7 text-destructive" />}
              </div>
              {result.success ? (
                <>
                  <h3 className="text-xl font-bold text-green-700 mb-1">Attendance Marked</h3>
                  <p className="text-lg font-semibold text-foreground">{result.student_name}</p>
                  {result.roll_no && <p className="text-sm text-muted-foreground">{result.roll_no}</p>}
                  {result.event_title && <p className="text-xs text-muted-foreground mt-1">{result.event_title}</p>}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-destructive mb-1">Scan Failed</h3>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </>
              )}
              <button
                onClick={reset}
                className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-accent transition mx-auto"
              >
                <RotateCcw className="w-4 h-4" /> Scan Next
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
