"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Calendar, Download } from "lucide-react";
import { MoneyCollection } from "@/components/MoneyCollection";

interface Event {
  id: string;
  title: string;
  date: string;
  status: string;
  venues?: { name: string };
}

export default function CRCollectionPage() {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/events?status=live`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        const liveEvents: Event[] = data.events ?? [];
        setEvents(liveEvents);
        if (!selectedEventId && liveEvents.length > 0) {
          setSelectedEventId(liveEvents[0].id);
        }
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flaskUrl, getToken]);

  const exportCsv = async () => {
    if (!selectedEventId) return;
    const token = await getToken();
    const res = await fetch(`${flaskUrl}/api/events/${selectedEventId}/money-collection`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    const rows = (data.collection ?? []) as Array<Record<string, unknown>>;

    const header = ["year", "branch", "section", "amount_collected"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((k) => {
            const v = r[k];
            const s = v == null ? "" : String(v);
            return `"${s.replace(/"/g, '""')}"`
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `money-collection-${selectedEventId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container space-y-6">
      <div className="page-header">
        <h1 className="page-title">CR Money Collection</h1>
        <p className="page-subtitle">
          Update and export money collection for your class (role- and class-isolated).
        </p>
      </div>

      <div className="card-base p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <label className="text-sm font-medium text-foreground">Live Event</label>
        </div>

        {loading ? (
          <div className="skeleton h-10 w-72 rounded-lg" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No live events found.</p>
        ) : (
          <div className="flex gap-2 items-center">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="input-base text-sm h-10"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <button onClick={exportCsv} className="btn-outline h-10 text-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {selectedEventId ? (
        <div className="card-base p-5">
          <MoneyCollection eventId={selectedEventId} />
        </div>
      ) : (
        <div className="card-base p-10 text-center text-muted-foreground text-sm">
          Select a live event to view money collection.
        </div>
      )}
    </div>
  );
}

