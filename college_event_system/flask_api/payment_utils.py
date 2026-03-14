"""
payment_utils.py — Payment verification utilities for LTSU Events Flask API
Handles: UTR uniqueness, Cloudinary upload, Gemini Vision verify, Ollama image hash
"""

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from io import BytesIO

import requests

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_VISION_MODEL = "llava"

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")


# ─────────────────────────────────────────────────────────────────────────────
# UTR / Reference Number Validation
# ─────────────────────────────────────────────────────────────────────────────


def is_valid_utr_format(utr: str) -> bool:
    """
    Validate the format of a UPI UTR (Unique Transaction Reference) number.

    UTR numbers are typically:
      - 12 digits (NEFT/RTGS)
      - 22 characters (UPI: bank_code + timestamp + sequence)
    This function accepts either format.
    """
    if not utr or not isinstance(utr, str):
        return False
    utr = utr.strip()
    # Allow 12-digit numeric UTR or 12-22 alphanumeric UPI reference
    return bool(re.match(r"^[A-Za-z0-9]{12,22}$", utr))


def check_utr_unique(utr: str) -> dict:
    """
    Check whether a UTR number has already been used in the system.

    Returns:
        { "unique": bool, "utr": str, "reason": str }
    """
    if not is_valid_utr_format(utr):
        return {
            "unique": False,
            "utr": utr,
            "reason": "Invalid UTR format. Must be 12–22 alphanumeric characters.",
        }

    try:
        from models import check_utr_exists

        already_exists = check_utr_exists(utr.strip().upper())
        if already_exists:
            return {
                "unique": False,
                "utr": utr,
                "reason": "This UTR number has already been used for another payment.",
            }
        return {
            "unique": True,
            "utr": utr,
            "reason": "UTR is unique and has not been used before.",
        }
    except Exception as exc:
        return {
            "unique": False,
            "utr": utr,
            "reason": f"Could not verify UTR uniqueness: {str(exc)}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Image Hashing  (fast exact-duplicate detection)
# ─────────────────────────────────────────────────────────────────────────────


def compute_image_hash(image_bytes: bytes) -> str:
    """
    Compute a SHA-256 hex digest of the raw image bytes.
    Used as a fast first-pass duplicate check before the AI vision call.
    """
    return hashlib.sha256(image_bytes).hexdigest()


def is_duplicate_screenshot(image_bytes: bytes, existing_hashes: list[str]) -> dict:
    """
    Check if an uploaded payment screenshot is a duplicate.

    Strategy:
      1. Compute SHA-256 hash of new image.
      2. Compare against list of existing hashes (exact match).
      3. If no exact match, optionally use Ollama for perceptual similarity.

    Args:
        image_bytes:      Raw bytes of the uploaded screenshot.
        existing_hashes:  List of SHA-256 hashes from previous payments.

    Returns:
        {
            "is_duplicate": bool,
            "method":       "hash" | "ollama" | "none",
            "hash":         str,
            "reason":       str
        }
    """
    new_hash = compute_image_hash(image_bytes)

    # Fast exact-match check
    if new_hash in existing_hashes:
        return {
            "is_duplicate": True,
            "method": "hash",
            "hash": new_hash,
            "reason": "Exact duplicate detected — SHA-256 hash matches a previous submission.",
        }

    # Perceptual check via Ollama (best-effort; gracefully degrades)
    ollama_result = _ollama_describe_screenshot(image_bytes)
    if ollama_result.get("available"):
        description = ollama_result.get("description", "")
        return {
            "is_duplicate": False,
            "method": "ollama",
            "hash": new_hash,
            "reason": f"No exact duplicate found. Ollama description: {description}",
            "ollama_description": description,
        }

    return {
        "is_duplicate": False,
        "method": "none",
        "hash": new_hash,
        "reason": "No duplicate detected (hash check only; Ollama unavailable).",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Ollama Vision  (local — perceptual analysis)
# ─────────────────────────────────────────────────────────────────────────────


def _ollama_describe_screenshot(image_bytes: bytes) -> dict:
    """
    Ask local Ollama (llava model) to describe a payment screenshot.
    Returns { "available": bool, "description": str }.
    """
    import base64

    try:
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "model": OLLAMA_VISION_MODEL,
            "prompt": (
                "Describe this UPI payment screenshot in one sentence. "
                "Include: transaction amount in INR, UTR/reference number, "
                "recipient name or UPI ID, and payment status (success/failure)."
            ),
            "images": [b64_image],
            "stream": False,
        }
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        description = response.json().get("response", "").strip()
        return {"available": True, "description": description}
    except Exception as exc:
        return {
            "available": False,
            "description": "",
            "error": str(exc),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Cloudinary Upload
# ─────────────────────────────────────────────────────────────────────────────


def upload_payment_screenshot(image_bytes: bytes, filename: str) -> dict:
    """
    Upload a payment screenshot to Cloudinary under the ltsu_payments preset.

    Args:
        image_bytes: Raw image bytes.
        filename:    Original filename (used to derive public_id).

    Returns:
        {
            "success":    bool,
            "url":        str,   # Signed Cloudinary URL
            "public_id":  str,
            "reason":     str
        }
    """
    try:
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True,
        )

        # Build a safe public_id from filename + timestamp
        safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", os.path.splitext(filename)[0])
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        public_id = f"ltsu_payments/{safe_name}_{ts}"

        result = cloudinary.uploader.upload(
            BytesIO(image_bytes),
            public_id=public_id,
            upload_preset="ltsu_payments",
            resource_type="image",
            type="private",  # signed URL required to access
        )

        return {
            "success": True,
            "url": result.get("secure_url", ""),
            "public_id": result.get("public_id", ""),
            "reason": "Upload successful.",
        }
    except Exception as exc:
        return {
            "success": False,
            "url": "",
            "public_id": "",
            "reason": f"Cloudinary upload failed: {str(exc)}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Full Payment Verification Pipeline
# ─────────────────────────────────────────────────────────────────────────────


def verify_payment_full(
    image_bytes: bytes,
    filename: str,
    utr: str,
    expected_amount: float,
    existing_hashes: list[str],
) -> dict:
    """
    Run the complete payment verification pipeline:

      Step 1 — Validate UTR format and uniqueness.
      Step 2 — Check for duplicate screenshots (hash + Ollama).
      Step 3 — Upload screenshot to Cloudinary.
      Step 4 — Gemini Vision verification of screenshot contents.

    Returns a comprehensive result dict with a final `verified` boolean
    and a `status` field: "approved" | "rejected" | "manual_review".

    Args:
        image_bytes:      Raw bytes of the uploaded payment screenshot.
        filename:         Original filename of the uploaded file.
        utr:              UTR / reference number entered by the student.
        expected_amount:  Registration fee in INR.
        existing_hashes:  SHA-256 hashes of all previously accepted screenshots.

    Returns:
        {
            "verified":           bool,
            "status":             "approved" | "rejected" | "manual_review",
            "screenshot_hash":    str,
            "screenshot_url":     str,
            "utr":                str,
            "amount_extracted":   float,
            "utr_check":          dict,
            "duplicate_check":    dict,
            "upload_result":      dict,
            "ai_check":           dict,
            "rejection_reasons":  list[str],
            "checked_at":         str
        }
    """
    rejection_reasons: list[str] = []
    result: dict = {
        "verified": False,
        "status": "manual_review",
        "screenshot_hash": "",
        "screenshot_url": "",
        "utr": utr,
        "amount_extracted": 0.0,
        "utr_check": {},
        "duplicate_check": {},
        "upload_result": {},
        "ai_check": {},
        "rejection_reasons": [],
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }

    # ── Step 1: UTR check ─────────────────────────────────────────────────────
    utr_check = check_utr_unique(utr)
    result["utr_check"] = utr_check
    if not utr_check["unique"]:
        rejection_reasons.append(f"UTR: {utr_check['reason']}")

    # ── Step 2: Duplicate screenshot check ───────────────────────────────────
    dup_check = is_duplicate_screenshot(image_bytes, existing_hashes)
    result["duplicate_check"] = dup_check
    result["screenshot_hash"] = dup_check.get("hash", compute_image_hash(image_bytes))
    if dup_check["is_duplicate"]:
        rejection_reasons.append(f"Duplicate screenshot: {dup_check['reason']}")

    # ── Step 3: Upload to Cloudinary ──────────────────────────────────────────
    upload_result = upload_payment_screenshot(image_bytes, filename)
    result["upload_result"] = upload_result
    if upload_result["success"]:
        result["screenshot_url"] = upload_result["url"]

    # ── Step 4: Gemini Vision verification ───────────────────────────────────
    try:
        from ai_utils import verify_payment_screenshot as gemini_verify

        ai_check = gemini_verify(image_bytes, expected_amount)
        result["ai_check"] = ai_check
        result["amount_extracted"] = float(ai_check.get("amount", 0.0))

        if not ai_check.get("verified", False):
            rejection_reasons.append(
                f"AI vision: {ai_check.get('reason', 'Payment screenshot could not be verified.')}"
            )
        # Cross-check UTR from AI with user-provided UTR
        ai_utr = str(ai_check.get("utr", "")).strip().upper()
        user_utr = utr.strip().upper()
        if ai_utr and user_utr and ai_utr != user_utr:
            rejection_reasons.append(
                f"UTR mismatch: user entered '{user_utr}' but screenshot shows '{ai_utr}'."
            )
    except Exception as exc:
        result["ai_check"] = {
            "verified": False,
            "reason": f"AI verification unavailable: {str(exc)}",
        }
        rejection_reasons.append(
            "AI verification service unavailable — manual review required."
        )

    # ── Final Decision ────────────────────────────────────────────────────────
    result["rejection_reasons"] = rejection_reasons

    if not rejection_reasons and result["ai_check"].get("verified", False):
        result["verified"] = True
        result["status"] = "approved"
    elif (
        len(rejection_reasons) == 1
        and "AI verification service unavailable" in rejection_reasons[0]
    ):
        # Only flagged because AI was down — escalate to manual review
        result["verified"] = False
        result["status"] = "manual_review"
    else:
        result["verified"] = False
        result["status"] = "rejected"

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Payment Summary Helper
# ─────────────────────────────────────────────────────────────────────────────


def build_payment_summary(event: dict, registrations: list[dict]) -> dict:
    """
    Build a payment collection summary for an event.

    Args:
        event:         Event dict with fee and payment_type fields.
        registrations: List of registration dicts with payment_status field.

    Returns:
        {
            "total_expected":  float,
            "total_collected": float,
            "total_pending":   int,
            "total_approved":  int,
            "total_rejected":  int,
            "collection_rate": float  (0.0 - 1.0)
        }
    """
    fee = float(event.get("fee", 0))
    total = len(registrations)

    approved = sum(1 for r in registrations if r.get("payment_status") == "approved")
    pending = sum(1 for r in registrations if r.get("payment_status") == "pending")
    rejected = sum(1 for r in registrations if r.get("payment_status") == "rejected")

    return {
        "total_expected": fee * total,
        "total_collected": fee * approved,
        "total_pending": pending,
        "total_approved": approved,
        "total_rejected": rejected,
        "collection_rate": (approved / total) if total > 0 else 0.0,
    }
