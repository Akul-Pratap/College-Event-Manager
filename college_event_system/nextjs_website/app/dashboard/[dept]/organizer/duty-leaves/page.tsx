"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { FileText, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface DutyLeave {
  id: string;
  name: string;
  roll_no: string;
  class: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected";
  users?: { name: string; email: string };
  events?: { title: string };
}

export default function OrganizerDutyLeavesPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [leaves, setLeaves] = useState<DutyLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/duty-leaves/my-events`, {
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

  const filtered = leaves.filter((l) => filter === "all" || l.status === filter);

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-destructive" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/organizer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Duty Leaves</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Filter */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
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

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No duty leave requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((leave, i) => (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4"
              >
                <div className="mt-0.5">{statusIcon[leave.status]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{leave.name}</p>
                  <p className="text-xs text-muted-foreground">{leave.roll_no} · {leave.class}</p>
                  {leave.events?.title && (
                    <p className="text-xs text-muted-foreground mt-0.5">Event: {leave.events.title}</p>
                  )}
                  <div className="flex gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
                    <span>📅 {new Date(leave.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span>🕐 {leave.start_time} – {leave.end_time}</span>
                  </div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  leave.status === "approved" ? "bg-green-500/10 text-green-600"
                    : leave.status === "rejected" ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-600"
                }`}>
                  {leave.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
