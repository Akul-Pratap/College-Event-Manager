"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Tag, ShieldCheck, Share2 } from "lucide-react";

export default function PublicEventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000/api";
        const res = await fetch(`${baseUrl}/events/${params.id}`);
        if (!res.ok) throw new Error("Event not available");
        const data = await res.json();
        const raw = data.event || data;
        setEvent({
          id: raw.id,
          title: raw.title,
          description: raw.description,
          bgImage: raw.bg_image || raw.image_url || null,
          date: raw.date,
          time: raw.start_time && raw.end_time ? `${raw.start_time} - ${raw.end_time}` : (raw.time || ""),
          venue: raw.venues?.name || raw.venue || "",
          category: raw.category || "Event",
          organizedBy: raw.clubs?.name || raw.organized_by || "Organizer",
          entryFee: raw.fee ?? 0,
        });
      } catch (e) {
        console.warn("Unable to load event", e);
        setError("Event not found or currently unavailable.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><span className="text-white">Loading...</span></div>;
  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-6">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Event Unavailable</h1>
          <p className="text-neutral-300">{error ?? "Event data is currently unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500/30">
      <div
        className="h-[50vh] min-h-[400px] w-full bg-cover bg-center relative"
        style={event.bgImage ? { backgroundImage: `url(${event.bgImage})` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
        <div className="absolute inset-0 bg-indigo-900/20 mix-blend-overlay" />
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-32 relative z-10 pb-20">
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wider uppercase text-indigo-300">
                <span className="bg-indigo-500/20 px-3 py-1 rounded-full">{event.category}</span>
                <span className="bg-white/10 px-3 py-1 rounded-full">{event.organizedBy}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-2">{event.title}</h1>
              <p className="text-neutral-400 text-lg leading-relaxed">
                {event.description}
              </p>
            </div>
            
            <div className="w-full md:w-auto flex-shrink-0 space-y-4">
              <button className="w-full md:w-64 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                Register Now
                <ShieldCheck className="w-5 h-5" />
              </button>
              <button className="w-full md:w-64 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-8 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" /> Share Event
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center gap-4 text-neutral-300">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Calendar className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-neutral-500 font-medium">Date</p>
                <p className="font-semibold">{event.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-neutral-300">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-neutral-500 font-medium">Time</p>
                <p className="font-semibold">{event.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-neutral-300">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><MapPin className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-neutral-500 font-medium">Venue</p>
                <p className="font-semibold">{event.venue}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-neutral-300">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Tag className="w-6 h-6" /></div>
              <div>
                <p className="text-sm text-neutral-500 font-medium">Entry Fee</p>
                <p className="font-semibold text-emerald-400 font-mono">₹{event.entryFee}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
