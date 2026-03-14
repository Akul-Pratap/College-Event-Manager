/**
 * lib/clerk.ts — Role & department helpers for Clerk in Next.js App Router
 * LTSU College Event Management System
 *
 * Usage (Server Component / Server Action):
 *   import { getCurrentRole, getCurrentDepartment, requireRole } from "@/lib/clerk";
 *
 * Usage (Client Component):
 *   import { useRole, useDepartment } from "@/lib/clerk";
 */

"server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  canApproveEvents as canApproveEventsPolicy,
  canCreateEvents as canCreateEventsPolicy,
  canEditMoneyCollection as canEditMoneyCollectionPolicy,
  canScanQR as canScanQRPolicy,
  canViewMoneyCollection as canViewMoneyCollectionPolicy,
} from "@/lib/role-policy";
import type { UserRole } from "@/lib/role-policy";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type { UserRole } from "@/lib/role-policy";

export interface ClerkUserMetadata {
  role: UserRole;
  secondary_role?: UserRole;  // optional second role, e.g. faculty_coordinator who is also class_incharge
  department: string;        // slug, e.g. "computer-science"
  department_id: string;     // UUID from Supabase
  year?: string;             // e.g. "2nd Year"
  branch?: string;           // e.g. "CSE"
  section?: string;          // e.g. "A"
  supabase_user_id?: string; // UUID from Supabase users table
}

/** Returns true if the user holds the given role as primary OR secondary role. */
export function hasRole(meta: ClerkUserMetadata, role: UserRole): boolean {
  return meta.role === role || meta.secondary_role === role;
}

/** Returns all roles a user holds (primary + secondary if set). */
export function getUserRoles(meta: ClerkUserMetadata): UserRole[] {
  return meta.secondary_role
    ? [meta.role, meta.secondary_role]
    : [meta.role];
}

// ─────────────────────────────────────────────────────────────────────────────
// Server-Side Helpers (App Router — Server Components & Route Handlers)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current user's full Clerk metadata.
 * Returns null if not authenticated or metadata is incomplete.
 */
export async function getCurrentUserMetadata(): Promise<ClerkUserMetadata | null> {
  const { sessionClaims } = await auth();
  if (!sessionClaims) return null;

  const metadata = sessionClaims.metadata as Partial<ClerkUserMetadata> | undefined;
  if (!metadata?.role || !metadata?.department) return null;

  return metadata as ClerkUserMetadata;
}

/**
 * Get the current user's role.
 * Returns null if not authenticated.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const meta = await getCurrentUserMetadata();
  return meta?.role ?? null;
}

/**
 * Get the current user's department slug (e.g. "computer-science").
 * Returns null if not authenticated.
 */
export async function getCurrentDepartment(): Promise<string | null> {
  const meta = await getCurrentUserMetadata();
  return meta?.department ?? null;
}

/**
 * Get the current user's Supabase department_id UUID.
 * Returns null if not authenticated or not set.
 */
export async function getCurrentDepartmentId(): Promise<string | null> {
  const meta = await getCurrentUserMetadata();
  return meta?.department_id ?? null;
}

/**
 * Get the current user's Clerk userId.
 * Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the current user's Supabase user UUID from Clerk metadata.
 * Returns null if not set.
 */
export async function getSupabaseUserId(): Promise<string | null> {
  const meta = await getCurrentUserMetadata();
  return meta?.supabase_user_id ?? null;
}

/**
 * Get the full Clerk User object for the current session.
 * Includes email, name, profile image, etc.
 * Returns null if not authenticated.
 */
export async function getClerkUser() {
  const user = await currentUser();
  return user;
}

/**
 * Get a safe display name for the current user.
 * Falls back gracefully if name is not set.
 */
export async function getCurrentUserDisplayName(): Promise<string> {
  const user = await currentUser();
  if (!user) return "Unknown User";
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  return user.emailAddresses?.[0]?.emailAddress ?? "Unknown User";
}

/**
 * Get the current user's primary email address.
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const user = await currentUser();
  return user?.emailAddresses?.[0]?.emailAddress ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Access Control Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Require authentication. Redirects to /sign-in if not authenticated.
 * Use at the top of Server Components that need auth.
 */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  return userId;
}

