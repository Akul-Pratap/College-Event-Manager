"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, Loader2, FileText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface DutyLeave {
  id: string;
  name: string;
  roll_no: string;
  class: string;
  batch: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected";
  events?: { title: string };
  users?: { email: string };
}

export default function FCDutyLeavesPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [leaves, setLeaves] = useState<DutyLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/duty-leaves/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLeaves(data.leaves ?? []);
      } catch (err) {
        setError("Could not load duty leaves.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  async function decide(leaveId: string, status: "approved" | "rejected") {
    setUpdating(leaveId);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/duty-leaves/${leaveId}/decide`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setLeaves((prev) => prev.map((l) => (l.id === leaveId ? { ...l, status } : l)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = leaves.filter((l) => filter === "all" || l.status === filter);
  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/faculty-coordinator`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Duty Leave Approvals</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{pendingCount}</span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Pending", value: leaves.filter(l => l.status === "pending").length, color: "text-amber-600" },
            { label: "Approved", value: leaves.filter(l => l.status === "approved").length, color: "text-green-600" },
            { label: "Rejected", value: leaves.filter(l => l.status === "rejected").length, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                filter === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No {filter} requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((leave, i) => (
              <motion.div key={leave.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                <div className="mt-0.5">
                  {leave.status === "approved" ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : leave.status === "rejected" ? <XCircle className="w-4 h-4 text-destructive" />
                    : <Clock className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{leave.name}</p>
                  <p className="text-xs text-muted-foreground">{leave.roll_no} · {leave.class} · Batch {leave.batch}</p>
                  {leave.events?.title && <p className="text-xs text-muted-foreground mt-0.5">Event: {leave.events.title}</p>}
                  <div className="flex gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
                    <span>📅 {new Date(leave.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span>🕐 {leave.start_time} – {leave.end_time}</span>
                  </div>
                </div>
                {leave.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => decide(leave.id, "approved")} disabled={updating === leave.id}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition disabled:opacity-50">
                      {updating === leave.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button onClick={() => decide(leave.id, "rejected")} disabled={updating === leave.id}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
