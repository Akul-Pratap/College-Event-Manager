"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { EventCard } from "./EventCard";

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
}

interface AIFeedProps {
  dept: string;
}

export function AIFeed({ dept }: AIFeedProps) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/ai/feed`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        setEvents(data.feed || []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    loadFeed();
  }, [flaskUrl, getToken]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/50 rounded-xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No personalized recommendations yet. Browse all events to get started.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">AI Recommendations</span>
        <span className="text-xs text-muted-foreground">· personalized for you</span>
      </div>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        {events.map((event) => (
          <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <EventCard event={event} dept={dept} showRegisterButton />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
