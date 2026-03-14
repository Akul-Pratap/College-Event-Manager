"""
security.py — XSS sanitizer, file validator, brute-force blocker, role enforcer
LTSU College Event Management System — Flask API
"""

import hashlib
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import bleach
from flask import g, jsonify, request

# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE_MB = 5
BRUTE_FORCE_LIMIT = 10  # failed attempts before block
BRUTE_FORCE_WINDOW_MINUTES = 15  # rolling window

SAFE_HTML_TAGS = ["b", "i", "u", "em", "strong", "p", "br", "ul", "ol", "li"]
SAFE_HTML_ATTRS: dict = {}


# ─────────────────────────────────────────────────────────────────────────────
# XSS Sanitizer
# ─────────────────────────────────────────────────────────────────────────────


def sanitize_html(text: str) -> str:
    """Strip dangerous HTML — keep a small safe allowlist."""
    if not isinstance(text, str):
        return text
    return bleach.clean(
        text,
        tags=SAFE_HTML_TAGS,
        attributes=SAFE_HTML_ATTRS,
        strip=True,
    )


def sanitize_input(data: dict) -> dict:
    """
    Recursively sanitize all string values in a request payload dict.
    Handles nested dicts and lists.
    """
    if not isinstance(data, dict):
        return data
    clean: dict = {}
    for key, value in data.items():
        if isinstance(value, str):
            clean[key] = sanitize_html(value.strip())
        elif isinstance(value, dict):
            clean[key] = sanitize_input(value)
        elif isinstance(value, list):
            clean[key] = [
                sanitize_input(item)
                if isinstance(item, dict)
                else (sanitize_html(item.strip()) if isinstance(item, str) else item)
                for item in value
            ]
        else:
            clean[key] = value
    return clean


# ─────────────────────────────────────────────────────────────────────────────
# File Validator
# ─────────────────────────────────────────────────────────────────────────────


def validate_image_file(file) -> tuple[bool, str]:
    """
    Validate an uploaded image file.
    Checks: extension, MIME type, and file size.
    Returns (is_valid, error_message).
    """
    if file is None:
        return False, "No file provided."

    filename: str = getattr(file, "filename", "") or ""
    if not filename:
        return False, "Filename is empty."

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False, (
            f"Invalid file extension '{ext}'. "
            f"Allowed: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )

    mime: str = getattr(file, "content_type", "") or ""
    if mime and mime not in ALLOWED_IMAGE_MIMES:
        return False, f"Invalid MIME type '{mime}'."

    # Measure file size without loading the whole thing into memory
    file.seek(0, 2)  # seek to end
    size_bytes = file.tell()
    file.seek(0)  # rewind

    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if size_bytes > max_bytes:
        return (
            False,
            f"File too large ({size_bytes // 1024} KB). Max is {MAX_FILE_SIZE_MB} MB.",
        )

    return True, ""


# ─────────────────────────────────────────────────────────────────────────────
# Image Hashing  (duplicate-screenshot detection)
# ─────────────────────────────────────────────────────────────────────────────


def hash_image_bytes(file_bytes: bytes) -> str:
    """Return a SHA-256 hex digest of the raw image bytes."""
    return hashlib.sha256(file_bytes).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# IP / Brute-Force Helpers
# ─────────────────────────────────────────────────────────────────────────────


def get_client_ip() -> str:
    """Extract the real client IP, respecting X-Forwarded-For."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def is_ip_blocked(ip: str) -> bool:
    """
    Return True if the IP has >= BRUTE_FORCE_LIMIT failed login attempts
    within the rolling window. Queries the Supabase login_attempts table.
    """
    try:
        from models import get_failed_attempts_by_ip  # local import to avoid circular

        cutoff = (
            datetime.now(timezone.utc) - timedelta(minutes=BRUTE_FORCE_WINDOW_MINUTES)
        ).isoformat()
        attempts = get_failed_attempts_by_ip(ip, cutoff)
        return len(attempts) >= BRUTE_FORCE_LIMIT
    except Exception:
        # Fail open — do not block if the DB is unreachable
        return False


def record_login_attempt(clerk_user_id: str, success: bool) -> None:
    """Persist a login attempt record for audit and brute-force detection."""
    try:
        from models import log_login_attempt

        log_login_attempt(
            {
                "clerk_user_id": clerk_user_id,
                "ip_address": get_client_ip(),
                "success": success,
                "flagged_by_ai": False,
            }
        )
    except Exception:
        pass  # Non-critical — don't crash the login flow


# ─────────────────────────────────────────────────────────────────────────────
# Role-Based Access Decorator
# ─────────────────────────────────────────────────────────────────────────────


def require_roles(allowed_roles: list[str]):
    """
    Flask route decorator — enforces role-based access control.

    Usage:
        @app.route('/api/events', methods=['POST'])
        @require_roles(['organizer', 'faculty_coordinator'])
        def create_event():
            ...

    The JWT middleware (app.py: verify_jwt) must have already populated
    flask.g.current_user before this decorator runs.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                return jsonify({"error": "Unauthorized — no valid session."}), 401
            if user.get("role") not in allowed_roles:
                return jsonify(
                    {
                        "error": "Forbidden — your role does not have access to this resource.",
                        "your_role": user.get("role"),
                        "required_roles": allowed_roles,
                    }
                ), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


# ─────────────────────────────────────────────────────────────────────────────
# Department Isolation Guard
# ─────────────────────────────────────────────────────────────────────────────


def require_same_department(fn):
    """
    Decorator — ensures the requesting user belongs to the same department
    as the resource they are accessing.

    Expects the route to have a `dept_id` URL parameter OR the request JSON
    to contain a `department_id` field.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = getattr(g, "current_user", None)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        # Super admin bypasses department isolation
        if user.get("role") == "super_admin":
            return fn(*args, **kwargs)

        # Try to read target department from URL param or JSON body
        target_dept = kwargs.get("dept_id") or (
            request.get_json(silent=True) or {}
        ).get("department_id")

        if target_dept and str(target_dept) != str(user.get("department_id")):
            return jsonify(
                {"error": "Forbidden — cross-department access denied."}
            ), 403

        return fn(*args, **kwargs)

    return wrapper


# ─────────────────────────────────────────────────────────────────────────────
# Payload Size Guard
# ─────────────────────────────────────────────────────────────────────────────


def check_payload_size(max_kb: int = 100):
    """
    Decorator — rejects requests whose Content-Length header exceeds max_kb.

    Usage:
        @app.route('/api/upload', methods=['POST'])
        @check_payload_size(max_kb=5120)   # 5 MB
        def upload():
            ...
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            content_length = request.content_length or 0
            if content_length > max_kb * 1024:
                return jsonify(
                    {
                        "error": f"Payload too large. "
                        f"Max allowed: {max_kb} KB, received: {content_length // 1024} KB."
                    }
                ), 413
            return fn(*args, **kwargs)

        return wrapper

    return decorator


# ─────────────────────────────────────────────────────────────────────────────
# Secure Headers Helper  (used alongside Flask-Talisman)
# ─────────────────────────────────────────────────────────────────────────────

TALISMAN_CONFIG = {
    "force_https": True,
    "strict_transport_security": True,
    "strict_transport_security_max_age": 31536000,
    "strict_transport_security_include_subdomains": True,
    "content_security_policy": {
        "default-src": "'self'",
        "img-src": "* data:",
        "script-src": "'self'",
        "style-src": "'self' 'unsafe-inline'",
    },
    "referrer_policy": "strict-origin-when-cross-origin",
    "x_content_type_options": True,
    "x_frame_options": "DENY",
}
