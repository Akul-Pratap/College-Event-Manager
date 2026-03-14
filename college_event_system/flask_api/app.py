"""
app.py — Main Flask application for LTSU College Event Management System
All API routes: auth, events, registrations, payments, QR, AI, duty leaves,
                gallery, approvals, notifications, venue, money collection.
Railway deployment: gunicorn app:app
"""

import os
import time
from datetime import datetime, timezone

import requests
import sentry_sdk
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from jose import JWTError, jwt
from sentry_sdk.integrations.flask import FlaskIntegration

load_dotenv()

sentry_dsn = os.getenv("SENTRY_DSN", "")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FlaskIntegration()],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.0")),
        environment=os.getenv("FLASK_ENV", "development"),
    )

# ─────────────────────────────────────────────────────────────────────────────
# App Initialisation
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)

# Treat missing secrets as a hard error in production. In development, we allow
# an ephemeral secret so local runs don't crash, but you should still set it.
FLASK_ENV = os.getenv("FLASK_ENV", "development")
IS_PROD = FLASK_ENV == "production"

flask_secret = os.getenv("FLASK_SECRET_KEY")
if not flask_secret:
    if IS_PROD:
        raise RuntimeError("FLASK_SECRET_KEY is required when FLASK_ENV=production.")
    flask_secret = os.urandom(32)
app.secret_key = flask_secret

# CORS — allow Next.js frontend and Flutter app
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        os.getenv("NEXT_PUBLIC_APP_URL", ""),
    ],
    supports_credentials=True,
)

# Rate limiting via Upstash Redis (falls back to in-memory)
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per minute"],
    storage_uri=os.getenv("UPSTASH_REDIS_REST_URL", "memory://"),
)

# Security headers (HTTPS enforced only in production)
Talisman(
    app,
    force_https=IS_PROD,
    strict_transport_security=IS_PROD,
    content_security_policy={
        "default-src": "'self'",
        "img-src": "* data:",
        "script-src": "'self'",
    },
)

# ─────────────────────────────────────────────────────────────────────────────
# JWT Middleware — verify Clerk JWT on every protected request
# ─────────────────────────────────────────────────────────────────────────────

PUBLIC_ROUTES = {
    "/api/health",
    "/api/events/public",
    "/api/highlights",
    "/api/departments",
}

CLERK_JWKS_URL = "https://api.clerk.dev/v1/jwks"

_JWKS_CACHE: dict = {"fetched_at": 0.0, "jwks": None}
_JWKS_TTL_SECONDS = 60 * 60


def _get_clerk_jwks():
    """
    Fetch and cache Clerk JWKS. `python-jose` expects an actual JWK key dict,
    not a URL string, so we download the JWKS and select the right key by `kid`.
    """
    now = time.time()
    if _JWKS_CACHE["jwks"] and (now - _JWKS_CACHE["fetched_at"] < _JWKS_TTL_SECONDS):
        return _JWKS_CACHE["jwks"]

    jwks_url = os.getenv("CLERK_JWKS_URL", CLERK_JWKS_URL)
    resp = requests.get(jwks_url, timeout=10)
    resp.raise_for_status()
    jwks = resp.json()

    _JWKS_CACHE["jwks"] = jwks
    _JWKS_CACHE["fetched_at"] = now
    return jwks


def _send_push_to_user(user_id, title, body, data=None):
    """Resolve a user ID to an FCM token and send a push if available."""
    from models import get_user_by_id
    from notification_utils import send_push_notification

    if not user_id:
        return None

    target_user = get_user_by_id(user_id)
    if not target_user:
        return None

    token = (target_user.get("fcm_token") or "").strip()
    if not token:
        return None

    return send_push_notification(
        token=token,
        title=title,
        body=body,
        data=data,
    )


@app.before_request
def verify_jwt():
    """
    Extract and verify the Clerk JWT from the Authorization header.
    Populates flask.g.current_user with { id, clerk_id, role, department_id, ... }.
    Skips verification for public routes and OPTIONS preflight requests.
    """
    if request.method == "OPTIONS":
        return None

    if request.path in PUBLIC_ROUTES or request.path.startswith("/api/public/"):
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header."}), 401

    token = auth_header.split(" ", 1)[1]

    try:
        # Decode without verification first to get the key id (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            return jsonify({"error": "Invalid token header: missing kid."}), 401

        jwks = _get_clerk_jwks()
        key = next((k for k in (jwks.get("keys") or []) if k.get("kid") == kid), None)
        if not key:
            return jsonify({"error": "Invalid token: signing key not found."}), 401

        # Verify signature using Clerk's public JWKS
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )

        # Fetch full user profile from Supabase
        from models import get_user_by_clerk_id

        clerk_id = payload.get("sub", "")
        user = get_user_by_clerk_id(clerk_id)

        if not user:
            # Allow first-time onboarding registration to create the profile row.
            if request.path == "/api/auth/register":
                g.current_user = {
                    "id": None,
                    "clerk_id": clerk_id,
                    "role": None,
                    "department_id": None,
                }
                g.clerk_id = clerk_id
                return None

            return jsonify({"error": "User profile not found. Please complete registration."}), 404

        g.current_user = user
        g.clerk_id = clerk_id

    except JWTError as exc:
        return jsonify({"error": f"Invalid token: {exc}"}), 401
    except Exception as exc:
        return jsonify({"error": f"Authentication error: {exc}"}), 401


# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "LTSU Events Flask API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.getenv("FLASK_ENV", "development"),
    })


