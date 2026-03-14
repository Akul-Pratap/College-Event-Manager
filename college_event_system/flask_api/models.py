"""
models.py — Supabase client + helper functions for all 22 tables
LTSU College Event Management System
"""

import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY are required. "
        "Set them in flask_api/.env before starting the API."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ─────────────────────────────────────────────────────────────────────────────
# 1. DEPARTMENTS
# ─────────────────────────────────────────────────────────────────────────────


def get_all_departments():
    return supabase.table("departments").select("*").execute().data


def get_department_by_id(dept_id: str):
    return (
        supabase.table("departments")
        .select("*")
        .eq("id", dept_id)
        .single()
        .execute()
        .data
    )


def get_department_by_code(code: str):
    return (
        supabase.table("departments")
        .select("*")
        .eq("code", code)
        .single()
        .execute()
        .data
    )


def create_department(data: dict):
    return supabase.table("departments").insert(data).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 2. USERS
# ─────────────────────────────────────────────────────────────────────────────


def get_user_by_clerk_id(clerk_id: str):
    return (
        supabase.table("users")
        .select("*")
        .eq("clerk_id", clerk_id)
        .single()
        .execute()
        .data
    )


def get_user_by_id(user_id: str):
    return supabase.table("users").select("*").eq("id", user_id).single().execute().data


def get_users_by_department(dept_id: str):
    return (
        supabase.table("users").select("*").eq("department_id", dept_id).execute().data
    )


def get_users_by_role(role: str, dept_id: str):
    return (
        supabase.table("users")
        .select("*")
        .eq("role", role)
        .eq("department_id", dept_id)
        .execute()
        .data
    )


def create_user(data: dict):
    return supabase.table("users").insert(data).execute().data


def update_user(user_id: str, data: dict):
    return supabase.table("users").update(data).eq("id", user_id).execute().data


def get_all_users():
    return supabase.table("users").select("*, departments(name)").execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 3. CLUBS
# ─────────────────────────────────────────────────────────────────────────────


def get_clubs_by_department(dept_id: str):
    return (
        supabase.table("clubs").select("*").eq("department_id", dept_id).execute().data
    )


def get_club_by_id(club_id: str):
    return supabase.table("clubs").select("*").eq("id", club_id).single().execute().data


def create_club(data: dict):
    return supabase.table("clubs").insert(data).execute().data


def update_club(club_id: str, data: dict):
    return supabase.table("clubs").update(data).eq("id", club_id).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 4. CLUB MEMBERS
# ─────────────────────────────────────────────────────────────────────────────


def get_club_members(club_id: str):
    return (
        supabase.table("club_members")
        .select("*, users(id, name, email, roll_no, year, branch, section)")
        .eq("club_id", club_id)
        .execute()
        .data
    )


def get_user_club_memberships(user_id: str):
    return (
        supabase.table("club_members")
        .select("*, clubs(*)")
        .eq("user_id", user_id)
        .execute()
        .data
    )


def add_club_member(data: dict):
    return supabase.table("club_members").insert(data).execute().data


