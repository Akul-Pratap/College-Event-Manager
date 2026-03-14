"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users, Loader2, Plus, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Venue {
  id: string;
  name: string;
  capacity: number;
  is_shared: boolean;
  departments?: { name: string };
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  events?: { title: string; clubs?: { name: string } };
}

export default function SuperAdminVenuesPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState<string | null>(null);

  // New venue form
  const [showForm, setShowForm] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: "", capacity: 0, is_shared: true });
  const [creating, setCreating] = useState(false);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/venues`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVenues(data.venues ?? []);
        if (data.venues?.length > 0) setSelectedVenue(data.venues[0].id);
      } catch (err) {
        setError("Could not load venues.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  useEffect(() => {
    if (!selectedVenue) return;
    async function loadBookings() {
      try {
        const token = await getToken();
        const res = await fetch(
          `${flaskUrl}/api/venues/${selectedVenue}/bookings?date=${dateFilter}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setBookings(data.bookings ?? []);
      } catch (err) {
        console.error(err);
      }
    }
    loadBookings();
  }, [selectedVenue, dateFilter, flaskUrl, getToken]);

  async function createVenue() {
    if (!newVenue.name.trim() || newVenue.capacity < 1) return;
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/venues`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(newVenue),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setVenues((prev) => [...prev, data.venue]);
      setShowForm(false);
      setNewVenue({ name: "", capacity: 0, is_shared: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const selectedVenueObj = venues.find((v) => v.id === selectedVenue);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/${dept}/super-admin`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
            <span className="font-bold text-foreground">Venue Management</span>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
          >
            <Plus className="w-4 h-4" /> Add Venue
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* New venue form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-3">
            <h3 className="font-semibold text-foreground">Create New Venue</h3>
            <div className="grid grid-cols-3 gap-3">
              <input
                className="col-span-2 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Venue name e.g. Seminar Hall 1"
                value={newVenue.name}
                onChange={(e) => setNewVenue((v) => ({ ...v, name: e.target.value }))}
              />
              <input
                type="number"
                min={1}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Capacity"
                value={newVenue.capacity || ""}
                onChange={(e) => setNewVenue((v) => ({ ...v, capacity: Number(e.target.value) }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={newVenue.is_shared}
                onChange={(e) => setNewVenue((v) => ({ ...v, is_shared: e.target.checked }))}
                className="accent-primary"
              />
              Shared venue (available to all departments)
            </label>
            <div className="flex gap-3">
              <button onClick={createVenue} disabled={creating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-accent transition">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive mb-4">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Venue list */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">All Venues ({venues.length})</h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              venues.map((venue) => (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venue.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedVenue === venue.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedVenue === venue.id ? "bg-primary/10" : "bg-muted"
                    }`}>
                      <MapPin className={`w-4 h-4 ${selectedVenue === venue.id ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{venue.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" /> {venue.capacity}
                        {venue.is_shared && (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">Shared</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Calendar / bookings */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {selectedVenueObj?.name} — Bookings
              </h3>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {bookings.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground text-sm">No bookings on this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{b.events?.title ?? "Event"}</p>
                      {b.events?.clubs?.name && <p className="text-xs text-muted-foreground">{b.events.clubs.name}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(b.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(b.end_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.status === "confirmed" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {b.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
