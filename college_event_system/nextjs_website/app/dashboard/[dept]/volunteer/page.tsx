"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  QrCode,
  UserCheck,
  WifiOff,
  FileText,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
} from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  date: string;
  status: string;
  venues?: { name: string };
}

interface AttendanceStats {
  total_scanned: number;
  total_manual: number;
  events_assigned: number;
}

export default function VolunteerDashboard() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const dept = params?.dept as string;

  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total_scanned: 0,
    total_manual: 0,
    events_assigned: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [eventsRes, statsRes] = await Promise.all([
          fetch(`${flaskUrl}/api/events?status=live`, { headers }),
          fetch(`${flaskUrl}/api/volunteer/stats`, { headers }).catch(() => null),
        ]);

        if (eventsRes.ok) {
          const data = await eventsRes.json();
          setEvents(data.events ?? []);
        }

        if (statsRes?.ok) {
          const data = await statsRes.json();
          setStats(data.stats ?? stats);
        }
      } catch (err) {
        console.error("Failed to load volunteer data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaskUrl, getToken]);

  const QUICK_ACTIONS = [
    {
      label: "QR Scanner",
      href: `/dashboard/${dept}/volunteer/scanner`,
      icon: QrCode,
      color: "bg-primary/10 text-primary",
      desc: "Scan student QR codes at event gate",
      disabled: !isOnline,
    },
    {
      label: "Manual Attendance",
      href: `/dashboard/${dept}/volunteer/scanner?mode=manual`,
      icon: UserCheck,
      color: "bg-green-500/10 text-green-600",
      desc: "Mark attendance manually by roll number",
      disabled: false,
    },
    {
      label: "Offline Mode",
      href: `/dashboard/${dept}/volunteer/offline`,
      icon: WifiOff,
      color: "bg-orange-500/10 text-orange-600",
      desc: "Fail-secure offline attendance mode",
      disabled: false,
    },
    {
      label: "Duty Leave",
      href: `/dashboard/${dept}/volunteer/duty-leave`,
      icon: FileText,
      color: "bg-blue-500/10 text-blue-600",
      desc: "Submit your duty leave request",
      disabled: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff className="w-4 h-4 inline mr-2" />
          You are offline. QR scanning is disabled. Use Manual or Offline mode.
        </div>
      )}

      <div className="page-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="page-header"
        >
          <h1 className="page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-600" />
            Volunteer Dashboard
          </h1>
          <p className="page-subtitle">
            Scan QR codes, mark attendance, and manage duty leaves.
          </p>
        </motion.div>

        {/* Connection Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-xl p-4 mb-6 border ${
            isOnline
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
          }`}
        >
          <div className="flex items-center gap-3">
            {isOnline ? (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <div>
              <p
                className={`font-semibold text-sm ${
                  isOnline ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"
                }`}
              >
                {isOnline ? "✓ Online — All Systems Ready" : "⚠ Offline Mode Active"}
              </p>
              <p
                className={`text-xs ${
                  isOnline ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                }`}
              >
                {isOnline
                  ? "QR scanner and manual attendance are available."
                  : "QR scanning disabled. Use Manual or Offline attendance modes."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            {
              label: "QR Scanned",
              value: stats.total_scanned,
              icon: QrCode,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Manual Entry",
              value: stats.total_manual,
              icon: UserCheck,
              color: "text-green-600",
              bg: "bg-green-500/10",
            },
            {
              label: "Events Assigned",
              value: stats.events_assigned || events.length,
              icon: Calendar,
              color: "text-violet-600",
              bg: "bg-violet-500/10",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card-base p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">
                  {label}
                </span>
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "—" : value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color, desc, disabled }) => (
              <motion.div key={label} whileHover={{ scale: disabled ? 1 : 1.02 }}>
                {disabled ? (
                  <div
                    className="card-base p-5 flex items-start gap-4 opacity-50 cursor-not-allowed"
                  >
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                      <span className="inline-block mt-2 px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-semibold rounded uppercase">
                        Requires Connection
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={href}
                    className="card-hover p-5 flex items-start gap-4 block"
                  >
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Active Events */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Live Events
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-base p-4 space-y-2">
                  <div className="skeleton h-5 w-2/3 rounded" />
                  <div className="skeleton h-4 w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="card-base p-12 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">No live events</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back when events are happening to scan attendees.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="card-base p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {event.venues?.name && (
                        <span className="truncate">{event.venues.name}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/${dept}/volunteer/scanner?event=${event.id}`}
                    className="btn-primary text-xs py-2 px-4 shrink-0"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Scan
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-muted/30 border border-border"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            <Shield className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
            <strong>Fail-Secure Mode:</strong> If you lose internet connection
            during an event, the system automatically enters offline mode to
            maintain gate security. All students will be denied entry until
            connectivity is restored or manual verification is performed by
            authorized staff.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
