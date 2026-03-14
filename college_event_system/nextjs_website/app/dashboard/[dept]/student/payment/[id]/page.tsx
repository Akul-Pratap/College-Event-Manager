"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Upload, CheckCircle, AlertCircle, Loader2, ImageIcon, X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface PaymentInfo {
  event_title: string;
  fee: number;
  payment_type: "upi" | "cash";
  upi_id?: string;
  registration_id: string;
  payment_status: "pending" | "approved" | "rejected" | "not_required";
}

export default function PaymentPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";
  const upiUri = info?.payment_type === "upi" && info.upi_id
    ? `upi://pay?pa=${encodeURIComponent(info.upi_id)}&pn=${encodeURIComponent(info.event_title)}&am=${encodeURIComponent(String(info.fee))}&cu=INR&tn=${encodeURIComponent(`Event ${info.event_title}`)}`
    : null;
  const upiQrUrl = upiUri
    ? `https://quickchart.io/qr?text=${encodeURIComponent(upiUri)}&size=240`
    : null;

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(`${flaskUrl}/api/events/${eventId}/payment-info`, {
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          setInfo(data.payment ?? null);
          if (data.payment?.payment_status === "approved") setDone(true);
          return;
        }

        // Fallback for older backend builds that do not expose /payment-info.
        const [eventRes, regsRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events/${eventId}`, { headers }),
          fetch(`${flaskUrl}/api/my-registrations`, { headers }),
        ]);

        const [eventData, regsData] = await Promise.all([
          eventRes.json().catch(() => ({})),
          regsRes.json().catch(() => ({})),
        ]);

        const event = eventData.event;
        const reg = (regsData.registrations ?? []).find((r: any) => r.event_id === eventId);
        if (!event || !reg) {
          setInfo(null);
          return;
        }

        const fallbackInfo: PaymentInfo = {
          event_title: event.title,
          fee: Number(event.fee ?? 0),
          payment_type: event.payment_type === "cash" ? "cash" : "upi",
          upi_id: event.upi_id,
          registration_id: reg.id,
          payment_status: reg.payment_status ?? "pending",
        };
        setInfo(fallbackInfo);
        if (fallbackInfo.payment_status === "approved") setDone(true);
      } catch (err) {
        setError("Could not load payment info.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, flaskUrl, getToken]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(f.type)) {
      setError("Only JPG/PNG images are allowed.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!utr.trim()) { setError("Enter your UTR/transaction number."); return; }
    if (!file) { setError("Upload your UPI payment screenshot."); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("utr_number", utr.trim());
      formData.append("screenshot", file);
      formData.append("registration_id", info?.registration_id ?? "");

      const res = await fetch(`${flaskUrl}/api/payments/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment submission failed");
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done || info?.payment_status === "approved") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Payment Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your payment is under review. You will be notified once verified.
          </p>
          <Link
            href={`/dashboard/${dept}/student/my-events`}
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
          >
            View My Events
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/student/my-events`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Complete Payment</span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        ) : !info ? (
          <div className="text-center py-16 text-muted-foreground">Payment info not found.</div>
        ) : (
          <>
            {/* Event + Amount */}
            <div className="rounded-2xl border border-border bg-card p-5 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Paying for</p>
              <h2 className="font-bold text-foreground text-lg mb-3">{info.event_title}</h2>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Amount</span>
                <span className="text-2xl font-bold text-primary">₹{info.fee}</span>
              </div>
            </div>

            {/* UPI QR instructions */}
            {info.payment_type === "upi" && info.upi_id && (
              <div className="rounded-2xl border border-border bg-card p-5 mb-6">
                <p className="text-sm font-semibold text-foreground mb-1">Pay via UPI</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Open GPay, PhonePe, or Paytm and send ₹{info.fee} to:
                </p>
                <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-xl">
                  <span className="font-mono text-sm text-foreground flex-1">{info.upi_id}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(info.upi_id!)}
                    className="text-xs text-primary hover:underline"
                  >
                    Copy
                  </button>
                </div>
                {upiQrUrl && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <img
                      src={upiQrUrl}
                      alt="UPI payment QR"
                      className="w-44 h-44 rounded-xl border border-border bg-white p-2"
                    />
                    <a
                      href={upiUri ?? "#"}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
                    >
                      Open UPI App
                    </a>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  This QR and UPI link are generated per event. After payment, upload your screenshot with UTR number below.
                </p>
              </div>
            )}

            {info.payment_type === "cash" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700">
                    This is a cash payment event. Pay the organizer in person. They will mark your payment as received.
                  </p>
                </div>
              </div>
            )}

            {/* Upload form (UPI only) */}
            {info.payment_type === "upi" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    UTR / Transaction ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 428175926374"
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find this in your UPI app under transaction details.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Payment Screenshot <span className="text-destructive">*</span>
                  </label>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleFile} className="hidden" />
                  {preview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-border">
                      <img src={preview} alt="Screenshot" className="w-full max-h-64 object-contain bg-muted" />
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition text-muted-foreground hover:text-foreground"
                    >
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm">Click to upload screenshot (JPG/PNG, max 5MB)</span>
                    </button>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {submitting ? "Submitting…" : "Submit Payment"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
