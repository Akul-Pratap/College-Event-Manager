"use client";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Pencil, Save, X } from "lucide-react";

interface CollectionRow {
  id?: string;
  year: string;
  branch: string;
  section: string;
  amount_collected: number;
  collected_by?: string;
}

interface MoneyCollectionProps {
  eventId: string;
  readOnly?: boolean;
}

export function MoneyCollection({ eventId, readOnly = false }: MoneyCollectionProps) {
  const { getToken } = useAuth();
  const [collection, setCollection] = useState<CollectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [profile, setProfile] = useState<{
    role?: string;
    secondary_role?: string;
    year?: string;
    branch?: string;
    section?: string;
  } | null>(null);
  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  const role = profile?.role ?? "";
  const secondaryRole = profile?.secondary_role ?? "";
  const myYear = profile?.year ?? "";
  const myBranch = profile?.branch ?? "";
  const mySection = profile?.section ?? "";

  const isRole = (...roles: string[]) => roles.includes(role) || roles.includes(secondaryRole);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Prefer backend profile as the source of truth for role/year/branch/section
        // (Clerk metadata can be missing/mismatched during setup).
        const meRes = await fetch(`${flaskUrl}/api/auth/me`, { headers }).catch(() => null);
        if (meRes?.ok) {
          const me = await meRes.json().catch(() => null);
          setProfile(me?.user ?? null);
        }

        const res = await fetch(`${flaskUrl}/api/events/${eventId}/money-collection`, {
          headers,
        });
        const data = await res.json();
        setCollection(data.collection || []);
      } catch {
        setCollection([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, flaskUrl, getToken]);

  const canEdit = (row: CollectionRow) => {
    if (readOnly) return false;
    if (isRole("organizer")) return true;
    if (isRole("class_incharge", "faculty_coordinator", "cr")) {
      return row.year === myYear && row.branch === myBranch && row.section === mySection;
    }
    return false;
  };

  const saveEdit = async (row: CollectionRow) => {
    try {
      const token = await getToken();
      await fetch(`${flaskUrl}/api/events/${eventId}/money-collection`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, amount_collected: parseFloat(editAmount) }),
      });
      setCollection((prev) =>
        prev.map((r) => r.year === row.year && r.branch === row.branch && r.section === row.section
          ? { ...r, amount_collected: parseFloat(editAmount) } : r)
      );
      setEditRow(null);
    } catch {
      alert("Failed to save.");
    }
  };

  const createMyEntry = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/events/${eventId}/money-collection`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount_collected: 0 }),
      });
      const data = await res.json().catch(() => null);
      const row = data?.collection ? [data.collection] : [];
      setCollection(row);
    } catch {
      alert("Failed to create entry.");
    }
  };

  const total = collection.reduce((sum, r) => sum + (r.amount_collected || 0), 0);

  if (loading) return <div className="text-sm text-muted-foreground">Loading collection data...</div>;

  return (
    <div className="space-y-4">
      {!readOnly && ["class_incharge", "cr"].includes(role) && collection.length === 0 && (
        <div className="rounded-xl border border-border p-4 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No collection entry exists for your class yet. Create it to start tracking.
          </p>
          <button onClick={createMyEntry} className="btn-primary mt-3 text-sm py-2">
            Create My Class Entry
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Year", "Branch", "Section", "Amount Collected (₹)", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {collection.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No collection data yet.</td></tr>
            )}
            {collection.map((row, i) => {
              const rowKey = `${row.year}-${row.branch}-${row.section}`;
              const isEditing = editRow === rowKey;
              return (
                <tr key={i} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">{row.year}</td>
                  <td className="px-4 py-3">{row.branch}</td>
                  <td className="px-4 py-3">{row.section}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="border border-border rounded px-2 py-1 w-28 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">₹{(row.amount_collected || 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit(row) && (
                      isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(row)} className="text-green-600 hover:text-green-700"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditRow(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditRow(rowKey); setEditAmount(String(row.amount_collected || 0)); }} className="text-primary hover:text-primary/70">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {collection.length > 0 && (
            <tfoot className="bg-muted/30">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-semibold text-sm">Total</td>
                <td className="px-4 py-3 font-bold text-primary">₹{total.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
