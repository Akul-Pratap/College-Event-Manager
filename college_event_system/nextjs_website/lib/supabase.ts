import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// ─────────────────────────────────────────────────────────────────────────────
// Public (anon) client — used on the client side
// Row Level Security enforced via Clerk JWT passed as Authorization header
// ─────────────────────────────────────────────────────────────────────────────

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated client — passes the Clerk JWT so Supabase RLS can
// verify the user's identity and enforce department isolation
// ─────────────────────────────────────────────────────────────────────────────

export function createAuthClient(clerkToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

type ClerkGetToken = (opts?: { template?: string }) => Promise<string | null>;

// Creates a Supabase client that injects a fresh Clerk token on every request.
// Use this in client components where `useAuth().getToken` is available.
export function createClerkSupabaseClient(getToken: ClerkGetToken): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await getToken({ template: "supabase" });
        const headers = new Headers(options?.headers);

        if (clerkToken) {
          headers.set("Authorization", `Bearer ${clerkToken}`);
        }

        return fetch(url, { ...options, headers });
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Service role client — used in Server Actions and API routes only
// Bypasses RLS — NEVER expose this to the browser
// ─────────────────────────────────────────────────────────────────────────────

export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_KEY is not set. This client must only be used server-side."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Types — matching the 22-table schema
// ─────────────────────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_id: string | null;
  created_at: string;
}

export interface User {
  id: string;
  clerk_id: string;
  name: string;
  roll_no: string | null;
  email: string;
  role: UserRole;
  department_id: string;
  year: string | null;
  branch: string | null;
  section: string | null;
  fcm_token: string | null;
  created_at: string;
}

export type UserRole =
  | "super_admin"
  | "hod"
  | "faculty_coordinator"
  | "class_incharge"
  | "organizer"
  | "volunteer"
  | "cr"
  | "student";

export interface Club {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  department_id: string;
  created_at: string;
}

export interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  designation: string | null;
  is_permanent: boolean;
  joined_at: string;
  users?: Partial<User>;
  clubs?: Partial<Club>;
}

export interface ClubJoinRequest {
  id: string;
  club_id: string;
  user_id: string;
  request_type: "permanent" | "event_only";
  status: "pending" | "approved" | "rejected";
  event_id: string | null;
  created_at: string;
  users?: Partial<User>;
  clubs?: Partial<Club>;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  venue_id: string;
  club_id: string;
  department_id: string;
  payment_type: "free" | "paid" | "cash";
  fee: number;
  status: EventStatus;
  form_open: string | null;
  form_close: string | null;
  max_responses: number | null;
  created_by: string | null;
  created_at: string;
  clubs?: Partial<Club>;
  venues?: Partial<Venue>;
  departments?: Partial<Department>;
}

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "live"
  | "rejected"
  | "completed"
  | "cancelled";

export interface Venue {
  id: string;
  name: string;
  capacity: number;
  department_id: string | null;
  is_shared: boolean;
  created_at: string;
}

export interface VenueBooking {
  id: string;
  venue_id: string;
  event_id: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  created_at: string;
  events?: Partial<Event>;
  venues?: Partial<Venue>;
}

export interface EventHighlight {
  id: string;
  event_id: string;
  winner_name: string;
  prize: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
  events?: Partial<Event>;
}

export interface FormField {
  id: string;
  event_id: string;
  label: string;
  field_type: FormFieldType;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  validation_rules: Record<string, unknown> | null;
  placeholder: string | null;
  created_at: string;
}

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "date"
  | "time"
  | "url"
  | "scale";

export interface FormResponse {
  id: string;
  registration_id: string;
  field_id: string;
  answer: string;
  created_at: string;
  form_fields?: Partial<FormField>;
}

export interface Registration {
  id: string;
  student_id: string;
  event_id: string;
  status: RegistrationStatus;
  payment_method: "upi" | "cash" | "not_required";
  payment_status: "pending" | "approved" | "rejected" | "not_required";
  registered_at: string;
  users?: Partial<User>;
  events?: Partial<Event>;
}

export type RegistrationStatus =
  | "confirmed"
  | "cancelled"
  | "waitlisted"
  | "payment_rejected";

export interface Waitlist {
  id: string;
  event_id: string;
  student_id: string;
  position: number;
  notified_at: string | null;
  created_at: string;
  users?: Partial<User>;
}

export interface Payment {
  id: string;
  registration_id: string;
  utr_number: string;
  screenshot_url: string | null;
  screenshot_hash: string | null;
  ai_verified: boolean;
  status: "pending" | "approved" | "rejected" | "manual_review";
  created_at: string;
}

export interface MoneyCollection {
  id: string;
  event_id: string;
  year: string;
  branch: string;
  section: string;
  amount_collected: number;
  collected_by: string | null;
  approved_by: string | null;
  updated_at: string;
}

export interface Attendance {
  id: string;
  registration_id: string;
  marked_by: string;
  method: "qr_scan" | "manual";
  timestamp: string;
}

export interface DutyLeave {
  id: string;
  user_id: string;
  event_id: string;
  name: string;
  class: string;
  batch: string;
  roll_no: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  created_at: string;
  events?: Partial<Event>;
}

export interface ApprovalRequest {
  id: string;
  event_id: string;
  stage: 1 | 2;
  approver_role: "faculty_coordinator" | "hod";
  approver_id: string | null;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  requested_at: string;
  events?: Partial<Event>;
}

export interface GalleryImage {
  id: string;
  event_id: string;
  image_url: string;
  uploaded_by: string;
  caption: string | null;
  type: "event_photo" | "notice" | "winner";
  created_at: string;
  events?: Partial<Event>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface EmailLog {
  id: string;
  user_id: string;
  event_id: string | null;
  trigger_type: string;
  sent_at: string;
  status: "sent" | "failed";
}

export interface LoginAttempt {
  id: string;
  clerk_user_id: string;
  ip_address: string;
  attempted_at: string;
  success: boolean;
  flagged_by_ai: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: typed table query builder
// ─────────────────────────────────────────────────────────────────────────────

export type TableName =
  | "departments"
  | "users"
  | "clubs"
  | "club_members"
  | "club_join_requests"
  | "events"
  | "venues"
  | "venue_bookings"
  | "event_highlights"
  | "form_fields"
  | "form_responses"
  | "registrations"
  | "waitlist"
  | "payments"
  | "money_collection"
  | "attendance"
  | "duty_leaves"
  | "approval_requests"
  | "gallery"
  | "notifications"
  | "email_logs"
  | "login_attempts";

/**
 * Returns true if a Supabase error indicates a "not found" (PGRST116).
 * Use this to distinguish empty results from real errors.
 */
export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "PGRST116"
  );
}

/**
 * Safely unwrap a Supabase single-row query result.
 * Returns null instead of throwing on PGRST116 (no rows found).
 */
export async function fetchSingle<T>(
  query: ReturnType<SupabaseClient["from"]>
): Promise<T | null> {
  const { data, error } = await (query as any);
  if (error) {
    if (isNotFoundError(error)) return null;
    throw new Error(error.message);
  }
  return data as T;
}

/**
 * Safely unwrap a Supabase list query result.
 * Returns an empty array on error to prevent crashes.
 */
export async function fetchList<T>(
  query: ReturnType<SupabaseClient["from"]>
): Promise<T[]> {
  const { data, error } = await (query as any);
  if (error) {
    console.error("[Supabase] fetchList error:", error.message);
    return [];
  }
  return (data ?? []) as T[];
}
