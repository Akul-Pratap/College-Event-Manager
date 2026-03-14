"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Users, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ClubJoinRequest {
  id: string;
  request_type: "permanent" | "event_only";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  users?: { name: string; email: string; roll_no?: string; year?: string };
  clubs?: { name: string };
  events?: { title: string };
}

export default function FCMembersPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [requests, setRequests] = useState<ClubJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/clubs/join-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRequests(data.requests ?? []);
      } catch (err) {
        setError("Could not load requests.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  async function decide(reqId: string, status: "approved" | "rejected") {
    setUpdating(reqId);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/clubs/join-requests/${reqId}/decide`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status } : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/faculty-coordinator`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Club Member Requests</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">{pendingCount}</span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
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
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">No {filter} requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{req.users?.name ?? "Student"}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      req.request_type === "permanent" ? "bg-primary/10 text-primary" : "bg-violet-500/10 text-violet-600"
                    }`}>
                      {req.request_type === "permanent" ? "Permanent Member" : "Event Volunteer"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{req.users?.email} {req.users?.roll_no ? `· ${req.users.roll_no}` : ""}</p>
                  {req.clubs?.name && <p className="text-xs text-muted-foreground mt-0.5">Club: {req.clubs.name}</p>}
                  {req.events?.title && <p className="text-xs text-muted-foreground">Event: {req.events.title}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">Applied {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
                {req.status === "pending" ? (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => decide(req.id, "approved")} disabled={updating === req.id}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition disabled:opacity-50">
                      {updating === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Accept
                    </button>
                    <button onClick={() => decide(req.id, "rejected")} disabled={updating === req.id}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                ) : (
                  <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    req.status === "approved" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                  }`}>
                    {req.status === "approved" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {req.status}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
