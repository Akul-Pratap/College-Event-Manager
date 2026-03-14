"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { FileText, Loader2, CheckCircle, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Event {
  id: string;
  title: string;
  date: string;
}

interface DutyLeave {
  id: string;
  status: "pending" | "approved" | "rejected";
  date: string;
  start_time: string;
  end_time: string;
  events?: { title: string };
}

export default function VolunteerDutyLeavePage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [myLeaves, setMyLeaves] = useState<DutyLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    eventId: "",
    name: "",
    rollNo: "",
    className: "",
    batch: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [evtsRes, leavesRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events?role=volunteer`, { headers }),
          fetch(`${flaskUrl}/api/duty-leaves/mine`, { headers }),
        ]);
        const [evtsData, leavesData] = await Promise.all([evtsRes.json(), leavesRes.json()]);
        setEvents(evtsData.events ?? []);
        setMyLeaves(leavesData.leaves ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.eventId || !form.name || !form.rollNo || !form.date || !form.startTime || !form.endTime) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/duty-leaves`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: form.eventId,
          name: form.name.trim(),
          roll_no: form.rollNo.trim(),
          class: form.className.trim(),
          batch: form.batch.trim(),
          date: form.date,
          start_time: form.startTime,
          end_time: form.endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSuccess("Duty leave submitted successfully! Awaiting Faculty Coordinator approval.");
      setMyLeaves((prev) => [data.leave, ...prev]);
      setForm({ eventId: "", name: "", rollNo: "", className: "", batch: "", date: "", startTime: "", endTime: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/volunteer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Duty Leave Request</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Submit form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Submit New Request</h2>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Event <span className="text-destructive">*</span></label>
            <select value={form.eventId} onChange={(e) => setForm(f => ({ ...f, eventId: e.target.value }))} className={inputCls}>
              <option value="">Select event…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name <span className="text-destructive">*</span></label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Roll No <span className="text-destructive">*</span></label>
              <input className={inputCls} value={form.rollNo} onChange={(e) => setForm(f => ({ ...f, rollNo: e.target.value }))} placeholder="e.g. 22CS001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Class / Section</label>
              <input className={inputCls} value={form.className} onChange={(e) => setForm(f => ({ ...f, className: e.target.value }))} placeholder="e.g. 3rd Year CS-A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Batch</label>
              <input className={inputCls} value={form.batch} onChange={(e) => setForm(f => ({ ...f, batch: e.target.value }))} placeholder="e.g. 2022-2026" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Date <span className="text-destructive">*</span></label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">From <span className="text-destructive">*</span></label>
              <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">To <span className="text-destructive">*</span></label>
              <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>

        {/* My leaves */}
        {!loading && myLeaves.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">My Past Requests</h3>
            {myLeaves.map((leave, i) => (
              <motion.div key={leave.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  leave.status === "approved" ? "bg-green-500/10" : leave.status === "rejected" ? "bg-destructive/10" : "bg-amber-500/10"
                }`}>
                  {leave.status === "approved" ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : leave.status === "rejected" ? <X className="w-4 h-4 text-destructive" />
                    : <FileText className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{leave.events?.title ?? "Event"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(leave.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {leave.start_time} – {leave.end_time}
                  </p>
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
