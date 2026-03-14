"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Search,
  Calendar,
  MapPin,
  Filter,
  ArrowRight,
  X,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  fee: number;
  payment_type: "free" | "paid" | "cash";
  status: string;
  form_open: string | null;
  form_close: string | null;
  max_responses: number | null;
  clubs?: { name: string };
  venues?: { name: string };
}

const STATUS_TABS = ["All", "Open", "Upcoming", "Completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

export default function StudentEventsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [feeFilter, setFeeFilter] = useState<"all" | "free" | "paid">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch events");
        const data = await res.json();
        setEvents(data.events ?? []);
      } catch (err) {
        setError("Could not load events. Is the Flask API running?");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  const now = new Date();

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.clubs?.name?.toLowerCase().includes(search.toLowerCase());

    const formOpen = e.form_open ? new Date(e.form_open) : null;
    const formClose = e.form_close ? new Date(e.form_close) : null;
    const isOpen =
      e.status === "live" &&
      (!formOpen || formOpen <= now) &&
      (!formClose || formClose >= now);
    const isUpcoming =
      e.status === "live" && formOpen && formOpen > now;
    const isCompleted = e.status === "completed";

    const matchTab =
      activeTab === "All" ||
      (activeTab === "Open" && isOpen) ||
      (activeTab === "Upcoming" && isUpcoming) ||
      (activeTab === "Completed" && isCompleted);

    const matchFee =
      feeFilter === "all" ||
      (feeFilter === "free" && (e.payment_type === "free" || e.fee === 0)) ||
      (feeFilter === "paid" && e.payment_type !== "free" && e.fee > 0);

    return matchSearch && matchTab && matchFee;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/${dept}/student`}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              ← Back
            </Link>
            <span className="font-bold text-foreground">Browse Events</span>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events or clubs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 rounded-xl border border-border bg-card"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              Fee Type
            </p>
            <div className="flex gap-2">
              {(["all", "free", "paid"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFeeFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    feeFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            event{filtered.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-6">
            {error}
          </div>
        )}

        {/* Event Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3 animate-pulse">
                <div className="h-4 w-1/3 bg-muted rounded" />
                <div className="h-5 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">
              {search ? `No events matching "${search}"` : "No events found"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try changing the filter or search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} dept={dept} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({
  event,
  index,
  dept,
}: {
  event: Event;
  index: number;
  dept: string;
}) {
  const now = new Date();
  const formOpen = event.form_open ? new Date(event.form_open) : null;
  const formClose = event.form_close ? new Date(event.form_close) : null;
  const isOpen =
    event.status === "live" &&
    (!formOpen || formOpen <= now) &&
    (!formClose || formClose >= now);

  const feeLabel =
    event.payment_type === "free" || event.fee === 0
      ? "Free"
      : `₹${event.fee}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200"
    >
      <div className="h-1 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />
      <div className="p-5 flex flex-col gap-3 flex-1">
        {event.clubs?.name && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary w-fit">
            {event.clubs.name}
          </span>
        )}
        <h3 className="font-bold text-foreground leading-snug line-clamp-2">
          {event.title}
        </h3>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
        <div className="flex flex-col gap-1.5 mt-auto text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {new Date(event.date).toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </div>
          {event.venues?.name && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="line-clamp-1">{event.venues.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              event.fee === 0
                ? "bg-green-500/10 text-green-600"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {feeLabel}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isOpen
                ? "bg-green-500/10 text-green-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isOpen ? "Open" : event.status}
          </span>
        </div>
        <Link
          href={
            isOpen
              ? `/dashboard/${dept}/student/register/${event.id}`
              : `/events/${event.id}`
          }
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition mt-1"
        >
          {isOpen ? "Register Now" : "View Details"}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}
