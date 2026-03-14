"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Calendar, MapPin, Clock, DollarSign, Loader2, CheckCircle,
  AlertTriangle, X, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Venue {
  id: string;
  name: string;
  capacity: number;
  is_shared: boolean;
}

interface Club {
  id: string;
  name: string;
}

interface ConflictResult {
  has_conflict: boolean;
  conflicting_event?: string;
  alternatives?: Array<{ start: string; end: string }>;
}

export default function CreateEventPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const dept = params?.dept as string;

  const [venues, setVenues] = useState<Venue[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    venueId: "",
    clubId: "",
    paymentType: "free" as "free" | "paid" | "cash",
    fee: 0,
    upiId: "",
    formOpen: "",
    formClose: "",
    maxResponses: "",
    startTime: "",
    endTime: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<ConflictResult | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [venuesRes, clubsRes] = await Promise.all([
          fetch(`${flaskUrl}/api/venues`, { headers }),
          fetch(`${flaskUrl}/api/clubs`, { headers }),
        ]);
        const [venuesData, clubsData] = await Promise.all([venuesRes.json(), clubsRes.json()]);
        setVenues(venuesData.venues ?? []);
        setClubs(clubsData.clubs ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  async function checkVenueConflict() {
    if (!form.venueId || !form.date || !form.startTime || !form.endTime) return;
    setCheckingConflict(true);
    setConflict(null);
    try {
      const token = await getToken();
      const startDT = `${form.date}T${form.startTime}:00`;
      const endDT = `${form.date}T${form.endTime}:00`;
      const res = await fetch(`${flaskUrl}/api/venues/check-conflict`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: form.venueId, start_time: startDT, end_time: endDT }),
      });
      const data = await res.json();
      setConflict(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingConflict(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError("Event title is required."); return; }
    if (!form.date) { setError("Event date is required."); return; }
    if (!form.venueId) { setError("Select a venue."); return; }
    if (!form.clubId) { setError("Select an organising club."); return; }
    if (conflict?.has_conflict) { setError("Resolve the venue conflict before submitting."); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        date: `${form.date}T${form.startTime || "00:00"}:00`,
        venue_id: form.venueId,
        club_id: form.clubId,
        payment_type: form.paymentType,
        fee: form.paymentType !== "free" ? Number(form.fee) : 0,
        upi_id: form.paymentType === "paid" ? (form.upiId.trim() || null) : null,
        form_open: form.formOpen || null,
        form_close: form.formClose || null,
        max_responses: form.maxResponses ? Number(form.maxResponses) : null,
        start_time: form.startTime ? `${form.date}T${form.startTime}:00` : null,
        end_time: form.endTime ? `${form.date}T${form.endTime}:00` : null,
      };
      const res = await fetch(`${flaskUrl}/api/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");
      setSuccess(`Event "${form.title}" created! Awaiting HOD approval.`);
      setTimeout(() => router.push(`/dashboard/${dept}/organizer`), 2000);
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
          <Link href={`/dashboard/${dept}/organizer`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">Create New Event</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Event Details</h2>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title <span className="text-destructive">*</span></label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Coding Hackathon" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea className={`${inputCls} min-h-[100px] resize-y`} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the event…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Club <span className="text-destructive">*</span></label>
                <select className={inputCls} value={form.clubId} onChange={(e) => setForm(f => ({ ...f, clubId: e.target.value }))}>
                  <option value="">Select club…</option>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </section>

            {/* Venue + Time */}
            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Venue & Schedule</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Date <span className="text-destructive">*</span></label>
                  <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Venue <span className="text-destructive">*</span></label>
                  <select className={inputCls} value={form.venueId} onChange={(e) => setForm(f => ({ ...f, venueId: e.target.value }))}>
                    <option value="">Select venue…</option>
                    {venues.map((v) => <option key={v.id} value={v.id}>{v.name} (cap: {v.capacity})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>

              {/* Conflict Checker */}
              <button
                type="button"
                onClick={checkVenueConflict}
                disabled={checkingConflict || !form.venueId || !form.date}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-accent transition disabled:opacity-50"
              >
                {checkingConflict ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Check Venue Availability
              </button>

              {conflict && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 border text-sm ${
                    conflict.has_conflict
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-green-500/30 bg-green-500/10 text-green-700"
                  }`}
                >
                  {conflict.has_conflict ? (
                    <>
                      <div className="flex items-center gap-2 font-medium mb-1">
                        <AlertTriangle className="w-4 h-4" /> Venue Conflict Detected
                      </div>
                      <p>Another event &quot;{conflict.conflicting_event}&quot; is booked at this time.</p>
                      {conflict.alternatives && conflict.alternatives.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Available slots:</p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {conflict.alternatives.map((a, i) => (
                              <li key={i}>{new Date(a.start).toLocaleTimeString()} – {new Date(a.end).toLocaleTimeString()}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Venue is available at this time!
                    </div>
                  )}
                </motion.div>
              )}
            </section>

            {/* Payment */}
            <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Registration & Payment</h2>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Payment Type</label>
                <div className="flex gap-3">
                  {(["free", "paid", "cash"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, paymentType: t, fee: 0 }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition capitalize ${
                        form.paymentType === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:bg-accent"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {form.paymentType !== "free" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Fee (₹)</label>
                  <input type="number" min={0} className={inputCls} value={form.fee} onChange={(e) => setForm(f => ({ ...f, fee: Number(e.target.value) }))} />
                </div>
              )}
              {form.paymentType === "paid" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">UPI ID</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={form.upiId}
                    onChange={(e) => setForm(f => ({ ...f, upiId: e.target.value }))}
                    placeholder="example@upi"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This UPI ID will be used to generate event-specific payment QR links.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Registration Opens</label>
                  <input type="datetime-local" className={inputCls} value={form.formOpen} onChange={(e) => setForm(f => ({ ...f, formOpen: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Registration Closes</label>
                  <input type="datetime-local" className={inputCls} value={form.formClose} onChange={(e) => setForm(f => ({ ...f, formClose: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Max Registrations</label>
                <input type="number" min={1} className={inputCls} value={form.maxResponses} onChange={(e) => setForm(f => ({ ...f, maxResponses: e.target.value }))} placeholder="Leave blank for unlimited" />
              </div>
            </section>

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

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {submitting ? "Creating…" : "Submit for Approval"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