def remove_club_member(club_id: str, user_id: str):
    return (
        supabase.table("club_members")
        .delete()
        .eq("club_id", club_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 5. CLUB JOIN REQUESTS
# ─────────────────────────────────────────────────────────────────────────────


def get_join_requests(club_id: str):
    return (
        supabase.table("club_join_requests")
        .select("*, users(id, name, email, roll_no)")
        .eq("club_id", club_id)
        .execute()
        .data
    )


def get_join_requests_by_user(user_id: str):
    return (
        supabase.table("club_join_requests")
        .select("*, clubs(*)")
        .eq("user_id", user_id)
        .execute()
        .data
    )


def create_join_request(data: dict):
    return supabase.table("club_join_requests").insert(data).execute().data


def update_join_request_status(req_id: str, status: str):
    return (
        supabase.table("club_join_requests")
        .update({"status": status})
        .eq("id", req_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 6. EVENTS
# ─────────────────────────────────────────────────────────────────────────────


def get_events_by_department(dept_id: str):
    return (
        supabase.table("events")
        .select("*, clubs(name), venues(name)")
        .eq("department_id", dept_id)
        .order("date", desc=True)
        .execute()
        .data
    )


def get_event_by_id(event_id: str):
    return (
        supabase.table("events")
        .select("*, clubs(name, logo_url), venues(name, capacity), departments(name)")
        .eq("id", event_id)
        .single()
        .execute()
        .data
    )


def get_all_live_events():
    return (
        supabase.table("events")
        .select("*, clubs(name), venues(name), departments(name)")
        .eq("status", "live")
        .order("date")
        .execute()
        .data
    )


def create_event(data: dict):
    return supabase.table("events").insert(data).execute().data


def update_event(event_id: str, data: dict):
    return supabase.table("events").update(data).eq("id", event_id).execute().data


def update_event_status(event_id: str, status: str):
    return (
        supabase.table("events")
        .update({"status": status})
        .eq("id", event_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 7. VENUES
# ─────────────────────────────────────────────────────────────────────────────


def get_all_venues():
    return supabase.table("venues").select("*").execute().data


def get_venue_by_id(venue_id: str):
    return (
        supabase.table("venues").select("*").eq("id", venue_id).single().execute().data
    )


def get_shared_venues():
    return supabase.table("venues").select("*").eq("is_shared", True).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 8. VENUE BOOKINGS
# ─────────────────────────────────────────────────────────────────────────────


def get_bookings_for_venue(venue_id: str):
    return (
        supabase.table("venue_bookings")
        .select("*, events(title, date, status)")
        .eq("venue_id", venue_id)
        .execute()
        .data
    )


def get_booking_by_event(event_id: str):
    return (
        supabase.table("venue_bookings")
        .select("*, venues(*)")
        .eq("event_id", event_id)
        .execute()
        .data
    )


def create_venue_booking(data: dict):
    return supabase.table("venue_bookings").insert(data).execute().data


def cancel_venue_booking(booking_id: str):
    return (
        supabase.table("venue_bookings")
        .update({"status": "cancelled"})
        .eq("id", booking_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 9. EVENT HIGHLIGHTS
# ─────────────────────────────────────────────────────────────────────────────


def get_event_highlights(event_id: str):
    return (
        supabase.table("event_highlights")
        .select("*")
        .eq("event_id", event_id)
        .execute()
        .data
    )


def get_all_highlights():
    return (
        supabase.table("event_highlights")
        .select("*, events(title, date)")
        .order("id", desc=True)
        .limit(20)
        .execute()
        .data
    )


def create_event_highlight(data: dict):
    return supabase.table("event_highlights").insert(data).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 10. FORM FIELDS
# ─────────────────────────────────────────────────────────────────────────────


def get_form_fields(event_id: str):
    return (
        supabase.table("form_fields")
        .select("*")
        .eq("event_id", event_id)
        .order("order_index")
        .execute()
        .data
    )


def create_form_field(data: dict):
    return supabase.table("form_fields").insert(data).execute().data


def update_form_field(field_id: str, data: dict):
    return supabase.table("form_fields").update(data).eq("id", field_id).execute().data


def delete_form_field(field_id: str):
    return supabase.table("form_fields").delete().eq("id", field_id).execute().data


def reorder_form_fields(fields: list[dict]):
    """fields: [{ id, order_index }, ...]"""
    results = []
    for f in fields:
        results.append(
            supabase.table("form_fields")
            .update({"order_index": f["order_index"]})
            .eq("id", f["id"])
            .execute()
            .data
        )
    return results


# ─────────────────────────────────────────────────────────────────────────────
# 11. FORM RESPONSES
# ─────────────────────────────────────────────────────────────────────────────


def get_form_responses(registration_id: str):
    return (
        supabase.table("form_responses")
        .select("*, form_fields(label, field_type)")
        .eq("registration_id", registration_id)
        .execute()
        .data
    )


def get_all_responses_for_event(event_id: str):
    return (
        supabase.table("form_responses")
        .select(
            "*, form_fields(label, field_type, event_id), registrations(student_id)"
        )
        .eq("form_fields.event_id", event_id)
        .execute()
        .data
    )


def create_form_response(data: dict):
    return supabase.table("form_responses").insert(data).execute().data


def bulk_create_form_responses(responses: list[dict]):
    return supabase.table("form_responses").insert(responses).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 12. REGISTRATIONS
# ─────────────────────────────────────────────────────────────────────────────


def get_registrations_for_event(event_id: str):
    return (
        supabase.table("registrations")
        .select("*, users(id, name, email, roll_no, year, branch, section)")
        .eq("event_id", event_id)
        .execute()
        .data
    )


def get_student_registrations(student_id: str):
    return (
        supabase.table("registrations")
        .select("*, events(title, date, venue_id, status)")
        .eq("student_id", student_id)
        .order("registered_at", desc=True)
        .execute()
        .data
    )


def get_registration_by_id(reg_id: str):
    return (
        supabase.table("registrations")
        .select("*, users(*), events(*)")
        .eq("id", reg_id)
        .single()
        .execute()
        .data
    )


def check_already_registered(student_id: str, event_id: str) -> bool:
    result = (
        supabase.table("registrations")
        .select("id")
        .eq("student_id", student_id)
        .eq("event_id", event_id)
        .execute()
        .data
    )
    return len(result) > 0


def get_registration_count(event_id: str) -> int:
    result = (
        supabase.table("registrations")
        .select("id")
        .eq("event_id", event_id)
        .eq("status", "confirmed")
        .execute()
        .data
    )
    return len(result)


def create_registration(data: dict):
    return supabase.table("registrations").insert(data).execute().data


def update_registration_status(reg_id: str, status: str):
    return (
        supabase.table("registrations")
        .update({"status": status})
        .eq("id", reg_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 13. WAITLIST
# ─────────────────────────────────────────────────────────────────────────────


def get_waitlist(event_id: str):
    return (
        supabase.table("waitlist")
        .select("*, users(id, name, email, roll_no)")
        .eq("event_id", event_id)
        .order("position")
        .execute()
        .data
    )


def get_student_waitlist_position(student_id: str, event_id: str):
    return (
        supabase.table("waitlist")
        .select("position")
        .eq("student_id", student_id)
        .eq("event_id", event_id)
        .single()
        .execute()
        .data
    )


def add_to_waitlist(data: dict):
    return supabase.table("waitlist").insert(data).execute().data


def remove_from_waitlist(student_id: str, event_id: str):
    return (
        supabase.table("waitlist")
        .delete()
        .eq("student_id", student_id)
        .eq("event_id", event_id)
        .execute()
        .data
    )


def get_waitlist_count(event_id: str) -> int:
    result = (
        supabase.table("waitlist").select("id").eq("event_id", event_id).execute().data
    )
    return len(result)


# ─────────────────────────────────────────────────────────────────────────────
# 14. PAYMENTS
# ─────────────────────────────────────────────────────────────────────────────


def get_payment_by_registration(reg_id: str):
    return (
        supabase.table("payments")
        .select("*")
        .eq("registration_id", reg_id)
        .single()
        .execute()
        .data
    )


def get_payments_for_event(event_id: str):
    return (
        supabase.table("payments")
        .select("*, registrations(student_id, event_id, users(name, roll_no))")
        .eq("registrations.event_id", event_id)
        .execute()
        .data
    )


def check_utr_exists(utr: str) -> bool:
    result = (
        supabase.table("payments").select("id").eq("utr_number", utr).execute().data
    )
    return len(result) > 0


def create_payment(data: dict):
    return supabase.table("payments").insert(data).execute().data


def update_payment_status(payment_id: str, status: str, ai_verified: bool = False):
    return (
        supabase.table("payments")
        .update({"status": status, "ai_verified": ai_verified})
        .eq("id", payment_id)
        .execute()
        .data
    )


def update_payment_hash(payment_id: str, screenshot_hash: str):
    return (
        supabase.table("payments")
        .update({"screenshot_hash": screenshot_hash})
        .eq("id", payment_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 15. MONEY COLLECTION
# ─────────────────────────────────────────────────────────────────────────────


def get_money_collection(event_id: str):
    return (
        supabase.table("money_collection")
        .select("*")
        .eq("event_id", event_id)
        .execute()
        .data
    )


def get_money_collection_by_class(event_id: str, year: str, branch: str, section: str):
    return (
        supabase.table("money_collection")
        .select("*")
        .eq("event_id", event_id)
        .eq("year", year)
        .eq("branch", branch)
        .eq("section", section)
        .single()
        .execute()
        .data
    )


def upsert_money_collection(data: dict):
    return supabase.table("money_collection").upsert(data).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 16. ATTENDANCE
# ─────────────────────────────────────────────────────────────────────────────


def get_attendance_for_event(event_id: str):
    return (
        supabase.table("attendance")
        .select("*, registrations(student_id, users(name, roll_no))")
        .eq("registrations.event_id", event_id)
        .execute()
        .data
    )


def check_already_attended(registration_id: str) -> bool:
    result = (
        supabase.table("attendance")
        .select("id")
        .eq("registration_id", registration_id)
        .execute()
        .data
    )
    return len(result) > 0


def mark_attendance(data: dict):
    return supabase.table("attendance").insert(data).execute().data


def get_attendance_count(event_id: str) -> int:
    result = (
        supabase.table("attendance")
        .select("id, registrations!inner(event_id)")
        .eq("registrations.event_id", event_id)
        .execute()
        .data
    )
    return len(result)


# ─────────────────────────────────────────────────────────────────────────────
# 17. DUTY LEAVES
# ─────────────────────────────────────────────────────────────────────────────


def get_duty_leaves_by_event(event_id: str):
    return (
        supabase.table("duty_leaves")
        .select("*")
        .eq("event_id", event_id)
        .execute()
        .data
    )


def get_duty_leaves_by_user(user_id: str):
    return (
        supabase.table("duty_leaves")
        .select("*, events(title, date)")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .execute()
        .data
    )


def get_pending_duty_leaves(dept_id: str):
    return (
        supabase.table("duty_leaves")
        .select("*, events(title, department_id)")
        .eq("status", "pending")
        .eq("events.department_id", dept_id)
        .execute()
        .data
    )


def create_duty_leave(data: dict):
    return supabase.table("duty_leaves").insert(data).execute().data


def update_duty_leave_status(dl_id: str, status: str, approved_by: str):
    return (
        supabase.table("duty_leaves")
        .update({"status": status, "approved_by": approved_by})
        .eq("id", dl_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 18. APPROVAL REQUESTS
# ─────────────────────────────────────────────────────────────────────────────


def get_approvals_by_event(event_id: str):
    return (
        supabase.table("approval_requests")
        .select("*")
        .eq("event_id", event_id)
        .order("stage")
        .execute()
        .data
    )


def get_pending_approvals(approver_role: str):
    return (
        supabase.table("approval_requests")
        .select("*, events(title, date, department_id, clubs(name))")
        .eq("approver_role", approver_role)
        .eq("status", "pending")
        .order("requested_at")
        .execute()
        .data
    )


def create_approval_request(data: dict):
    return supabase.table("approval_requests").insert(data).execute().data


def update_approval_status(approval_id: str, status: str, note: str, approver_id: str):
    return (
        supabase.table("approval_requests")
        .update({"status": status, "note": note, "approver_id": approver_id})
        .eq("id", approval_id)
        .execute()
        .data
    )


def get_approval_stage(event_id: str, stage: int):
    return (
        supabase.table("approval_requests")
        .select("*")
        .eq("event_id", event_id)
        .eq("stage", stage)
        .single()
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 19. GALLERY
# ─────────────────────────────────────────────────────────────────────────────


def get_gallery(event_id: str):
    return (
        supabase.table("gallery")
        .select("*")
        .eq("event_id", event_id)
        .order("id", desc=True)
        .execute()
        .data
    )


def get_department_gallery(dept_id: str):
    return (
        supabase.table("gallery")
        .select("*, events(title, date, department_id)")
        .eq("events.department_id", dept_id)
        .order("id", desc=True)
        .execute()
        .data
    )


def add_gallery_image(data: dict):
    return supabase.table("gallery").insert(data).execute().data


def delete_gallery_image(image_id: str):
    return supabase.table("gallery").delete().eq("id", image_id).execute().data


# ─────────────────────────────────────────────────────────────────────────────
# 20. NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────


def get_user_notifications(user_id: str, limit: int = 30):
    return (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
        .data
    )


def get_unread_count(user_id: str) -> int:
    result = (
        supabase.table("notifications")
        .select("id")
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
        .data
    )
    return len(result)


def create_notification(data: dict):
    return supabase.table("notifications").insert(data).execute().data


def bulk_create_notifications(notifications: list[dict]):
    return supabase.table("notifications").insert(notifications).execute().data


def mark_notification_read(notif_id: str):
    return (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", notif_id)
        .execute()
        .data
    )


def mark_all_notifications_read(user_id: str):
    return (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("user_id", user_id)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 21. EMAIL LOGS
# ─────────────────────────────────────────────────────────────────────────────


def log_email(data: dict):
    return supabase.table("email_logs").insert(data).execute().data


def get_email_logs(user_id: str):
    return (
        supabase.table("email_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("sent_at", desc=True)
        .execute()
        .data
    )


def get_email_logs_for_event(event_id: str):
    return (
        supabase.table("email_logs")
        .select("*")
        .eq("event_id", event_id)
        .order("sent_at", desc=True)
        .execute()
        .data
    )


# ─────────────────────────────────────────────────────────────────────────────
# 22. LOGIN ATTEMPTS
# ─────────────────────────────────────────────────────────────────────────────


def log_login_attempt(data: dict):
    return supabase.table("login_attempts").insert(data).execute().data


def get_recent_login_attempts(clerk_user_id: str, limit: int = 20):
    return (
        supabase.table("login_attempts")
        .select("*")
        .eq("clerk_user_id", clerk_user_id)
        .order("attempted_at", desc=True)
        .limit(limit)
        .execute()
        .data
    )


def get_failed_attempts_by_ip(ip_address: str, since_iso: str):
    return (
        supabase.table("login_attempts")
        .select("id")
        .eq("ip_address", ip_address)
        .eq("success", False)
        .gte("attempted_at", since_iso)
        .execute()
        .data
    )


def get_all_flagged_attempts():
    return (
        supabase.table("login_attempts")
        .select("*")
        .eq("flagged_by_ai", True)
        .order("attempted_at", desc=True)
        .execute()
        .data
    )


def flag_login_attempt(attempt_id: str):
    return (
        supabase.table("login_attempts")
        .update({"flagged_by_ai": True})
        .eq("id", attempt_id)
        .execute()
        .data
    )
