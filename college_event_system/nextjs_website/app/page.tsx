"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Trophy,
  Zap,
  Shield,
  Smartphone,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  venues?: { name: string };
  departments?: { name: string };
  fee: number;
  status: string;
}

interface Highlight {
  id: string;
  winner_name: string;
  prize: string;
  description: string;
  image_url: string;
  events?: { title: string; date: string };
}

interface Department {
  id: string;
  name: string;
  code: string;
}

function Countdown({ targetDate }: { targetDate: string }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return;
      setTime({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div className="flex gap-2 text-xs">
      {[
        ["d", time.d],
        ["h", time.h],
        ["m", time.m],
        ["s", time.s],
      ].map(([label, val]) => (
        <div
          key={label as string}
          className="flex flex-col items-center bg-primary/10 rounded px-1.5 py-0.5"
        >
          <span className="font-bold font-mono text-primary">
            {String(val).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  {
    icon: Shield,
    title: "OWASP Security",
    desc: "All Top 10 protections, AES-256 QR, brute-force blocking, RLS department isolation.",
  },
  {
    icon: Zap,
    title: "AI-Powered",
    desc: "Gemini Vision payment verification, Groq threat detection, personalised event feed.",
  },
  {
    icon: Users,
    title: "8 Role Dashboards",
    desc: "Super Admin, HOD, Faculty, Class Incharge, Organizer, Volunteer, CR, Student.",
  },
  {
    icon: Smartphone,
    title: "Flutter Android App",
    desc: "Full QR scanner, offline mode, push notifications — all 8 roles on Android.",
  },
];

export default function LandingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    Promise.all([
      fetch(`${flaskUrl}/api/events/public`)
        .then((r) => r.json())
        .catch(() => ({ events: [] })),
      fetch(`${flaskUrl}/api/highlights`)
        .then((r) => r.json())
        .catch(() => ({ highlights: [] })),
      fetch(`${flaskUrl}/api/departments`)
        .then((r) => r.json())
        .catch(() => ({ departments: [] })),
    ])
      .then(([evData, hlData, deptData]) => {
        setEvents(evData.events ?? []);
        setHighlights(hlData.highlights ?? []);
        setDepartments(deptData.departments ?? []);
      })
      .finally(() => setLoading(false));
  }, [flaskUrl]);

  return (
    <main className="min-h-screen bg-background">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                L
              </span>
            </div>
            <span className="font-bold text-lg text-foreground">
              LTSU Events
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-6">
              <Zap className="w-3 h-3" />
              AI-Powered · OWASP Secure · Zero Cost
            </span>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              College Events, <span className="gradient-text">Simplified</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              The complete event management platform for Lamrin Tech Skills
              University. Register, organise, approve, scan — all in one secure
              place.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sign-in"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 border border-border text-foreground rounded-xl font-semibold text-base hover:bg-accent transition-colors"
              >
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6"
          >
            {[
              { value: "8", label: "User Roles" },
              { value: "22", label: "DB Tables" },
              { value: "7", label: "Security Tools" },
              { value: "₹0", label: "Monthly Cost" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold text-primary">
                  {value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A full-stack platform built with Next.js 14, Flask, Flutter, and
              Supabase PostgreSQL.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card-hover p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Upcoming Events ────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Upcoming Events
              </h2>
              <p className="text-muted-foreground mt-1">
                Register and join the excitement
              </p>
            </div>
            <Link
              href="/sign-up"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-base p-6 space-y-3">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-8 w-full rounded" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No upcoming events right now.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back soon or sign up to get notified.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.slice(0, 6).map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="card-base p-6 flex flex-col gap-3 cursor-pointer hover:shadow-card-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-2 flex-1">
                      {event.title}
                    </h3>
                    <span
                      className={`badge-base shrink-0 ${event.fee > 0 ? "badge-warning" : "badge-success"}`}
                    >
                      {event.fee > 0 ? `₹${event.fee}` : "Free"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {event.venues?.name && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{event.venues.name}</span>
                      </div>
                    )}
                    {event.departments?.name && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>{event.departments.name}</span>
                      </div>
                    )}
                  </div>

                  <Countdown targetDate={event.date} />

                  <Link
                    href="/sign-up"
                    className="mt-auto btn-primary text-sm py-2"
                  >
                    Register Now
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Event Highlights / Winners ─────────────────────────── */}
      {highlights.length > 0 && (
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-bold text-foreground mb-3">
                <Trophy className="w-7 h-7 inline-block text-yellow-500 mr-2 -mt-1" />
                Event Highlights
              </h2>
              <p className="text-muted-foreground">Celebrating our achievers</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlights.slice(0, 6).map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="card-hover p-6"
                >
                  {h.image_url && (
                    <div className="w-full h-36 rounded-lg overflow-hidden mb-4 bg-muted">
                      <img
                        src={h.image_url}
                        alt={h.winner_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span className="font-semibold text-foreground">
                      {h.winner_name}
                    </span>
                  </div>
                  {h.prize && (
                    <span className="badge-warning text-xs mb-2 inline-block">
                      {h.prize}
                    </span>
                  )}
                  {h.events?.title && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {h.events.title}
                    </p>
                  )}
                  {h.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {h.description}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Departments ────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              All Departments
            </h2>
            <p className="text-muted-foreground mb-8">
              Department-isolated data with Supabase RLS — each department only
              sees its own events.
            </p>
            {loading ? (
              <div className="flex flex-wrap justify-center gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="px-4 py-2 rounded-full border border-border bg-card skeleton h-9 w-28"
                  />
                ))}
              </div>
            ) : departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments found.</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {departments.map((dept) => (
                  <span
                    key={dept.id}
                    className="px-4 py-2 rounded-full border border-border bg-card text-sm font-medium text-muted-foreground"
                    title={dept.code}
                  >
                    {dept.name}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-primary">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Join LTSU Events today — free for all students and staff.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary rounded-xl font-semibold text-base hover:bg-white/90 transition-colors shadow-lg"
          >
            Create Your Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">
                L
              </span>
            </div>
            <span>LTSU Events — Lamrin Tech Skills University</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="hover:text-foreground transition-colors"
            >
              Register
            </Link>
            <span>Stack: Next.js · Flask · Flutter · Supabase</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
