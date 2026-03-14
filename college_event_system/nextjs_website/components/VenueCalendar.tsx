"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  capacity: number;
  is_shared: boolean;
}

interface VenueCalendarProps {
  onVenueSelected?: (venueId: string, startTime: string, endTime: string) => void;
  initialVenueId?: string;
  excludeEventId?: string;
}

export function VenueCalendar({ onVenueSelected, initialVenueId, excludeEventId }: VenueCalendarProps) {
  const { getToken } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState(initialVenueId || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ available: boolean; conflicts: { event_title: string; start_time: string; end_time: string }[]; next_available: string | null } | null>(null);
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/venues`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setVenues(data.venues || []);
      } catch {}
    };
    loadVenues();
  }, [flaskUrl, getToken]);

  const checkAvailability = async () => {
    if (!selectedVenue || !startTime || !endTime) return;
    setChecking(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/venues/conflict-check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: selectedVenue, start_time: startTime, end_time: endTime, exclude_event_id: excludeEventId }),
      });
      const data = await res.json();
      setResult(data);
      if (data.available && onVenueSelected) {
        onVenueSelected(selectedVenue, startTime, endTime);
      }
    } catch {
      alert("Failed to check availability.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Select Venue</label>
        <select
          value={selectedVenue}
          onChange={(e) => { setSelectedVenue(e.target.value); setResult(null); }}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
        >
          <option value="">-- Choose a venue --</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name} (capacity: {v.capacity})</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Start Date &amp; Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); setResult(null); }}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">End Date &amp; Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); setResult(null); }}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
      </div>
      <button
        onClick={checkAvailability}
        disabled={!selectedVenue || !startTime || !endTime || checking}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
      >
        {checking ? "Checking..." : "Check Availability"}
      </button>

      {result && (
        <div className={`p-4 rounded-xl border text-sm ${result.available ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2 font-semibold mb-2">
            {result.available ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            <span className={result.available ? "text-green-700" : "text-red-700"}>
              {result.available ? "Venue is available!" : `${result.conflicts.length} conflict(s) detected`}
            </span>
          </div>
          {!result.available && result.next_available && (
            <div className="flex items-center gap-1.5 text-red-600 text-xs">
              <Clock className="w-3.5 h-3.5" />
              Next available: {new Date(result.next_available).toLocaleString("en-IN")}
            </div>
          )}
          {!result.available && result.conflicts.map((c, i) => (
            <div key={i} className="text-xs text-red-500 mt-1">Conflict: {c.event_title} ({c.start_time} – {c.end_time})</div>
          ))}
        </div>
      )}
    </div>
  );
}
