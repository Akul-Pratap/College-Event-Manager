"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, Shield, Users } from "lucide-react";
import { ROLE_PERMISSIONS, type UserRole } from "@/lib/role-policy";

type DashboardRole = "super_admin" | "hod";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  secondary_role?: UserRole | null;
  department_id?: string | null;
  departments?: { name: string; code: string };
}

type PermissionKey = keyof (typeof ROLE_PERMISSIONS)[UserRole];

const ALL_ROLES: UserRole[] = [
  "super_admin",
  "hod",
  "faculty_coordinator",
  "class_incharge",
  "organizer",
  "volunteer",
  "cr",
  "student",
];

const HOD_ASSIGNABLE_ROLES: UserRole[] = [
  "faculty_coordinator",
  "class_incharge",
  "organizer",
  "volunteer",
  "cr",
  "student",
];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  approveEvents: "Approve Events",
  createEvents: "Create Events",
  scanQR: "Scan QR",
  viewMoneyCollection: "View Money",
  editMoneyCollection: "Edit Money",
};

function titleFromRole(role: string | null | undefined): string {
  if (!role) return "none";
  return role.replace(/_/g, " ");
}

function mergeRolePermissions(primary: UserRole, secondary?: UserRole | null) {
  const base = ROLE_PERMISSIONS[primary];
  if (!secondary) return base;
  const extra = ROLE_PERMISSIONS[secondary];
  return {
    approveEvents: base.approveEvents || extra.approveEvents,
    createEvents: base.createEvents || extra.createEvents,
    scanQR: base.scanQR || extra.scanQR,
    viewMoneyCollection: base.viewMoneyCollection || extra.viewMoneyCollection,
    editMoneyCollection: base.editMoneyCollection || extra.editMoneyCollection,
  };
}

export default function PrivilegeEscalationPage({
  dashboardRole,
}: {
  dashboardRole: DashboardRole;
}) {
  const { getToken } = useAuth();
  const params = useParams();
  const dept = params?.dept as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [drafts, setDrafts] = useState<
    Record<string, { role: UserRole; secondary_role: UserRole | "" }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const flaskUrl =
    process.env.NEXT_PUBLIC_FLASK_API_URL ?? "http://localhost:5000";

  const editableRoles =
    currentUser?.role === "hod" ? HOD_ASSIGNABLE_ROLES : ALL_ROLES;

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const token = await getToken();
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [meRes, usersRes] = await Promise.all([
          fetch(`${flaskUrl}/api/auth/me`, { headers }),
          fetch(`${flaskUrl}/api/users`, { headers }),
        ]);

        const meData = await meRes.json();
        const usersData = await usersRes.json();

        if (!meRes.ok) {
          throw new Error(meData.error ?? "Could not load your profile.");
        }
        if (!usersRes.ok) {
          throw new Error(usersData.error ?? "Could not load users.");
        }

        setCurrentUser(meData.user ?? null);
        setUsers(usersData.users ?? []);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load privilege escalation data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [flaskUrl, getToken]);

  const managedUsers = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === "super_admin") {
      return users.filter((u) => u.id !== currentUser.id);
    }

    if (currentUser.role === "hod") {
      return users.filter(
        (u) =>
          u.id !== currentUser.id &&
          u.department_id === currentUser.department_id &&
          !["super_admin", "hod"].includes(u.role)
      );
    }

    return [];
  }, [currentUser, users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return managedUsers.filter((u) => {
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [managedUsers, roleFilter, search]);

  function getDraft(user: User) {
    return (
      drafts[user.id] ?? {
        role: user.role,
        secondary_role: user.secondary_role ?? "",
      }
    );
  }

  function updateDraft(
    userId: string,
    patch: Partial<{ role: UserRole; secondary_role: UserRole | "" }>
  ) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        role: patch.role ?? prev[userId]?.role ?? "student",
        secondary_role:
          patch.secondary_role ?? prev[userId]?.secondary_role ?? "",
      },
    }));
  }

  async function saveUser(user: User) {
    const draft = getDraft(user);

    if (draft.secondary_role && draft.secondary_role === draft.role) {
      setError("Primary role and secondary role cannot be the same.");
      return;
    }

    setSavingId(user.id);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      const res = await fetch(`${flaskUrl}/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: draft.role,
          secondary_role: draft.secondary_role || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Update failed.");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...data.user } : u))
      );
      setSuccess(
        `Updated ${user.name} to ${titleFromRole(draft.role)}${
          draft.secondary_role ? ` + ${titleFromRole(draft.secondary_role)}` : ""
        }`
      );
    } catch (err: any) {
      setError(err?.message ?? "Could not update user.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/${dept}/${dashboardRole}`}
              className="text-sm text-muted-foreground hover:text-foreground transition"
            >
              ← Back
            </Link>
            <h1 className="font-semibold text-foreground">Privilege Escalation</h1>
          </div>
          <div className="text-xs text-muted-foreground">
            Managing {managedUsers.length} users under your scope
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">Role-based access control</p>
              <p className="text-xs text-muted-foreground mt-1">
                Super admin can update all users. HOD can update only users in the same
                department except HOD and super admin.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-3.5 h-3.5" />
              Server-enforced scope
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search user by name/email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[220px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All roles</option>
            {editableRoles.map((r) => (
              <option key={r} value={r}>
                {titleFromRole(r)}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">No manageable users found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const draft = getDraft(user);
              const merged = mergeRolePermissions(
                draft.role,
                draft.secondary_role || null
              );
              const unchanged =
                user.role === draft.role &&
                (user.secondary_role ?? "") === (draft.secondary_role ?? "");

              return (
                <div key={user.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {titleFromRole(user.role)}
                        {user.secondary_role
                          ? ` + ${titleFromRole(user.secondary_role)}`
                          : ""}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[280px]">
                      <select
                        value={draft.role}
                        onChange={(e) =>
                          updateDraft(user.id, { role: e.target.value as UserRole })
                        }
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {editableRoles.map((role) => (
                          <option key={role} value={role}>
                            {titleFromRole(role)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={draft.secondary_role}
                        onChange={(e) =>
                          updateDraft(user.id, {
                            secondary_role: e.target.value as UserRole | "",
                          })
                        }
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">no secondary role</option>
                        {editableRoles
                          .filter((role) => role !== draft.role)
                          .map((role) => (
                            <option key={role} value={role}>
                              {titleFromRole(role)}
                            </option>
                          ))}
                      </select>

                      <button
                        onClick={() => saveUser(user)}
                        disabled={savingId === user.id || unchanged}
                        className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition disabled:opacity-50"
                      >
                        {savingId === user.id ? "Saving..." : "Apply"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(PERMISSION_LABELS) as PermissionKey[]).map((key) => (
                      <span
                        key={key}
                        className={`text-[11px] px-2.5 py-1 rounded-full border ${
                          merged[key]
                            ? "bg-green-500/10 text-green-700 border-green-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {PERMISSION_LABELS[key]}: {merged[key] ? "yes" : "no"}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