/**
 * Require a specific role (or one of multiple roles).
 * Redirects to the user's own dashboard if role doesn't match.
 *
 * @example
 *   await requireRole("hod");
 *   await requireRole(["organizer", "faculty_coordinator"]);
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[]
): Promise<ClerkUserMetadata> {
  await requireAuth();

  const meta = await getCurrentUserMetadata();
  if (!meta) {
    redirect("/sign-in");
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(meta.role)) {
    // Redirect to the user's own dashboard instead of showing a 403
    redirect(`/dashboard/${meta.department}/${meta.role}`);
  }

  return meta;
}

/**
 * Require super_admin role. Redirects otherwise.
 */
export async function requireSuperAdmin(): Promise<ClerkUserMetadata> {
  return requireRole("super_admin");
}

/**
 * Require that the user belongs to a specific department.
 * Super admins bypass this check.
 *
 * @param targetDepartment  Department slug to enforce.
 */
export async function requireDepartment(
  targetDepartment: string
): Promise<ClerkUserMetadata> {
  await requireAuth();

  const meta = await getCurrentUserMetadata();
  if (!meta) {
    redirect("/sign-in");
  }

  // Super admin can access any department
  if (meta.role === "super_admin") return meta;

  if (meta.department !== targetDepartment) {
    redirect(`/dashboard/${meta.department}/${meta.role}`);
  }

  return meta;
}

/**
 * Require both a specific role AND department match.
 * Super admins bypass the department check.
 *
 * @example
 *   await requireRoleInDepartment(["hod"], "computer-science");
 */
export async function requireRoleInDepartment(
  allowedRoles: UserRole | UserRole[],
  targetDepartment: string
): Promise<ClerkUserMetadata> {
  const meta = await requireRole(allowedRoles);

  if (meta.role !== "super_admin" && meta.department !== targetDepartment) {
    redirect(`/dashboard/${meta.department}/${meta.role}`);
  }

  return meta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Classification Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the given role has staff-level privileges. */
export function isStaffRole(role: UserRole): boolean {
  return ["super_admin", "hod", "faculty_coordinator", "class_incharge"].includes(role);
}

/** Returns true if the given role is a student-tier role. */
export function isStudentRole(role: UserRole): boolean {
  return ["student", "organizer", "volunteer", "cr"].includes(role);
}

/** Returns true if the role can approve events. */
export function canApproveEvents(role: UserRole): boolean {
  return canApproveEventsPolicy(role);
}

/** Returns true if the role can create events. */
export function canCreateEvents(role: UserRole): boolean {
  return canCreateEventsPolicy(role);
}

/** Returns true if the role can scan QR codes. */
export function canScanQR(role: UserRole): boolean {
  return canScanQRPolicy(role);
}

/** Returns true if the role can view money collection reports. */
export function canViewMoneyCollection(role: UserRole): boolean {
  return canViewMoneyCollectionPolicy(role);
}

/** Returns true if the role can edit money collection data. */
export function canEditMoneyCollection(role: UserRole): boolean {
  return canEditMoneyCollectionPolicy(role);
}

export { ROLE_HIERARCHY, ROLE_PERMISSIONS };

/**
 * Get the dashboard home route for a given role and department.
 *
 * @example
 *   getDashboardRoute("hod", "computer-science")
 *   // => "/dashboard/computer-science/hod"
 */
export function getDashboardRoute(role: UserRole, department: string): string {
  return `/dashboard/${department}/${role}`;
}

/**
 * Get a human-readable label for a role.
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    hod: "Head of Department",
    faculty_coordinator: "Faculty Coordinator",
    class_incharge: "Class Incharge",
    organizer: "Student Organizer",
    volunteer: "Volunteer",
    cr: "Class Representative",
    student: "Student",
  };
  return labels[role] ?? role;
}

/**
 * Get a role badge color class for the given role.
 * Returns a Tailwind CSS class string.
 */
export function getRoleBadgeClass(role: UserRole): string {
  const classes: Record<UserRole, string> = {
    super_admin: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    hod: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    faculty_coordinator: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
    class_incharge: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
    organizer: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    volunteer: "bg-green-500/10 text-green-700 border-green-500/20",
    cr: "bg-teal-500/10 text-teal-700 border-teal-500/20",
    student: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  };
  return classes[role] ?? "bg-muted text-muted-foreground border-border";
}
