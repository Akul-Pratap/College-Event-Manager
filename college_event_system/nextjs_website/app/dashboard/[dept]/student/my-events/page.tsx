"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Calendar, Clock, CheckCircle, AlertCircle, XCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Registration {
  id: string;
  status: "confirmed" | "cancelled" | "waitlisted" | "payment_rejected";
  payment_method: "upi" | "cash" | "not_required";
  payment_status: "pending" | "approved" | "rejected" | "not_required";
  registered_at: string;
  events?: {
    id: string;
    title: string;
    date: string;
    status: string;
    venues?: { name: string };
    clubs?: { name: string };
  };
}

interface Waitlist {
  id: string;
  position: number;
  created_at: string;
  events?: { id: string; title: string; date: string };
}

const statusIcon = {
  confirmed: <CheckCircle className="w-4 h-4 text-green-500" />,
  waitlisted: <Clock className="w-4 h-4 text-amber-500" />,
  cancelled: <XCircle className="w-4 h-4 text-muted-foreground" />,
  payment_rejected: <AlertCircle className="w-4 h-4 text-destructive" />,
};

const statusColor = {
  confirmed: "bg-green-500/10 text-green-600",
  waitlisted: "bg-amber-500/10 text-amber-600",
  cancelled: "bg-muted text-muted-foreground",
  payment_rejected: "bg-destructive/10 text-destructive",
};

export default function MyEventsPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [waitlist, setWaitlist] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"registrations" | "waitlist">("registrations");
  const [error, setError] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [regsRes, waitRes] = await Promise.all([
          fetch(`${flaskUrl}/api/my-registrations`, { headers }),
          fetch(`${flaskUrl}/api/my-waitlist`, { headers }),
        ]);
        const [regsData, waitData] = await Promise.all([regsRes.json(), waitRes.json()]);
        setRegistrations(regsData.registrations ?? []);
        setWaitlist(waitData.waitlist ?? []);
      } catch (err) {
        setError("Could not load your events.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/student`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">My Events</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Registered", value: registrations.filter(r => r.status === "confirmed").length, color: "text-green-600" },
            { label: "Waitlisted", value: waitlist.length, color: "text-amber-600" },
            { label: "Total", value: registrations.length, color: "text-primary" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {(["registrations", "waitlist"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}{" "}
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-xs">
                {tab === "registrations" ? registrations.length : waitlist.length}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-7 h-7 animate-spin" />
            <p className="text-sm">Loading your events…</p>
          </div>
        ) : activeTab === "registrations" ? (
          registrations.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium text-muted-foreground">No registrations yet</p>
              <p className="text-sm text-muted-foreground mb-4">Browse events and register to get started.</p>
              <Link href={`/dashboard/${dept}/student/events`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition">
                Browse Events <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg, i) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-4 flex items-start gap-4"
                >
                  <div className="mt-0.5">{statusIcon[reg.status]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {reg.events?.title ?? "Event"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {reg.events?.date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(reg.events.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {reg.events?.venues?.name && (
                        <span className="text-xs text-muted-foreground">📍 {reg.events.venues.name}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[reg.status]}`}>
                        {reg.status.replace("_", " ")}
                      </span>
                      {reg.payment_status !== "not_required" && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          reg.payment_status === "approved" ? "bg-green-500/10 text-green-600"
                            : reg.payment_status === "pending" ? "bg-amber-500/10 text-amber-600"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          Payment: {reg.payment_status}
                        </span>
                      )}
                    </div>
                  </div>
                  {reg.payment_status === "pending" && reg.events?.id && (
                    <Link
                      href={`/dashboard/${dept}/student/payment/${reg.events.id}`}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
                    >
                      Pay Now
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Waitlist tab */
          waitlist.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium text-muted-foreground">Not on any waitlist</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitlist.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-lg shrink-0">
                    #{w.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{w.events?.title ?? "Event"}</p>
                    {w.events?.date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(w.events.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full">Waitlisted</span>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
