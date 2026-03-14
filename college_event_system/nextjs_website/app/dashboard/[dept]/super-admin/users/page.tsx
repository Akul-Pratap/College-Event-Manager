"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Users, Search, Shield, Loader2, Edit2, CheckCircle, X, ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  secondary_role?: string | null;
  roll_no: string | null;
  year: string | null;
  branch: string | null;
  section: string | null;
  departments?: { name: string; code: string };
  created_at: string;
}

const ROLES = ["super_admin", "hod", "faculty_coordinator", "class_incharge", "organizer", "volunteer", "cr", "student"];

export default function SuperAdminUsersPage() {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newSecondaryRole, setNewSecondaryRole] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flaskUrl = process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${flaskUrl}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data.users ?? []);
      } catch (err) {
        setError("Could not load users.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [flaskUrl, getToken]);

  async function updateRole(userId: string, role: string) {
    setUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role, secondary_role: newSecondaryRole || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role, secondary_role: newSecondaryRole || null } : u)));
      setSuccess(`Role updated to ${role}${newSecondaryRole ? ` + ${newSecondaryRole}` : ""}`);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roll_no?.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleColor: Record<string, string> = {
    super_admin: "bg-red-500/10 text-red-600",
    hod: "bg-orange-500/10 text-orange-600",
    faculty_coordinator: "bg-amber-500/10 text-amber-600",
    class_incharge: "bg-yellow-500/10 text-yellow-600",
    organizer: "bg-violet-500/10 text-violet-600",
    volunteer: "bg-blue-500/10 text-blue-600",
    cr: "bg-cyan-500/10 text-cyan-600",
    student: "bg-green-500/10 text-green-600",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href={`/dashboard/${dept}/super-admin`} className="text-sm text-muted-foreground hover:text-foreground transition">← Back</Link>
          <span className="font-bold text-foreground">User Management</span>
          {!loading && (
            <span className="text-sm text-muted-foreground">{users.length} total users</span>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search + Role filter */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, email, roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {!loading && (
          <p className="text-sm text-muted-foreground">
            Showing <strong>{filtered.length}</strong> of {users.length} users
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Roll No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user, i) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-accent/30 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground font-mono">{user.roll_no ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">{user.departments?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {editingUser?.id === user.id ? (
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                          </select>
                          <select
                            value={newSecondaryRole}
                            onChange={(e) => setNewSecondaryRole(e.target.value)}
                            className="px-2 py-1 rounded-lg border border-border bg-background text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">no secondary role</option>
                            {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${roleColor[user.role] ?? "bg-muted text-muted-foreground"}`}>
                            {user.role.replace(/_/g, " ")}
                          </span>
                          {user.secondary_role && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit opacity-75 ${roleColor[user.secondary_role] ?? "bg-muted text-muted-foreground"}`}>
                              +{user.secondary_role.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {editingUser?.id === user.id ? (
                          <>
                            <button
                              onClick={() => updateRole(user.id, newRole)}
                              disabled={updating || newRole === user.role}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
                            >
                              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Save
                            </button>
                            <button onClick={() => setEditingUser(null)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent transition">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setEditingUser(user); setNewRole(user.role); setNewSecondaryRole(user.secondary_role ?? ""); }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Role
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground text-sm">No users found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
