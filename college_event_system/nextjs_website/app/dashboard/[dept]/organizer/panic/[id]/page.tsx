"use client";

import { PanicButton } from "@/components/PanicButton";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

export default function PanicPage({ params }: { params: { dept: string; id: string } }) {
  const [eventTitle, setEventTitle] = useState("Loading...");
  const { getToken } = useAuth();
  
  useEffect(() => {
    async function fetchEvent() {
      try {
        const token = await getToken();
        // Fallback to localhost if env missing
        const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000";
        const res = await fetch(`${flaskUrl}/api/events/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEventTitle(data.title || "Unknown Event");
        } else {
          setEventTitle("Unknown Event");
        }
      } catch (e) {
        setEventTitle("Unknown Event");
      }
    }
    fetchEvent();
  }, [params.id, getToken]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-red-600">Emergency Panic Button</h1>
        <p className="text-lg text-muted-foreground">
          Use this button <strong className="text-foreground">ONLY</strong> in severe emergencies to notify all attendees of an ongoing crisis.
        </p>
      </div>
      
      <div className="bg-red-500/5 hover:bg-red-500/10 transition-colors border-2 border-red-500/20 rounded-3xl p-10 flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-red-600">Target Event: {eventTitle}</h2>
          <p className="text-red-500 max-w-md mx-auto leading-relaxed">
            Warning: The panic button will instantly dispatch an emergency push notification and SMS to all registered attendees and campus security. This action is irreversible and logged.
          </p>
        </div>
        
        <PanicButton eventId={params.id} eventTitle={eventTitle} />
      </div>
    </div>
  );
}
