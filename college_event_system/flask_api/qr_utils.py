"""
qr_utils.py — AES-256 QR code generator and decryptor using PyCryptodome
LTSU College Event Management System
"""

import base64
import json
import os
from io import BytesIO

import qrcode
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# Load and normalise the secret key to exactly 32 bytes
_raw_key = os.getenv("QR_SECRET_KEY", "default_key_replace_in_production!!")
QR_SECRET_KEY: bytes = _raw_key.encode("utf-8")[:32].ljust(32, b"\0")


# ─────────────────────────────────────────────────────────────────────────────
# Encryption / Decryption
# ─────────────────────────────────────────────────────────────────────────────


def encrypt_ticket_data(data: dict) -> str:
    """
    Encrypt a ticket dict using AES-256-CBC.

    Returns a URL-safe base64 string containing:
        [16-byte IV] + [ciphertext]
    """
    iv = os.urandom(16)
    cipher = AES.new(QR_SECRET_KEY, AES.MODE_CBC, iv)
    plaintext = json.dumps(data, separators=(",", ":")).encode("utf-8")
    ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
    combined = iv + ciphertext
    return base64.urlsafe_b64encode(combined).decode("utf-8")


def decrypt_ticket_data(token: str) -> dict:
    """
    Decrypt a URL-safe base64 token back to the original ticket dict.

    Raises ValueError if the token is invalid or tampered.
    """
    try:
        raw = base64.urlsafe_b64decode(token.encode("utf-8"))
    except Exception as exc:
        raise ValueError(f"Invalid base64 token: {exc}") from exc

    if len(raw) < 32:
        raise ValueError("Token too short — must contain IV + ciphertext")

    iv = raw[:16]
    ciphertext = raw[16:]

    try:
        cipher = AES.new(QR_SECRET_KEY, AES.MODE_CBC, iv)
        plaintext = unpad(cipher.decrypt(ciphertext), AES.block_size)
        return json.loads(plaintext.decode("utf-8"))
    except (ValueError, KeyError) as exc:
        raise ValueError(f"Decryption failed — token may be tampered: {exc}") from exc


# ─────────────────────────────────────────────────────────────────────────────
# QR Code Generation
# ─────────────────────────────────────────────────────────────────────────────


def generate_qr_image(data: dict) -> BytesIO:
    """
    Generate a PNG QR code image for the given ticket data dict.

    The QR code payload is the AES-encrypted, URL-safe base64 token.
    Returns a BytesIO buffer positioned at byte 0, ready for HTTP response.
    """
    encrypted_token = encrypt_ticket_data(data)

    qr = qrcode.QRCode(
        version=None,  # auto-size
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(encrypted_token)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def generate_qr_base64(data: dict) -> str:
    """
    Generate a QR code and return it as a base64-encoded PNG string,
    suitable for embedding in a JSON response or HTML <img> tag:
        data:image/png;base64,<string>
    """
    buf = generate_qr_image(data)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


# ─────────────────────────────────────────────────────────────────────────────
# Verification
# ─────────────────────────────────────────────────────────────────────────────


def verify_qr_token(token: str) -> tuple[bool, dict]:
    """
    Verify and decrypt a scanned QR token.

    Returns:
        (True,  ticket_data_dict)  — on success
        (False, {"error": "..."})  — on failure
    """
    try:
        data = decrypt_ticket_data(token)
        return True, data
    except Exception as exc:
        return False, {"error": str(exc)}


def build_ticket_payload(
    registration_id: str,
    event_id: str,
    student_id: str,
    event_title: str,
    student_name: str,
    event_date: str,
) -> dict:
    """
    Build the standard ticket payload dict that gets encrypted into the QR code.
    All fields are strings to keep JSON compact.
    """
    return {
        "registration_id": registration_id,
        "event_id": event_id,
        "student_id": student_id,
        "event_title": event_title,
        "student_name": student_name,
        "event_date": event_date,
        "issuer": "LTSU-Events",
    }
