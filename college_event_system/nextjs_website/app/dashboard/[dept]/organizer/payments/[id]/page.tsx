"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, Eye, Loader2, CreditCard, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Payment {
  id: string;
  utr_number: string;
  screenshot_url: string | null;
  ai_verified: boolean;
  status: "pending" | "approved" | "rejected" | "manual_review";
  created_at: string;
  registrations?: {
    users?: { name: string; email: string; roll_no?: string };
  };
}

export default function PaymentsDashboardPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;
  const eventId = params?.id as string;

  const [eventTitle, setEventTitle] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [evtRes, payRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events/${eventId}`, { headers }),
          fetch(`${flaskUrl}/api/events/${eventId}/payments`, { headers }),
        ]);
        const [evtData, payData] = await Promise.all([evtRes.json(), payRes.json()]);
        setEventTitle(evtData.event?.title ?? "Event");
        setPayments(payData.payments ?? []);
      } catch (err) {
        setError("Could not load payments.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, flaskUrl, getToken]);

  async function updateStatus(paymentId: string, status: "approved" | "rejected") {
    setUpdating(paymentId);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/payments/${paymentId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status } : p))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = payments.filter((p) => filter === "all" || p.status === filter);
  const counts = {
    pending: payments.filter((p) => p.status === "pending").length,
    approved: payments.filter((p) => p.status === "approved").length,
    rejected: payments.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/organizer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground truncate">Payments — {eventTitle}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Pending", value: counts.pending, color: "text-amber-600" },
            { label: "Approved", value: counts.approved, color: "text-green-600" },
            { label: "Rejected", value: counts.rejected, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                filter === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No {filter} payments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((pmt, i) => (
              <motion.div
                key={pmt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Screenshot thumbnail */}
                  <div className="w-14 h-14 rounded-xl border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {pmt.screenshot_url ? (
                      <img src={pmt.screenshot_url} alt="Screenshot" className="w-full h-full object-cover" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{pmt.registrations?.users?.name ?? "Student"}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        pmt.status === "approved" ? "bg-green-500/10 text-green-600"
                          : pmt.status === "rejected" ? "bg-destructive/10 text-destructive"
                          : pmt.status === "manual_review" ? "bg-orange-500/10 text-orange-600"
                          : "bg-amber-500/10 text-amber-600"
                      }`}>{pmt.status.replace("_", " ")}</span>
                      {pmt.ai_verified && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
                          ✓ AI Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      UTR: <span className="font-mono">{pmt.utr_number}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pmt.registrations?.users?.email} {pmt.registrations?.users?.roll_no ? `· ${pmt.registrations.users.roll_no}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {pmt.screenshot_url && (
                      <a href={pmt.screenshot_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-foreground hover:bg-accent transition">
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    )}
                    {pmt.status === "pending" || pmt.status === "manual_review" ? (
                      <>
                        <button
                          onClick={() => updateStatus(pmt.id, "approved")}
                          disabled={updating === pmt.id}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition disabled:opacity-50"
                        >
                          {updating === pmt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(pmt.id, "rejected")}
                          disabled={updating === pmt.id}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