# ─────────────────────────────────────────────────────────────────────────────
# Auth / User
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("10 per hour")
def register_user():
    """Create a user profile in Supabase after Clerk registration."""
    from models import create_user, get_user_by_clerk_id
    from security import sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    required = ["clerk_id", "name", "email", "role", "department_id"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    existing = get_user_by_clerk_id(data["clerk_id"])
    if existing:
        return jsonify({"user": existing, "message": "User already exists."}), 200

    user = create_user(data)
    return jsonify({"user": user[0] if isinstance(user, list) else user}), 201


@app.route("/api/auth/me", methods=["GET"])
def get_me():
    """Return the current authenticated user's full profile."""
    return jsonify({"user": g.current_user})


@app.route("/api/auth/me", methods=["PATCH"])
def update_me():
    """Update the current user's profile."""
    from models import update_user
    from security import sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    # Prevent role/department changes through this endpoint
    data.pop("role", None)
    data.pop("department_id", None)
    data.pop("clerk_id", None)

    updated = update_user(g.current_user["id"], data)
    return jsonify({"user": updated[0] if isinstance(updated, list) else updated})


# ─────────────────────────────────────────────────────────────────────────────
# Departments
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/departments", methods=["GET"])
def list_departments():
    from models import get_all_departments
    return jsonify({"departments": get_all_departments()})


# ──────────────────────────────────────────────────────────────────────────────
# Analytics / Stats (used by dashboards)
# ──────────────────────────────────────────────────────────────────────────────


@app.route("/api/admin/stats", methods=["GET"])
def super_admin_stats():
    """Super admin: university-wide stats for the dashboard."""
    from models import supabase

    user = g.current_user
    if user.get("role") != "super_admin":
        return jsonify({"error": "Forbidden"}), 403

    users = supabase.table("users").select("id").execute().data or []
    events = supabase.table("events").select("id,status").execute().data or []
    depts = supabase.table("departments").select("id").execute().data or []
    regs = supabase.table("registrations").select("id").execute().data or []
    venues = supabase.table("venues").select("id").execute().data or []
    approvals = (
        supabase.table("approval_requests")
        .select("id")
        .eq("status", "pending")
        .execute()
        .data
        or []
    )
    flagged = (
        supabase.table("login_attempts")
        .select("id")
        .eq("flagged_by_ai", True)
        .execute()
        .data
        or []
    )

    stats = {
        "total_users": len(users),
        "total_events": len(events),
        "total_departments": len(depts),
        "total_registrations": len(regs),
        "live_events": sum(1 for e in events if e.get("status") == "live"),
        "pending_approvals": len(approvals),
        "total_venues": len(venues),
        "flagged_logins": len(flagged),
    }

    return jsonify({"stats": stats})


@app.route("/api/stats/department", methods=["GET"])
def department_stats():
    """HOD/faculty coordinator: department-wide stats for their dashboard."""
    from models import supabase

    user = g.current_user
    role = user.get("role")
    if role not in ["hod", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    dept_id = user.get("department_id")
    if role == "super_admin":
        dept_id = request.args.get("department_id") or dept_id

    if not dept_id:
        return jsonify({"error": "Missing department_id."}), 400

    events = (
        supabase.table("events")
        .select("id,status")
        .eq("department_id", dept_id)
        .execute()
        .data
        or []
    )
    regs = (
        supabase.table("registrations")
        .select("id")
        .eq("department_id", dept_id)
        .execute()
        .data
        or []
    )
    approvals = (
        supabase.table("approval_requests")
        .select("id")
        .eq("department_id", dept_id)
        .eq("status", "pending")
        .execute()
        .data
        or []
    )
    students = (
        supabase.table("users")
        .select("id")
        .eq("department_id", dept_id)
        .eq("role", "student")
        .execute()
        .data
        or []
    )

    stats = {
        "total_events": len(events),
        "live_events": sum(1 for e in events if e.get("status") == "live"),
        "pending_approvals": len(approvals),
        "total_registrations": len(regs),
        "total_students": len(students),
    }

    return jsonify({"stats": stats})


@app.route("/api/volunteer/stats", methods=["GET"])
def volunteer_stats():
    """Volunteer: personal attendance stats for the dashboard."""
    from models import supabase

    user = g.current_user
    if user.get("role") not in ["volunteer", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    marked_by = user.get("id")
    dept_id = user.get("department_id")
    if user.get("role") == "super_admin":
        marked_by = request.args.get("marked_by") or marked_by
        dept_id = request.args.get("department_id") or dept_id

    if not marked_by:
        return jsonify({"error": "Missing marked_by."}), 400

    scanned = (
        supabase.table("attendance")
        .select("id")
        .eq("marked_by", marked_by)
        .eq("method", "qr_scan")
        .execute()
        .data
        or []
    )
    manual = (
        supabase.table("attendance")
        .select("id")
        .eq("marked_by", marked_by)
        .eq("method", "manual")
        .execute()
        .data
        or []
    )

    events_assigned = 0
    if dept_id:
        events_assigned = len(
            supabase.table("events")
            .select("id")
            .eq("department_id", dept_id)
            .eq("status", "live")
            .execute()
            .data
            or []
        )

    return jsonify(
        {
            "stats": {
                "total_scanned": len(scanned),
                "total_manual": len(manual),
                "events_assigned": events_assigned,
            }
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# Convenience endpoints (dashboard expects these paths)
# ──────────────────────────────────────────────────────────────────────────────


@app.route("/api/duty-leaves/pending", methods=["GET"])
def list_pending_duty_leaves_alias():
    """Alias for dashboards (same payload shape as /api/duty-leaves)."""
    return list_duty_leaves()


@app.route("/api/club-members", methods=["GET"])
def list_club_members_across_department():
    """
    Faculty Coordinator dashboard wants a flat list of club members.
    We interpret this as: all club members across all clubs in the user's department.
    """
    from models import supabase

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    dept_id = user.get("department_id")
    if user.get("role") == "super_admin":
        dept_id = request.args.get("department_id") or dept_id

    if not dept_id:
        return jsonify({"members": []})

    clubs = (
        supabase.table("clubs").select("id").eq("department_id", dept_id).execute().data
        or []
    )
    club_ids = [c.get("id") for c in clubs if c.get("id")]
    if not club_ids:
        return jsonify({"members": []})

    members = (
        supabase.table("club_members")
        .select("*, users(name, roll_no), clubs(name)")
        .in_("club_id", club_ids)
        .execute()
        .data
        or []
    )

    return jsonify({"members": members})


@app.route("/api/money-collection", methods=["GET"])
def list_money_collection_summary():
    """
    Faculty Coordinator dashboard expects a department-wide money collection summary.
    Optional query params:
      - event_id: filter to a specific event
      - department_id: super_admin override
    """
    from models import supabase

    user = g.current_user
    if user.get("role") not in [
        "faculty_coordinator",
        "class_incharge",
        "cr",
        "hod",
        "super_admin",
    ]:
        return jsonify({"error": "Forbidden"}), 403

    dept_id = user.get("department_id")
    if user.get("role") == "super_admin":
        dept_id = request.args.get("department_id") or dept_id

    if not dept_id:
        return jsonify({"collections": []})

    event_id = request.args.get("event_id")
    q = (
        supabase.table("money_collection")
        .select("*")
        .eq("department_id", dept_id)
        .order("updated_at", desc=True)
    )
    if event_id:
        q = q.eq("event_id", event_id)

    collections = q.execute().data or []
    return jsonify({"collections": collections})

# ─────────────────────────────────────────────────────────────────────────────
# Events
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/public", methods=["GET"])
def public_events():
    """Public endpoint — upcoming live events for the landing page."""
    from models import get_all_live_events
    return jsonify({"events": get_all_live_events()})


@app.route("/api/events", methods=["GET"])
def list_events():
    """
    List events.

    Supports optional query params (used by dashboards):
      - status: filter by event status (e.g. live, pending_approval)
      - limit: integer, maximum number of rows
      - department_id: super_admin only (filter to a department)
    """
    from models import supabase

    user = g.current_user
    role = user.get("role")
    status = request.args.get("status")
    limit = request.args.get("limit", type=int)

    if role == "super_admin":
        dept_id = request.args.get("department_id")
        q = (
            supabase.table("events")
            .select("*, clubs(name), venues(name), departments(name)")
            .order("date", desc=True)
        )
        if dept_id:
            q = q.eq("department_id", dept_id)
    else:
        dept_id = user.get("department_id")
        if not dept_id:
            return jsonify({"error": "Missing department_id."}), 400
        q = (
            supabase.table("events")
            .select("*, clubs(name), venues(name)")
            .eq("department_id", dept_id)
            .order("date", desc=True)
        )

    if status:
        q = q.eq("status", status)
    if limit:
        q = q.limit(limit)

    return jsonify({"events": q.execute().data or []})


@app.route("/api/events/<event_id>", methods=["GET"])
def get_event(event_id):
    from models import get_event_by_id
    event = get_event_by_id(event_id)
    if not event:
        return jsonify({"error": "Event not found."}), 404
    return jsonify({"event": event})


@app.route("/api/events", methods=["POST"])
@limiter.limit("20 per hour")
def create_event():
    """Create a new event and initiate multi-stage approval workflow."""
    from models import (create_approval_request, create_event,
                        get_users_by_role)
    from security import require_roles, sanitize_input
    from venue_utils import create_booking_if_available

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    required = ["title", "date", "venue_id", "club_id", "start_time", "end_time"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    # Venue conflict check
    conflict = create_booking_if_available(
        venue_id=data["venue_id"],
        event_id="pending",
        start_time=data["start_time"],
        end_time=data["end_time"],
    )
    if not conflict["success"]:
        return jsonify({
            "error": "Venue conflict detected.",
            "conflicts": conflict.get("conflicts", []),
            "next_available": conflict.get("next_available"),
        }), 409

    # Create the event
    data["department_id"] = user["department_id"]
    data["status"] = "pending_approval"
    event = create_event(data)
    event_obj = event[0] if isinstance(event, list) else event

    # Re-create venue booking with the real event_id
    from models import create_venue_booking, cancel_venue_booking
    if conflict.get("booking") and conflict["booking"].get("id"):
        cancel_venue_booking(conflict["booking"]["id"])
    create_venue_booking({
        "venue_id": data["venue_id"],
        "event_id": event_obj["id"],
        "start_time": data["start_time"],
        "end_time": data["end_time"],
        "status": "confirmed",
    })

    # Stage 1 approval: Faculty Coordinator
    create_approval_request({
        "event_id": event_obj["id"],
        "stage": 1,
        "approver_role": "faculty_coordinator",
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
    })

    # Notify faculty coordinators
    faculty_list = get_users_by_role("faculty_coordinator", user["department_id"])
    for fc in faculty_list:
        _send_push_to_user(
            user_id=fc["id"],
            title="New Event Pending Approval",
            body=f"'{data['title']}' requires your review.",
            data={"event_id": event_obj["id"], "type": "approval_request"},
        )

    return jsonify({"event": event_obj, "message": "Event created. Awaiting Stage 1 approval."}), 201


@app.route("/api/events/<event_id>", methods=["PATCH"])
def update_event(event_id):
    from models import update_event
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    data.pop("department_id", None)  # cannot change department
    updated = update_event(event_id, data)
    return jsonify({"event": updated[0] if isinstance(updated, list) else updated})


# ─────────────────────────────────────────────────────────────────────────────
# Approvals
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/approvals", methods=["GET"])
def list_approvals():
    """Return pending approvals for the current user's role."""
    from models import get_pending_approvals

    user = g.current_user
    role = user.get("role")
    if role not in ["faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    approvals = get_pending_approvals(role)
    return jsonify({"approvals": approvals})


@app.route("/api/approvals/<approval_id>", methods=["PATCH"])
def process_approval(approval_id):
    """Approve or reject an approval request and advance the workflow."""
    from models import (create_approval_request, get_approval_stage,
                        get_approvals_by_event, get_users_by_role,
                        update_approval_status, update_event_status)
    from notification_utils import send_email_notification
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    status = data.get("status")  # "approved" | "rejected"
    note = data.get("note", "")

    if status not in ["approved", "rejected"]:
        return jsonify({"error": "Status must be 'approved' or 'rejected'."}), 400

    update_approval_status(approval_id, status, note, user["id"])

    # Fetch the approval to determine next steps
    from models import supabase
    approval = supabase.table("approval_requests").select("*, events(*)").eq("id", approval_id).single().execute().data
    if not approval:
        return jsonify({"error": "Approval not found."}), 404

    event = approval.get("events", {})
    event_id = approval.get("event_id")
    stage = approval.get("stage", 1)

    if status == "rejected":
        update_event_status(event_id, "rejected")
        # Notify organizer
        send_email_notification(
            user_id=event.get("created_by", ""),
            subject=f"Event '{event.get('title', '')}' Rejected",
            body=f"Your event was rejected at Stage {stage}. Reason: {note}",
            trigger_type="event_rejected",
            event_id=event_id,
        )
        return jsonify({"message": "Event rejected. Organizer notified."})

    # Approved — advance to next stage
    if stage == 1:
        # Advance to Stage 2: HOD approval
        hod_list = get_users_by_role("hod", event.get("department_id", ""))
        for hod in hod_list:
            create_approval_request({
                "event_id": event_id,
                "stage": 2,
                "approver_role": "hod",
                "status": "pending",
                "requested_at": datetime.now(timezone.utc).isoformat(),
            })
            _send_push_to_user(
                user_id=hod["id"],
                title="Event Awaiting Your Approval",
                body=f"'{event.get('title', '')}' needs HOD approval.",
                data={"event_id": event_id, "type": "hod_approval"},
            )
    elif stage == 2:
        # Final approval — event goes LIVE
        update_event_status(event_id, "live")
        send_email_notification(
            user_id=event.get("created_by", ""),
            subject=f"Event '{event.get('title', '')}' is Now Live!",
            body="Congratulations! Your event has been approved and is now live.",
            trigger_type="event_approved",
            event_id=event_id,
        )

    return jsonify({"message": f"Stage {stage} approved. Workflow advanced."})


# ─────────────────────────────────────────────────────────────────────────────
# Registrations
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/<event_id>/register", methods=["POST"])
@limiter.limit("10 per hour")
def register_for_event(event_id):
    """Student registers for an event. Handles waitlist automatically."""
    from models import (add_to_waitlist, check_already_registered,
                        create_notification, create_registration,
                        get_event_by_id, get_registration_count,
                        get_waitlist_count)
    from security import sanitize_input

    user = g.current_user
    if user.get("role") != "student":
        return jsonify({"error": "Only students can register for events."}), 403

    event = get_event_by_id(event_id)
    if not event:
        return jsonify({"error": "Event not found."}), 404

    if event.get("status") != "live":
        return jsonify({"error": "Registrations are not open for this event."}), 400

    if not event.get("form_open") or not event.get("form_close"):
        return jsonify({"error": "Registration window not set for this event."}), 400

    now = datetime.now(timezone.utc).isoformat()
    if now < event["form_open"] or now > event["form_close"]:
        return jsonify({"error": "Registration window is closed."}), 400

    if check_already_registered(user["id"], event_id):
        return jsonify({"error": "You are already registered for this event."}), 409

    # Check capacity
    current_count = get_registration_count(event_id)
    max_responses = event.get("max_responses") or 999999

    if current_count >= max_responses:
        # Add to waitlist
        position = get_waitlist_count(event_id) + 1
        add_to_waitlist({
            "event_id": event_id,
            "student_id": user["id"],
            "position": position,
        })
        return jsonify({
            "registered": False,
            "waitlisted": True,
            "position": position,
            "message": f"Event is full. You are #{position} on the waitlist.",
        }), 202

    # Register student
    data = sanitize_input(request.get_json(force=True) or {})
    payment_method = data.get("payment_method", "cash")

    reg = create_registration({
        "student_id": user["id"],
        "event_id": event_id,
        "status": "confirmed",
        "payment_method": payment_method,
        "payment_status": "pending" if event.get("fee", 0) > 0 else "not_required",
    })

    reg_obj = reg[0] if isinstance(reg, list) else reg

    # In-app confirmation notification
    create_notification({
        "user_id": user["id"],
        "type": "registration_confirmed",
        "message": f"You are registered for '{event.get('title', '')}' on {event.get('date', '')}.",
        "is_read": False,
    })

    return jsonify({
        "registered": True,
        "registration": reg_obj,
        "message": "Registration successful!",
    }), 201


@app.route("/api/events/<event_id>/registrations", methods=["GET"])
def list_registrations(event_id):
    """List registrations for an event (organizer/faculty/hod only)."""
    from models import get_registrations_for_event

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "hod", "super_admin", "volunteer"]:
        return jsonify({"error": "Forbidden"}), 403

    registrations = get_registrations_for_event(event_id)
    return jsonify({"registrations": registrations, "count": len(registrations)})


@app.route("/api/my-registrations", methods=["GET"])
def my_registrations():
    """Return the current student's event registrations."""
    from models import get_student_registrations
    return jsonify({"registrations": get_student_registrations(g.current_user["id"])})


@app.route("/api/events/<event_id>/payment-info", methods=["GET"])
def get_payment_info(event_id):
    """Return student-specific payment details for an event registration."""
    from models import get_event_by_id, supabase

    user = g.current_user
    if user.get("role") != "student":
        return jsonify({"error": "Only students can access payment info."}), 403

    event = get_event_by_id(event_id)
    if not event:
        return jsonify({"error": "Event not found."}), 404

    reg_rows = (
        supabase.table("registrations")
        .select("id,payment_status,payment_method")
        .eq("student_id", user["id"])
        .eq("event_id", event_id)
        .order("registered_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not reg_rows:
        return jsonify({"error": "You are not registered for this event."}), 404

    reg = reg_rows[0]
    fee = float(event.get("fee") or 0)
    payment_type = str(event.get("payment_type") or "upi")
    if fee <= 0:
        payment_status = "not_required"
        payment_type = "cash"
    else:
        payment_status = reg.get("payment_status") or "pending"

    payment = {
        "event_title": event.get("title", "Event"),
        "fee": fee,
        "payment_type": "cash" if payment_type == "cash" else "upi",
        "upi_id": event.get("upi_id"),
        "registration_id": reg.get("id"),
        "payment_status": payment_status,
    }
    return jsonify({"payment": payment})


# ─────────────────────────────────────────────────────────────────────────────
# Payments
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/payments/upload", methods=["POST"])
@app.route("/api/payments/submit", methods=["POST"])
@limiter.limit("5 per hour")
def upload_payment():
    """
    Student uploads UPI payment screenshot.
    Runs full verification pipeline: UTR check → duplicate check → Gemini Vision.
    """
    from models import (create_payment, get_event_by_id,
                        get_registration_by_id, update_registration_status)
    from payment_utils import verify_payment_full
    from security import validate_image_file

    user = g.current_user
    registration_id = request.form.get("registration_id")
    utr = request.form.get("utr_number", "").strip()
    file = request.files.get("screenshot")

    if not all([registration_id, utr, file]):
        return jsonify({"error": "registration_id, utr_number, and screenshot are required."}), 400

    # Validate file
    is_valid, error_msg = validate_image_file(file)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    # Get registration and event
    registration = get_registration_by_id(registration_id)
    if not registration or registration.get("student_id") != user["id"]:
        return jsonify({"error": "Registration not found or access denied."}), 404

    event = get_event_by_id(registration["event_id"])
    expected_amount = float(event.get("fee", 0))

    # Read image bytes
    image_bytes = file.read()
    filename = file.filename or "screenshot.jpg"

    # Get all existing screenshot hashes for duplicate detection
    from models import supabase
    existing = supabase.table("payments").select("screenshot_hash").not_.is_("screenshot_hash", "null").execute().data
    existing_hashes = [p["screenshot_hash"] for p in existing if p.get("screenshot_hash")]

    # Run full verification pipeline
    result = verify_payment_full(
        image_bytes=image_bytes,
        filename=filename,
        utr=utr,
        expected_amount=expected_amount,
        existing_hashes=existing_hashes,
    )

    # Persist payment record
    payment = create_payment({
        "registration_id": registration_id,
        "utr_number": utr.upper(),
        "screenshot_url": result.get("screenshot_url", ""),
        "screenshot_hash": result.get("screenshot_hash", ""),
        "ai_verified": result.get("verified", False),
        "status": result.get("status", "manual_review"),
    })

    if result.get("status") == "approved":
        update_registration_status(registration_id, "confirmed")

    return jsonify({
        "payment": payment[0] if isinstance(payment, list) else payment,
        "verification": result,
    }), 201


@app.route("/api/payments/<payment_id>/verify", methods=["PATCH"])
def manual_verify_payment(payment_id):
    """Organizer/faculty manually approve or reject a payment."""
    from models import update_payment_status, update_registration_status
    from models import supabase

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True) or {}
    status = data.get("status")
    if status not in ["approved", "rejected"]:
        return jsonify({"error": "Status must be 'approved' or 'rejected'."}), 400

    update_payment_status(payment_id, status, ai_verified=False)

    # Update registration status accordingly
    payment = supabase.table("payments").select("registration_id").eq("id", payment_id).single().execute().data
    if payment:
        update_registration_status(payment["registration_id"], "confirmed" if status == "approved" else "payment_rejected")

    return jsonify({"message": f"Payment {status}."})


@app.route("/api/events/<event_id>/payments", methods=["GET"])
def event_payments(event_id):
    """List all payment records for an event."""
    from models import get_payments_for_event

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    payments = get_payments_for_event(event_id)
    return jsonify({"payments": payments})


# ─────────────────────────────────────────────────────────────────────────────
# QR Codes
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/qr/generate", methods=["POST"])
def generate_qr():
    """Generate an AES-256 encrypted QR code for a registration."""
    from models import get_event_by_id, get_registration_by_id, get_user_by_id
    from qr_utils import build_ticket_payload, generate_qr_base64

    data = request.get_json(force=True) or {}
    registration_id = data.get("registration_id")

    if not registration_id:
        return jsonify({"error": "registration_id is required."}), 400

    reg = get_registration_by_id(registration_id)
    if not reg:
        return jsonify({"error": "Registration not found."}), 404

    # Only the registered student or staff can request QR
    user = g.current_user
    if user["id"] != reg.get("student_id") and user.get("role") not in ["organizer", "volunteer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    event = get_event_by_id(reg["event_id"])
    student = get_user_by_id(reg["student_id"])

    payload = build_ticket_payload(
        registration_id=registration_id,
        event_id=reg["event_id"],
        student_id=reg["student_id"],
        event_title=event.get("title", ""),
        student_name=student.get("name", ""),
        event_date=str(event.get("date", "")),
    )

    qr_base64 = generate_qr_base64(payload)
    return jsonify({"qr_code": qr_base64, "payload": payload})


@app.route("/api/qr/verify", methods=["POST"])
def verify_qr():
    """Decrypt and verify a scanned QR token. Mark attendance on success."""
    from models import (check_already_attended, get_registration_by_id,
                        mark_attendance)
    from qr_utils import verify_qr_token

    user = g.current_user
    if user.get("role") not in ["volunteer", "organizer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden — only volunteers can scan QR codes."}), 403

    data = request.get_json(force=True) or {}
    token = data.get("token", "")

    if not token:
        return jsonify({"error": "QR token is required."}), 400

    is_valid, ticket_data = verify_qr_token(token)

    if not is_valid:
        return jsonify({
            "valid": False,
            "error": ticket_data.get("error", "Invalid QR code."),
        }), 400

    registration_id = ticket_data.get("registration_id")
    reg = get_registration_by_id(registration_id)

    if not reg:
        return jsonify({"valid": False, "error": "Registration record not found."}), 404

    if reg.get("status") not in ["confirmed"]:
        return jsonify({"valid": False, "error": f"Registration status is '{reg.get('status')}'. Entry denied."}), 403

    if reg.get("payment_status") == "pending" and reg.get("payment_method") != "cash":
        return jsonify({"valid": False, "error": "Payment not verified. Entry denied."}), 403

    if check_already_attended(registration_id):
        return jsonify({
            "valid": True,
            "already_attended": True,
            "ticket": ticket_data,
            "message": "Already checked in.",
        })

    # Mark attendance
    mark_attendance({
        "registration_id": registration_id,
        "marked_by": user["id"],
        "method": "qr_scan",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({
        "valid": True,
        "already_attended": False,
        "ticket": ticket_data,
        "message": "Entry granted. Attendance marked.",
    })


# ─────────────────────────────────────────────────────────────────────────────
# Form Builder
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/<event_id>/form", methods=["GET"])
def get_form(event_id):
    from models import get_form_fields
    return jsonify({"fields": get_form_fields(event_id)})


@app.route("/api/events/<event_id>/form", methods=["POST"])
def save_form_fields(event_id):
    """Replace all form fields for an event (full overwrite)."""
    from models import (delete_form_field, get_form_fields,
                        create_form_field)
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True) or {}
    fields = data.get("fields", [])

    # Delete existing fields
    existing = get_form_fields(event_id)
    for f in existing:
        delete_form_field(f["id"])

    # Insert new fields
    created = []
    for i, field in enumerate(fields):
        field = sanitize_input(field)
        field["event_id"] = event_id
        field["order_index"] = i
        created.append(create_form_field(field))

    return jsonify({"fields": created, "count": len(created)}), 201


@app.route("/api/events/<event_id>/form/responses", methods=["POST"])
@limiter.limit("30 per hour")
def submit_form_responses(event_id):
    """Student submits form field responses after registering."""
    from models import (bulk_create_form_responses, check_already_registered,
                        get_form_fields)
    from security import sanitize_input

    user = g.current_user
    if user.get("role") != "student":
        return jsonify({"error": "Only students can submit form responses."}), 403

    if not check_already_registered(user["id"], event_id):
        return jsonify({"error": "You must register for the event before submitting responses."}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    answers = data.get("answers", [])  # [{ field_id, answer }, ...]
    registration_id = data.get("registration_id")

    if not registration_id:
        return jsonify({"error": "registration_id is required."}), 400

    responses = [
        {
            "registration_id": registration_id,
            "field_id": ans["field_id"],
            "answer": str(ans.get("answer", "")),
        }
        for ans in answers
    ]

    created = bulk_create_form_responses(responses)
    return jsonify({"submitted": len(created), "message": "Form responses saved."}), 201


@app.route("/api/events/<event_id>/form/responses", methods=["GET"])
def get_form_responses_for_event(event_id):
    """Get all form responses for an event (organizer/faculty/hod only)."""
    from models import get_all_responses_for_event

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    responses = get_all_responses_for_event(event_id)
    return jsonify({"responses": responses, "count": len(responses)})


# ─────────────────────────────────────────────────────────────────────────────
# Clubs
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/clubs", methods=["GET"])
def list_clubs():
    """List clubs for the current user's department."""
    from models import get_clubs_by_department

    dept_id = g.current_user.get("department_id")
    clubs = get_clubs_by_department(dept_id)
    return jsonify({"clubs": clubs})


@app.route("/api/clubs/<club_id>", methods=["GET"])
def get_club(club_id):
    from models import get_club_by_id, get_club_members

    club = get_club_by_id(club_id)
    if not club:
        return jsonify({"error": "Club not found."}), 404
    members = get_club_members(club_id)
    return jsonify({"club": club, "members": members})


@app.route("/api/clubs", methods=["POST"])
def create_club_route():
    from models import create_club
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    data["department_id"] = user["department_id"]
    club = create_club(data)
    return jsonify({"club": club[0] if isinstance(club, list) else club}), 201


@app.route("/api/clubs/<club_id>", methods=["PATCH"])
def update_club_route(club_id):
    from models import update_club
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    data.pop("department_id", None)
    updated = update_club(club_id, data)
    return jsonify({"club": updated[0] if isinstance(updated, list) else updated})


@app.route("/api/clubs/<club_id>/join", methods=["POST"])
@limiter.limit("5 per hour")
def request_to_join_club(club_id):
    """Student/volunteer requests to join a club."""
    from models import create_join_request, get_users_by_role
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["student", "volunteer"]:
        return jsonify({"error": "Only students and volunteers can join clubs."}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    request_type = data.get("request_type", "permanent")  # permanent | event_only
    event_id = data.get("event_id")

    join_req = create_join_request({
        "club_id": club_id,
        "user_id": user["id"],
        "request_type": request_type,
        "status": "pending",
        "event_id": event_id,
    })

    # Notify faculty coordinators
    faculty_list = get_users_by_role("faculty_coordinator", user["department_id"])
    for fc in faculty_list:
        _send_push_to_user(
            user_id=fc["id"],
            title="New Club Join Request",
            body=f"{user.get('name', 'A student')} wants to join your club.",
            data={"club_id": club_id, "type": "join_request"},
        )

    return jsonify({"request": join_req[0] if isinstance(join_req, list) else join_req}), 201


@app.route("/api/clubs/<club_id>/join-requests", methods=["GET"])
def get_club_join_requests(club_id):
    from models import get_join_requests

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    requests_list = get_join_requests(club_id)
    return jsonify({"requests": requests_list})


@app.route("/api/clubs/join-requests/<req_id>", methods=["PATCH"])
def process_join_request(req_id):
    """Faculty coordinator approves or rejects a club join request."""
    from models import (add_club_member, get_user_by_id,
                        update_join_request_status)
    from models import supabase
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    status = data.get("status")
    if status not in ["approved", "rejected"]:
        return jsonify({"error": "Status must be 'approved' or 'rejected'."}), 400

    # Get the join request
    join_req = supabase.table("club_join_requests").select("*").eq("id", req_id).single().execute().data
    if not join_req:
        return jsonify({"error": "Join request not found."}), 404

    update_join_request_status(req_id, status)

    if status == "approved":
        # Add as club member
        add_club_member({
            "club_id": join_req["club_id"],
            "user_id": join_req["user_id"],
            "designation": "Volunteer" if join_req["request_type"] == "event_only" else "Member",
            "is_permanent": join_req["request_type"] == "permanent",
        })

    # Notify the applicant
    _send_push_to_user(
        user_id=join_req["user_id"],
        title=f"Club Application {status.title()}",
        body=f"Your club join request has been {status}.",
        data={"club_id": join_req["club_id"], "type": "join_request_response"},
    )

    return jsonify({"message": f"Join request {status}."})


# ─────────────────────────────────────────────────────────────────────────────
# Duty Leaves
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/duty-leaves", methods=["POST"])
@limiter.limit("10 per hour")
def create_duty_leave_route():
    """Organizer or volunteer submits a duty leave request."""
    from models import create_duty_leave, get_users_by_role
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["organizer", "volunteer"]:
        return jsonify({"error": "Only organizers and volunteers can request duty leave."}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    required = ["event_id", "name", "class", "batch", "roll_no", "date", "start_time", "end_time"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    data["user_id"] = user["id"]
    data["status"] = "pending"

    dl = create_duty_leave(data)
    dl_obj = dl[0] if isinstance(dl, list) else dl

    # Notify faculty coordinators
    faculty_list = get_users_by_role("faculty_coordinator", user["department_id"])
    for fc in faculty_list:
        _send_push_to_user(
            user_id=fc["id"],
            title="New Duty Leave Request",
            body=f"{user.get('name', 'A member')} submitted a duty leave for {data.get('date')}.",
            data={"duty_leave_id": dl_obj.get("id"), "type": "duty_leave"},
        )

    return jsonify({"duty_leave": dl_obj}), 201


@app.route("/api/duty-leaves", methods=["GET"])
def list_duty_leaves():
    """Faculty coordinator lists pending duty leaves; organizer lists their own."""
    from models import (get_duty_leaves_by_user, get_pending_duty_leaves)

    user = g.current_user
    if user.get("role") in ["faculty_coordinator", "hod", "super_admin"]:
        dept_id = user.get("department_id")
        duty_leaves = get_pending_duty_leaves(dept_id)
    else:
        duty_leaves = get_duty_leaves_by_user(user["id"])

    return jsonify({"duty_leaves": duty_leaves})


@app.route("/api/duty-leaves/<dl_id>", methods=["PATCH"])
def process_duty_leave(dl_id):
    """Faculty coordinator approves or rejects a duty leave."""
    from models import update_duty_leave_status
    from models import supabase
    from notification_utils import send_email_notification
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    status = data.get("status")
    if status not in ["approved", "rejected"]:
        return jsonify({"error": "Status must be 'approved' or 'rejected'."}), 400

    update_duty_leave_status(dl_id, status, user["id"])

    # Get duty leave and notify the requester
    dl = supabase.table("duty_leaves").select("*, events(title)").eq("id", dl_id).single().execute().data
    if dl:
        _send_push_to_user(
            user_id=dl["user_id"],
            title=f"Duty Leave {status.title()}",
            body=f"Your duty leave for {dl.get('date', '')} has been {status}.",
            data={"duty_leave_id": dl_id, "type": "duty_leave_response"},
        )
        if status == "approved":
            send_email_notification(
                user_id=dl["user_id"],
                subject="Duty Leave Approved",
                body=f"Your duty leave request for {dl.get('date', '')} has been approved.",
                trigger_type="duty_leave_approved",
                event_id=dl.get("event_id"),
            )

    return jsonify({"message": f"Duty leave {status}."})


# ─────────────────────────────────────────────────────────────────────────────
# Gallery
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/<event_id>/gallery", methods=["GET"])
def get_event_gallery(event_id):
    from models import get_gallery
    gallery = get_gallery(event_id)
    return jsonify({"gallery": gallery})


@app.route("/api/events/<event_id>/gallery", methods=["POST"])
@limiter.limit("20 per hour")
def upload_gallery_image(event_id):
    """Upload image to event gallery (organizer/HOD only)."""
    from models import add_gallery_image
    from security import validate_image_file
    import cloudinary
    import cloudinary.uploader

    user = g.current_user
    if user.get("role") not in ["organizer", "hod", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    file = request.files.get("image")
    caption = request.form.get("caption", "")
    image_type = request.form.get("type", "photo")

    if not file:
        return jsonify({"error": "Image file is required."}), 400

    is_valid, error_msg = validate_image_file(file)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    # Upload to Cloudinary
    try:
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        )
        result = cloudinary.uploader.upload(
            file,
            folder=f"ltsu_events/gallery/{event_id}",
            allowed_formats=["jpg", "jpeg", "png", "webp"],
        )
        image_url = result["secure_url"]
    except Exception as exc:
        return jsonify({"error": f"Upload failed: {exc}"}), 500

    gallery_item = add_gallery_image({
        "event_id": event_id,
        "image_url": image_url,
        "uploaded_by": user["id"],
        "caption": caption,
        "type": image_type,
    })

    return jsonify({"gallery_item": gallery_item[0] if isinstance(gallery_item, list) else gallery_item}), 201


@app.route("/api/gallery/<image_id>", methods=["DELETE"])
def delete_gallery_image_route(image_id):
    from models import delete_gallery_image

    user = g.current_user
    if user.get("role") not in ["organizer", "hod", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    delete_gallery_image(image_id)
    return jsonify({"message": "Image deleted."})


# ─────────────────────────────────────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/notifications", methods=["GET"])
def list_notifications():
    from models import get_unread_count, get_user_notifications
    user = g.current_user
    notifications = get_user_notifications(user["id"])
    unread = get_unread_count(user["id"])
    return jsonify({"notifications": notifications, "unread_count": unread})


@app.route("/api/notifications/<notif_id>/read", methods=["PATCH"])
def mark_notification_read_route(notif_id):
    from models import mark_notification_read
    mark_notification_read(notif_id)
    return jsonify({"message": "Notification marked as read."})


@app.route("/api/notifications/read-all", methods=["PATCH"])
def mark_all_read():
    from models import mark_all_notifications_read
    mark_all_notifications_read(g.current_user["id"])
    return jsonify({"message": "All notifications marked as read."})


@app.route("/api/auth/fcm-token", methods=["PATCH"])
def update_fcm_token():
    """Update the user's Firebase FCM push notification token."""
    from models import update_user
    from security import sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    token = data.get("fcm_token", "").strip()
    if not token:
        return jsonify({"error": "fcm_token is required."}), 400

    update_user(g.current_user["id"], {"fcm_token": token})
    return jsonify({"message": "FCM token updated."})


# ─────────────────────────────────────────────────────────────────────────────
# Money Collection
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/<event_id>/money-collection", methods=["GET"])
def get_money_collection_route(event_id):
    """Get money collection data. Class Incharge/CR see only their class."""
    from models import (get_money_collection,
                        get_money_collection_by_class)

    user = g.current_user
    role = user.get("role")

    if role in ["class_incharge", "cr"]:
        # Strict class isolation
        data = get_money_collection_by_class(
            event_id,
            user.get("year", ""),
            user.get("branch", ""),
            user.get("section", ""),
        )
        return jsonify({"collection": [data] if data else []})

    if role not in ["faculty_coordinator", "hod", "super_admin", "organizer"]:
        return jsonify({"error": "Forbidden"}), 403

    collection = get_money_collection(event_id)
    return jsonify({"collection": collection})


@app.route("/api/events/<event_id>/money-collection", methods=["POST"])
def upsert_money_collection_route(event_id):
    """Class Incharge/CR update their class money collection."""
    from models import upsert_money_collection
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["class_incharge", "cr", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    data["event_id"] = event_id

    # Always require department_id for this table.
    if user.get("role") == "super_admin":
        data["department_id"] = data.get("department_id") or user.get("department_id")
    else:
        data["department_id"] = user.get("department_id")

    # For class_incharge and cr, enforce their class only
    if user.get("role") in ["class_incharge", "cr"]:
        data["year"] = user.get("year", "")
        data["branch"] = user.get("branch", "")
        data["section"] = user.get("section", "")
        data["collected_by"] = user["id"]

    result = upsert_money_collection(data)
    return jsonify({"collection": result[0] if isinstance(result, list) else result})


# ─────────────────────────────────────────────────────────────────────────────
# Attendance
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/<event_id>/attendance", methods=["GET"])
def event_attendance(event_id):
    from models import get_attendance_count, get_attendance_for_event

    user = g.current_user
    if user.get("role") not in ["organizer", "volunteer", "faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    attendance = get_attendance_for_event(event_id)
    return jsonify({"attendance": attendance, "count": get_attendance_count(event_id)})


@app.route("/api/attendance/manual", methods=["POST"])
def manual_attendance():
    """Volunteer marks attendance manually (offline mode)."""
    from models import check_already_attended, mark_attendance
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["volunteer", "organizer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    registration_id = data.get("registration_id")
    if not registration_id:
        return jsonify({"error": "registration_id is required."}), 400

    if check_already_attended(registration_id):
        return jsonify({"message": "Already checked in.", "already_attended": True})

    mark_attendance({
        "registration_id": registration_id,
        "marked_by": user["id"],
        "method": "manual",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({"message": "Attendance marked manually.", "already_attended": False}), 201


# ─────────────────────────────────────────────────────────────────────────────
# AI Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/ai/feed", methods=["POST"])
@limiter.limit("30 per hour")
def ai_event_feed():
    """Get personalized event recommendations for a student."""
    from ai_utils import get_personalized_feed
    from models import (get_events_by_department,
                        get_student_registrations)

    user = g.current_user
    events = get_events_by_department(user.get("department_id", ""))
    past_registrations = get_student_registrations(user["id"])

    recommendations = get_personalized_feed(
        student_profile={
            "role": user.get("role"),
            "year": user.get("year"),
            "branch": user.get("branch"),
            "department_id": user.get("department_id"),
        },
        available_events=events,
        past_registrations=past_registrations,
    )
    return jsonify({"feed": recommendations})


@app.route("/api/ai/verify-payment", methods=["POST"])
@limiter.limit("20 per hour")
def ai_verify_payment():
    """Gemini Vision verifies a UPI payment screenshot."""
    from ai_utils import verify_payment_screenshot
    from security import validate_image_file

    file = request.files.get("screenshot")
    expected_amount = float(request.form.get("expected_amount", 0))

    if not file:
        return jsonify({"error": "screenshot file is required."}), 400

    is_valid, error_msg = validate_image_file(file)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    image_bytes = file.read()
    mime = file.content_type or "image/png"

    result = verify_payment_screenshot(image_bytes, expected_amount, mime)
    return jsonify(result)


@app.route("/api/ai/suggest-form", methods=["POST"])
@limiter.limit("30 per hour")
def ai_suggest_form():
    """Gemini suggests form fields based on event type."""
    from ai_utils import suggest_form_fields
    from security import sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    event_type = data.get("event_type", "")
    event_title = data.get("event_title", "")

    if not event_type:
        return jsonify({"error": "event_type is required."}), 400

    suggestions = suggest_form_fields(event_type, event_title)
    return jsonify({"suggestions": suggestions})


@app.route("/api/ai/draft-message", methods=["POST"])
@limiter.limit("20 per hour")
def ai_draft_message():
    """Gemini generates WhatsApp/email announcement for an event."""
    from ai_utils import draft_event_announcement
    from security import sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    event_details = data.get("event_details", {})
    message_type = data.get("type", "whatsapp")  # whatsapp | email

    draft = draft_event_announcement(event_details, message_type)
    return jsonify({"draft": draft})


@app.route("/api/ai/chatbot", methods=["POST"])
@limiter.limit("60 per hour")
def ai_chatbot():
    """Groq-powered student chatbot for event questions."""
    from ai_utils import answer_student_question
    from models import get_all_live_events
    from security import sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "message is required."}), 400

    events = get_all_live_events()
    answer = answer_student_question(message, events)
    return jsonify({"answer": answer})


@app.route("/api/ai/threat-log", methods=["GET"])
def ai_threat_log():
    """Groq analyzes login patterns for suspicious activity."""
    from models import get_all_flagged_attempts, get_recent_login_attempts
    from threat_detection import analyze_login_patterns
    from models import supabase

    user = g.current_user
    if user.get("role") not in ["super_admin", "faculty_coordinator"]:
        return jsonify({"error": "Forbidden"}), 403

    # Get all recent login attempts
    recent = supabase.table("login_attempts").select("*").order("attempted_at", desc=True).limit(100).execute().data
    analysis = analyze_login_patterns(recent)
    flagged = get_all_flagged_attempts()
    return jsonify({"analysis": analysis, "flagged_attempts": flagged})


# ─────────────────────────────────────────────────────────────────────────────
# Panic Button
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/events/<event_id>/panic", methods=["POST"])
@limiter.limit("2 per hour")
def trigger_panic(event_id):
    """Organizer triggers emergency alert to all registered attendees."""
    from models import (get_event_by_id, get_registrations_for_event,
                        get_user_by_id, log_login_attempt)
    from notification_utils import send_push_to_multiple
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "super_admin"]:
        return jsonify({"error": "Forbidden — only organizers can trigger the panic button."}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    emergency_message = data.get("message", "Emergency! Please evacuate immediately.")

    event = get_event_by_id(event_id)
    if not event:
        return jsonify({"error": "Event not found."}), 404

    # Get all confirmed registrations
    registrations = get_registrations_for_event(event_id)
    fcm_tokens = []
    for reg in registrations:
        student = get_user_by_id(reg["student_id"])
        if student and student.get("fcm_token"):
            fcm_tokens.append(student["fcm_token"])

    result = send_push_to_multiple(
        tokens=fcm_tokens,
        title=f"🚨 EMERGENCY: {event.get('title', 'Event')}",
        body=emergency_message,
        data={"event_id": event_id, "type": "panic"},
    )

    return jsonify({
        "sent": result.get("success_count", 0),
        "failed": result.get("failure_count", 0),
        "total_registered": len(registrations),
        "message": "Emergency notification sent to all registered attendees.",
    })


# ─────────────────────────────────────────────────────────────────────────────
# Public Event Highlights
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/highlights", methods=["GET"])
def public_highlights():
    from models import get_all_highlights
    return jsonify({"highlights": get_all_highlights()})


@app.route("/api/events/<event_id>/highlights", methods=["POST"])
def add_event_highlight(event_id):
    from models import create_event_highlight
    from security import sanitize_input

    user = g.current_user
    if user.get("role") not in ["organizer", "faculty_coordinator", "hod", "super_admin"]:
        return jsonify({"error": "Forbidden"}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    data["event_id"] = event_id
    highlight = create_event_highlight(data)
    return jsonify({"highlight": highlight[0] if isinstance(highlight, list) else highlight}), 201


# ─────────────────────────────────────────────────────────────────────────────
# Users (Super Admin)
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/users", methods=["GET"])
def list_users():
    from models import get_all_users, get_users_by_department

    user = g.current_user
    if user.get("role") == "super_admin":
        users = get_all_users()
    elif user.get("role") in ["hod", "faculty_coordinator"]:
        users = get_users_by_department(user["department_id"])
    else:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify({"users": users, "count": len(users)})


@app.route("/api/users/<user_id>", methods=["PATCH"])
def admin_update_user(user_id):
    """Role/privilege administration.

    - super_admin: can update any user role/secondary_role/department.
    - hod: can update only users in same department, excluding hod/super_admin.
    """
    from models import get_user_by_id, update_user
    from security import sanitize_input

    user = g.current_user
    actor_role = user.get("role")
    if actor_role not in ["super_admin", "hod"]:
        return jsonify({"error": "Forbidden — super admin or HOD only."}), 403

    target = get_user_by_id(user_id)
    if not target:
        return jsonify({"error": "User not found."}), 404

    if str(target.get("id")) == str(user.get("id")):
        return jsonify({"error": "You cannot update your own role from this page."}), 400

    data = sanitize_input(request.get_json(force=True) or {})

    valid_roles = {
        "super_admin",
        "hod",
        "faculty_coordinator",
        "class_incharge",
        "organizer",
        "volunteer",
        "cr",
        "student",
    }

    new_role = data.get("role")
    secondary_role = data.get("secondary_role")

    if new_role and new_role not in valid_roles:
        return jsonify({"error": "Invalid role value."}), 400

    if secondary_role is not None and secondary_role not in valid_roles:
        return jsonify({"error": "Invalid secondary_role value."}), 400

    if new_role and secondary_role and new_role == secondary_role:
        return jsonify({"error": "role and secondary_role cannot be the same."}), 400

    if actor_role == "hod":
        if str(target.get("department_id")) != str(user.get("department_id")):
            return jsonify({"error": "Forbidden — cross-department role changes are not allowed."}), 403

        if target.get("role") in ["super_admin", "hod"]:
            return jsonify({"error": "Forbidden — HOD cannot modify HOD or super admin users."}), 403

        hod_assignable_roles = {
            "faculty_coordinator",
            "class_incharge",
            "organizer",
            "volunteer",
            "cr",
            "student",
        }

        if new_role and new_role not in hod_assignable_roles:
            return jsonify({"error": "Forbidden — HOD can only assign lower-level roles."}), 403

        if secondary_role and secondary_role not in hod_assignable_roles:
            return jsonify({"error": "Forbidden — invalid secondary role for HOD scope."}), 403

        # HOD can manage role privileges, not department placement.
        data.pop("department_id", None)

    # Only allow role escalation fields from this endpoint.
    allowed_keys = {"role", "secondary_role", "department_id"}
    data = {k: v for k, v in data.items() if k in allowed_keys}

    if actor_role != "super_admin":
        data.pop("department_id", None)

    if not data:
        return jsonify({"error": "No valid fields to update."}), 400

    updated = update_user(user_id, data)
    return jsonify({"user": updated[0] if isinstance(updated, list) else updated})


# ─────────────────────────────────────────────────────────────────────────────
# Venues (Super Admin)
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/venues", methods=["GET"])
def list_venues():
    from models import get_all_venues
    return jsonify({"venues": get_all_venues()})


@app.route("/api/venues", methods=["POST"])
def create_venue_route():
    from models import supabase
    from security import sanitize_input

    user = g.current_user
    if user.get("role") != "super_admin":
        return jsonify({"error": "Forbidden — super admin only."}), 403

    data = sanitize_input(request.get_json(force=True) or {})
    venue = supabase.table("venues").insert(data).execute().data
    return jsonify({"venue": venue[0] if isinstance(venue, list) else venue}), 201


@app.route("/api/venues/<venue_id>/bookings", methods=["GET"])
def venue_booking_calendar(venue_id):
    """Get all bookings for a venue (for calendar display)."""
    from models import get_bookings_for_venue
    bookings = get_bookings_for_venue(venue_id)
    return jsonify({"bookings": bookings})


@app.route("/api/venues/conflict-check", methods=["POST"])
def venue_conflict_check():
    """Check if a venue is available for a given time slot."""
    from security import sanitize_input
    from venue_utils import check_venue_conflict

    data = sanitize_input(request.get_json(force=True) or {})
    required = ["venue_id", "start_time", "end_time"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    result = check_venue_conflict(
        venue_id=data["venue_id"],
        requested_start=data["start_time"],
        requested_end=data["end_time"],
        exclude_event_id=data.get("exclude_event_id"),
    )
    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# Security / Threat Detection
# ─────────────────────────────────────────────────────────────────────────────


@app.route("/api/security/log-attempt", methods=["POST"])
@limiter.limit("100 per hour")
def log_login_attempt_route():
    """Log a login attempt for threat analysis."""
    from models import log_login_attempt
    from security import get_client_ip, is_ip_blocked, sanitize_input

    data = sanitize_input(request.get_json(force=True) or {})
    ip = get_client_ip()

    if is_ip_blocked(ip):
        return jsonify({"error": "Your IP has been temporarily blocked due to too many failed login attempts."}), 429

    log_login_attempt({
        "clerk_user_id": data.get("clerk_user_id", ""),
        "ip_address": ip,
        "attempted_at": datetime.now(timezone.utc).isoformat(),
        "success": data.get("success", False),
        "flagged_by_ai": False,
    })
    return jsonify({"logged": True})


@app.route("/api/security/analyze", methods=["GET"])
def security_analyze():
    """Super admin triggers AI threat analysis."""
    from models import supabase
    from threat_detection import analyze_login_patterns

    user = g.current_user
    if user.get("role") != "super_admin":
        return jsonify({"error": "Forbidden"}), 403

    attempts = supabase.table("login_attempts").select("*").order("attempted_at", desc=True).limit(200).execute().data
    result = analyze_login_patterns(attempts)
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
