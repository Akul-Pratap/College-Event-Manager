"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Bell,
  Star,
  BookOpen,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  fee: number;
  payment_type: string;
  status: string;
  form_open: string | null;
  form_close: string | null;
  clubs?: { name: string };
  venues?: { name: string };
}

interface Notification {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface Registration {
  id: string;
  status: string;
  payment_status: string;
  events?: { title: string; date: string; status: string };
}

export default function StudentDashboard() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [aiFeed, setAiFeed] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"for-you" | "all" | "my-events">(
    "for-you"
  );
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [secondaryRole, setSecondaryRole] = useState("");

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [eventsRes, notifsRes, regsRes, meRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events`, { headers }),
          fetch(`${flaskUrl}/api/notifications`, { headers }),
          fetch(`${flaskUrl}/api/my-registrations`, { headers }),
          fetch(`${flaskUrl}/api/auth/me`, { headers }),
        ]);

        const [eventsData, notifsData, regsData, meData] = await Promise.all([
          eventsRes.json(),
          notifsRes.json(),
          regsRes.json(),
          meRes.json(),
        ]);

        setAllEvents(eventsData.events ?? []);
        setNotifications(notifsData.notifications ?? []);
        setRegistrations(regsData.registrations ?? []);
        setUnreadCount(
          (notifsData.notifications ?? []).filter(
            (n: Notification) => !n.is_read
          ).length
        );
        setSecondaryRole(meData?.user?.secondary_role ?? "");

        // Get AI feed
        const aiRes = await fetch(`${flaskUrl}/api/ai/feed`, {
          method: "POST",
          headers,
          body: JSON.stringify({ department: dept }),
        });
        const aiData = await aiRes.json();
        setAiFeed(aiData.events ?? eventsData.events?.slice(0, 6) ?? []);
      } catch (err) {
        console.error("Failed to load student dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [flaskUrl, dept, getToken]);

  const filteredEvents = allEvents.filter(
    (e) =>
      !searchQuery ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.clubs?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayEvents =
    activeTab === "for-you"
      ? aiFeed
      : activeTab === "all"
        ? filteredEvents
        : [];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                L
              </span>
            </div>
            <span className="font-bold text-foreground hidden sm:block">
              LTSU Events
            </span>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setActiveTab("all");
              }}
              className="input-base pl-9 py-2"
            />
          </div>

          {/* Notifications + role switcher */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {secondaryRole && (
              <Link
                href={`/dashboard/${dept}/${secondaryRole.replace(/_/g, "-")}`}
                className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-primary/50 text-primary hover:bg-primary/10 transition font-medium capitalize"
              >
                <Zap className="w-3.5 h-3.5" />
                {secondaryRole.replace(/_/g, " ")} view
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Welcome Banner ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-br from-primary to-violet-600 p-6 text-white mb-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Welcome to LTSU Events 🎉
              </h1>
              <p className="text-primary-foreground/80 text-sm">
                Discover events, register, track your tickets, and join clubs —
                all in one place.
              </p>
            </div>
            <div className="hidden sm:flex flex-col gap-2 text-right shrink-0">
              <div className="text-2xl font-bold">
                {registrations.length}
              </div>
              <div className="text-xs text-primary-foreground/70">
                Registrations
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Registered", value: registrations.length },
              {
                label: "Upcoming",
                value: registrations.filter(
                  (r) => r.events?.status === "live"
                ).length,
              },
              {
                label: "Notifications",
                value: unreadCount,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white/10 rounded-xl px-3 py-2 text-center"
              >
                <div className="text-xl font-bold">{value}</div>
                <div className="text-[11px] text-primary-foreground/70">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Quick Links ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          {[
            {
              icon: Calendar,
              label: "My Events",
              href: `/dashboard/${dept}/student/my-events`,
              color: "bg-blue-500/10 text-blue-600",
            },
            {
              icon: BookOpen,
              label: "Browse Events",
              href: `/dashboard/${dept}/student/events`,
              color: "bg-violet-500/10 text-violet-600",
            },
            {
              icon: Users,
              label: "Clubs",
              href: `/dashboard/${dept}/student/clubs`,
              color: "bg-green-500/10 text-green-600",
            },
            {
              icon: Star,
              label: "Waitlist",
              href: `/dashboard/${dept}/student/my-events`,
              color: "bg-orange-500/10 text-orange-600",
            },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link
              key={label}
              href={href}
              className="card-hover p-4 flex flex-col items-center gap-2 text-center"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            </Link>
          ))}
        </motion.div>

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: "for-you", label: "✨ For You", icon: Zap },
              { id: "all", label: "All Events", icon: Calendar },
              { id: "my-events", label: "My Registrations", icon: Star },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── My Registrations Tab ────────────────────────────────── */}
        {activeTab === "my-events" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-base p-4">
                    <div className="skeleton h-5 w-2/3 rounded mb-2" />
                    <div className="skeleton h-4 w-1/3 rounded" />
                  </div>
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">
                  No registrations yet
                </p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Browse events and register to get started.
                </p>
                <button
                  onClick={() => setActiveTab("all")}
                  className="btn-primary"
                >
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {registrations.map((reg, i) => (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="card-base p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {reg.events?.title ?? "Event"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {reg.events?.date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(reg.events.date).toLocaleDateString(
                              "en-IN",
                              { day: "numeric", month: "short" }
                            )}
                          </span>
                        )}
                        <span
                          className={`badge-base text-xs ${
                            reg.status === "confirmed"
                              ? "badge-success"
                              : reg.status === "waitlisted"
                                ? "badge-warning"
                                : "badge-neutral"
                          }`}
                        >
                          {reg.status}
                        </span>
                        {reg.payment_status !== "not_required" && (
                          <span
                            className={`badge-base text-xs ${
                              reg.payment_status === "approved"
                                ? "badge-success"
                                : reg.payment_status === "pending"
                                  ? "badge-warning"
                                  : "badge-danger"
                            }`}
                          >
                            Payment: {reg.payment_status}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/${dept}/student/my-events`}
                      className="btn-outline text-xs px-3 py-1.5 shrink-0"
                    >
                      View <ArrowRight className="w-3 h-3 ml-1 inline" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Events Grid (For You + All) ──────────────────────────── */}
        {(activeTab === "for-you" || activeTab === "all") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "for-you" && (
              <div className="flex items-center gap-2 mb-5">
                <Zap className="w-4 h-4 text-violet-500" />
                <span className="text-sm text-muted-foreground">
                  AI-curated events based on your department and interests
                </span>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="card-base p-5 space-y-3">
                    <div className="skeleton h-5 w-3/4 rounded" />
                    <div className="skeleton h-4 w-1/2 rounded" />
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-9 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : displayEvents.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-muted-foreground">
                  {searchQuery
                    ? `No events matching "${searchQuery}"`
                    : "No events available right now"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back soon for upcoming events!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayEvents.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={i}
                    dept={dept}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Recent Notifications ────────────────────────────────── */}
        {notifications.slice(0, 3).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Recent Notifications
            </h2>
            <div className="space-y-2">
              {notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`card-base p-4 flex items-start gap-3 ${
                    !notif.is_read ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(notif.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Event Card ─────────────────────────────────────────────────────────────

function EventCard({
  event,
  index,
  dept,
}: {
  event: Event;
  index: number;
  dept: string;
}) {
  const feeLabel =
    event.payment_type === "free" || event.fee === 0
      ? "Free"
      : `₹${event.fee}`;

  const formattedDate = (() => {
    try {
      return new Date(event.date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    } catch {
      return event.date;
    }
  })();

  const isOpen = (() => {
    if (event.status !== "live") return false;
    const now = new Date();
    if (event.form_open && new Date(event.form_open) > now) return false;
    if (event.form_close && new Date(event.form_close) < now) return false;
    return true;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className="card-base overflow-hidden flex flex-col hover:shadow-card-lg transition-all duration-200"
    >
      {/* Colour accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Club badge */}
        {event.clubs?.name && (
          <span className="badge-primary text-xs w-fit">
            {event.clubs.name}
          </span>
        )}

        {/* Title */}
        <h3 className="font-bold text-foreground leading-snug line-clamp-2 text-base">
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-1.5 mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{formattedDate}</span>
          </div>
          {event.venues?.name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="line-clamp-1">{event.venues.name}</span>
            </div>
          )}
        </div>

        {/* Fee + Status row */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span
            className={`badge-base text-xs ${
              event.fee === 0 ? "badge-success" : "badge-warning"
            }`}
          >
            {feeLabel}
          </span>
          <span
            className={`badge-base text-xs ${
              isOpen ? "badge-success" : "badge-neutral"
            }`}
          >
            {isOpen ? "Open" : "Closed"}
          </span>
        </div>

        {/* CTA */}
        <Link
          href={
            isOpen
              ? `/dashboard/${dept}/student/register/${event.id}`
              : `/events/${event.id}`
          }
          className="btn-primary text-sm py-2 mt-1 text-center"
        >
          {isOpen ? "Register Now" : "View Details"}
          <ArrowRight className="w-3.5 h-3.5 ml-1.5 inline" />
        </Link>
      </div>
    </motion.div>
  );
}
