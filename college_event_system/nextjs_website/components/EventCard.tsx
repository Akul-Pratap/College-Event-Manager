"use client";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, Tag, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Event {
  id: string;
  title: string;
  date: string;
  fee: number;
  payment_type: string;
  status: string;
  venues?: { name: string };
  clubs?: { name: string };
  departments?: { name: string };
  max_responses?: number | null;
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
    <div className="flex gap-1.5 text-xs">
      {([["d", time.d], ["h", time.h], ["m", time.m], ["s", time.s]] as [string, number][]).map(([label, val]) => (
        <div key={label} className="flex flex-col items-center bg-primary/10 rounded px-1.5 py-0.5">
          <span className="font-bold font-mono text-primary text-xs">{String(val).padStart(2, "0")}</span>
          <span className="text-muted-foreground text-[9px] uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  live: "bg-green-100 text-green-700 border-green-200",
  pending_approval: "bg-yellow-100 text-yellow-700 border-yellow-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  live: "Live",
  pending_approval: "Pending",
  draft: "Draft",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function EventCard({ event, dept, showRegisterButton = false }: { event: Event; dept: string; showRegisterButton?: boolean }) {
  const isUpcoming = event.status === "live" && new Date(event.date) > new Date();
  const statusColor = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
  const statusLabel = STATUS_LABELS[event.status] || event.status;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-snug">{event.title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {event.venues?.name && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{event.venues.name}</span>
          </div>
        )}
        {event.clubs?.name && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{event.clubs.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          <span className={event.fee === 0 ? "text-green-600 font-medium" : "text-foreground font-medium"}>
            {event.fee === 0 ? "Free" : `₹${event.fee}`}
          </span>
        </div>
      </div>

      {isUpcoming && (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <Countdown targetDate={event.date} />
        </div>
      )}

      {showRegisterButton && event.status === "live" && (
        <Link
          href={`/dashboard/${dept}/student/register/${event.id}`}
          className="mt-auto w-full text-center bg-primary text-primary-foreground text-xs font-medium rounded-lg py-2 hover:bg-primary/90 transition-colors"
        >
          Register Now
        </Link>
      )}
    </motion.div>
  );
}
