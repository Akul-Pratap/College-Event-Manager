"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart2,
  MessageSquare,
  Image,
  FileText,
  Zap,
  DollarSign,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  status: string;
  fee: number;
  max_responses: number | null;
  venues?: { name: string };
}

interface Stats {
  total_events: number;
  live_events: number;
  pending_events: number;
  total_registrations: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; class: string; icon: React.ElementType }
> = {
  live: { label: "Live", class: "badge-success", icon: CheckCircle },
  pending_approval: {
    label: "Pending Approval",
    class: "badge-warning",
    icon: Clock,
  },
  draft: { label: "Draft", class: "badge-neutral", icon: FileText },
  rejected: { label: "Rejected", class: "badge-danger", icon: AlertTriangle },
  completed: { label: "Completed", class: "badge-neutral", icon: CheckCircle },
};

const QUICK_ACTIONS = [
  {
    label: "Create Event",
    href: "create-event",
    icon: Plus,
    color: "bg-primary/10 text-primary",
    desc: "Start a new event with venue booking",
  },
  {
    label: "Form Builder",
    href: "form-builder",
    icon: FileText,
    color: "bg-violet-500/10 text-violet-600",
    desc: "Build Google-Form style registration forms",
  },
  {
    label: "WhatsApp Drafter",
    href: "whatsapp",
    icon: MessageSquare,
    color: "bg-green-500/10 text-green-600",
    desc: "Generate event announcements instantly",
  },
  {
    label: "Gallery",
    href: "gallery",
    icon: Image,
    color: "bg-orange-500/10 text-orange-600",
    desc: "Upload signed notices & event photos",
  },
  {
    label: "Duty Leave",
    href: "duty-leaves",
    icon: Calendar,
    color: "bg-blue-500/10 text-blue-600",
    desc: "Submit and track duty leave requests",
  },
  {
    label: "Panic Button",
    href: "panic",
    icon: Zap,
    color: "bg-red-500/10 text-red-600",
    desc: "Send emergency alert to all registrants",
  },
];

export default function OrganizerDashboard() {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_events: 0,
    live_events: 0,
    pending_events: 0,
    total_registrations: 0,
  });
  const [loading, setLoading] = useState(true);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const myEvents: Event[] = data.events ?? [];
        setEvents(myEvents);
        setStats({
          total_events: myEvents.length,
          live_events: myEvents.filter((e) => e.status === "live").length,
          pending_events: myEvents.filter((e) =>
            e.status.includes("pending")
          ).length,
          total_registrations: 0,
        });
      } catch (err) {
        console.error("Failed to load organizer data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [flaskUrl, getToken]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Organizer Dashboard</h1>
        <p className="page-subtitle">
          Manage your events, forms, payments, and volunteers.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Events",
            value: stats.total_events,
            icon: Calendar,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "Live Now",
            value: stats.live_events,
            icon: CheckCircle,
            color: "text-green-600",
            bg: "bg-green-500/10",
          },
          {
            label: "Pending Approval",
            value: stats.pending_events,
            icon: Clock,
            color: "text-yellow-600",
            bg: "bg-yellow-500/10",
          },
          {
            label: "Registrations",
            value: stats.total_registrations,
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-500/10",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card-base p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">
                {label}
              </span>
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">
              {loading ? (
                <span className="skeleton h-8 w-12 rounded inline-block" />
              ) : (
                value
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color, desc }) => (
              <motion.div
                key={label}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.15 }}
              >
                <Link
                  href={href}
                  className="card-base p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              My Events
            </h2>
            <Link href="create-event" className="btn-primary text-sm py-2 px-4">
              <Plus className="w-4 h-4" />
              New Event
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-base p-5 space-y-2">
                  <div className="skeleton h-5 w-2/3 rounded" />
                  <div className="skeleton h-4 w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="card-base p-12 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">
                No events yet
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first event to get started.
              </p>
              <Link href="create-event" className="btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Create Event
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => {
                const statusCfg =
                  STATUS_CONFIG[event.status] ?? STATUS_CONFIG["draft"];
                const StatusIcon = statusCfg.icon;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    className="card-base p-5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate mb-1">
                          {event.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(event.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {event.venues?.name && (
                            <span>{event.venues.name}</span>
                          )}
                          {event.fee > 0 && (
                            <span className="font-medium text-foreground">
                              ₹{event.fee}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`badge-base ${statusCfg.class} shrink-0 flex items-center gap-1`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Event Actions */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                      <Link
                        href={`form-builder/${event.id}`}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Form
                      </Link>
                      <Link
                        href={`responses/${event.id}`}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        <BarChart2 className="w-3.5 h-3.5" />
                        Responses
                      </Link>
                      <Link
                        href={`payments/${event.id}`}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Payments
                      </Link>
                      <Link
                        href={`collection/${event.id}`}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Collection
                      </Link>
                      <Link
                        href={`whatsapp/${event.id}`}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </Link>
                      <Link
                        href={`panic/${event.id}`}
                        className="btn-danger-outline text-xs py-1.5 px-3 ml-auto"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Panic
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
