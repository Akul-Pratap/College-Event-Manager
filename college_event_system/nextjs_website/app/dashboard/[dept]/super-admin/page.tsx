"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  Building2,
  TrendingUp,
  Shield,
  Activity,
  MapPin,
  AlertTriangle,
} from "lucide-react";

interface Stats {
  total_users: number;
  total_events: number;
  total_departments: number;
  total_registrations: number;
  live_events: number;
  pending_approvals: number;
  total_venues: number;
  flagged_logins: number;
}

interface Department {
  id: string;
  name: string;
  code: string;
  user_count?: number;
  event_count?: number;
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  departments?: { name: string };
  clubs?: { name: string };
}

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="card-base p-5"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </motion.div>
);

export default function SuperAdminDashboard() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, deptRes, eventsRes] = await Promise.all([
        fetch(`${flaskUrl}/api/admin/stats`, { headers }).catch(() => null),
        fetch(`${flaskUrl}/api/departments`, { headers }).catch(() => null),
        fetch(`${flaskUrl}/api/events?limit=8`, { headers }).catch(() => null),
      ]);

      if (statsRes?.ok) setStats(await statsRes.json().then((d) => d.stats ?? d));
      if (deptRes?.ok) setDepartments(await deptRes.json().then((d) => d.departments ?? []));
      if (eventsRes?.ok) setRecentEvents(await eventsRes.json().then((d) => d.events ?? []));

      setLoading(false);
    }
    load();
  }, [flaskUrl, getToken]);

  const statusColor = (s: string) => {
    switch (s) {
      case "live": return "badge-success";
      case "pending_approval": return "badge-warning";
      case "rejected": return "badge-danger";
      default: return "badge-neutral";
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-600" />
          Super Admin Dashboard
        </h1>
        <p className="page-subtitle">University-wide analytics and system overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Users"          value={stats?.total_users ?? 0}          icon={Users}         color="bg-blue-500/10 text-blue-600"    delay={0.05} />
        <StatCard label="Total Events"         value={stats?.total_events ?? 0}         icon={Calendar}      color="bg-green-500/10 text-green-600"  delay={0.10} />
        <StatCard label="Departments"          value={stats?.total_departments ?? 0}    icon={Building2}     color="bg-violet-500/10 text-violet-600" delay={0.15} />
        <StatCard label="Registrations"        value={stats?.total_registrations ?? 0}  icon={TrendingUp}    color="bg-orange-500/10 text-orange-600" delay={0.20} />
        <StatCard label="Live Events"          value={stats?.live_events ?? 0}          icon={Activity}      color="bg-emerald-500/10 text-emerald-600" delay={0.25} />
        <StatCard label="Pending Approvals"    value={stats?.pending_approvals ?? 0}    icon={AlertTriangle} color="bg-yellow-500/10 text-yellow-600"  delay={0.30} />
        <StatCard label="Venues"               value={stats?.total_venues ?? 0}         icon={MapPin}        color="bg-cyan-500/10 text-cyan-600"     delay={0.35} />
        <StatCard label="Flagged Logins"       value={stats?.flagged_logins ?? 0}       icon={Shield}        color="bg-red-500/10 text-red-600"       delay={0.40} />
      </div>

      {/* Departments Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="card-base p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-violet-500" />
          Departments
        </h2>

        {departments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No departments found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((dept, i) => (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{dept.name}</p>
                  <p className="text-xs text-muted-foreground uppercase mt-0.5">
                    {dept.code}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {dept.user_count != null && (
                    <p>{dept.user_count} users</p>
                  )}
                  {dept.event_count != null && (
                    <p>{dept.event_count} events</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="card-base p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Recent Events
        </h2>

        {recentEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events found.</p>
        ) : (
          <div className="table-container">
            <table className="table-base">
              <thead className="table-header">
                <tr>
                  <th className="table-th">Event</th>
                  <th className="table-th">Department</th>
                  <th className="table-th">Club</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id} className="table-row-hover">
                    <td className="table-td font-medium text-foreground">
                      {event.title}
                    </td>
                    <td className="table-td text-muted-foreground">
                      {event.departments?.name ?? "—"}
                    </td>
                    <td className="table-td text-muted-foreground">
                      {event.clubs?.name ?? "—"}
                    </td>
                    <td className="table-td text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="table-td">
                      <span className={`badge-base ${statusColor(event.status)}`}>
                        {event.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { href: "super-admin/users",  label: "Manage Users",  icon: Users,    color: "bg-blue-500/10 text-blue-700" },
          { href: "super-admin/privilege-escalation", label: "Privilege Escalation", icon: Shield, color: "bg-red-500/10 text-red-700" },
          { href: "super-admin/venues", label: "Venue Calendar", icon: MapPin,   color: "bg-cyan-500/10 text-cyan-700" },
          { href: "../organizer",       label: "All Events",     icon: Calendar, color: "bg-green-500/10 text-green-700" },
        ].map(({ href, label, icon: Icon, color }) => (
          <a
            key={label}
            href={href}
            className={`card-hover p-5 flex items-center gap-3 ${color} font-semibold text-sm`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </a>
        ))}
      </motion.div>
    </div>
  );
}
