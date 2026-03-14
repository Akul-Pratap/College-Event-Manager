import json
import os

import firebase_admin
from firebase_admin import credentials, messaging


def _resolve_firebase_credentials():
    # Priority 1: full JSON in env (best for CI/CD and secret managers).
    raw_json = (os.getenv("FIREBASE_SERVICE_ACCOUNT") or "").strip()
    if raw_json:
        try:
            return credentials.Certificate(json.loads(raw_json))
        except json.JSONDecodeError:
            return None

    # Priority 2: standard Google credentials env path.
    gac_path = (os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or "").strip()
    if gac_path:
        path = gac_path
        if not os.path.isabs(path):
            path = os.path.join(os.path.dirname(__file__), path)
        if os.path.exists(path):
            return credentials.Certificate(path)

    # Priority 3: project-specific fallback path.
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
    if service_account_path:
        path = service_account_path
        if not os.path.isabs(path):
            path = os.path.join(os.path.dirname(__file__), path)
        if os.path.exists(path):
            return credentials.Certificate(path)

    return None


# Initialize once at startup when credentials are available.
if not firebase_admin._apps:
    cred = _resolve_firebase_credentials()
    if cred is not None:
        firebase_admin.initialize_app(cred)


def send_push_notification(token, title, body, data=None):
    payload = data or {}
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data={str(k): str(v) for k, v in payload.items()},
        token=token,
    )
    response = messaging.send(message)
    return response


def send_push_to_many(tokens, title, body, data=None):
    payload = data or {}
    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data={str(k): str(v) for k, v in payload.items()},
        tokens=tokens,
    )
    response = messaging.send_each_for_multicast(message)
    return response


# Backward compatibility with existing app imports/callers
send_push_to_multiple = send_push_to_many


def send_email_notification(*args, **kwargs):
    return {
        "success": False,
        "error": "send_email_notification is not implemented in notification_utils.py",
    }
