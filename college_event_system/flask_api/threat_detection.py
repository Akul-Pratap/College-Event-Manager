"""
threat_detection.py — Groq-powered login pattern analysis and suspicious activity flagging
LTSU College Event Management System — Flask API
"""

import json
import os
import re
from datetime import datetime, timezone

from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
GROQ_MODEL = "llama3-8b-8192"


# ─────────────────────────────────────────────────────────────────────────────
# Threat Analysis Prompts
# ─────────────────────────────────────────────────────────────────────────────

THREAT_SYSTEM_PROMPT = """You are a cybersecurity analyst for a college event management system.
Analyze login attempt patterns and identify suspicious activity.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.
"""

PATTERN_ANALYSIS_PROMPT = """Analyze these login attempt records and identify any suspicious patterns.

Login attempts:
{attempts}

Look for:
1. Rapid repeated failures from the same IP
2. Credential stuffing (many different usernames from one IP)
3. Distributed brute force (same username, many IPs)
4. Unusual login times (e.g., 2–5 AM)
5. Impossible travel (same user, different geolocations quickly)
6. Sequential or predictable patterns in failed attempts

Respond with this exact JSON structure:
{{
  "threat_level": "low|medium|high|critical",
  "threats_detected": [
    {{
      "type": "brute_force|credential_stuffing|distributed_attack|anomalous_time|other",
      "description": "...",
      "affected_users": ["..."],
      "affected_ips": ["..."],
      "confidence": 0.0
    }}
  ],
  "recommended_actions": ["..."],
  "summary": "..."
}}
"""

ANOMALY_PROMPT = """A user just performed an action in a college event system.
Determine if this is suspicious.

User profile:
{user_profile}

Current action:
{action}

Recent activity history:
{history}

Respond with this exact JSON:
{{
  "is_suspicious": true or false,
  "risk_score": 0.0,
  "reason": "...",
  "recommended_action": "allow|warn|block|require_2fa"
}}
"""


# ─────────────────────────────────────────────────────────────────────────────
# Core Analysis Functions
# ─────────────────────────────────────────────────────────────────────────────


def analyze_login_patterns(attempts: list[dict]) -> dict:
    """
    Use Groq LLM to analyze a batch of login attempt records.

    Args:
        attempts: List of login_attempts rows from Supabase.

    Returns:
        {
            "threat_level": "low|medium|high|critical",
            "threats_detected": [...],
            "recommended_actions": [...],
            "summary": "..."
        }
    """
    if not attempts:
        return {
            "threat_level": "low",
            "threats_detected": [],
            "recommended_actions": [],
            "summary": "No login attempts to analyze.",
        }

    # Truncate to last 100 attempts to stay within token limits
    recent = attempts[-100:]

    # Sanitize — only pass safe fields to the AI
    safe_attempts = [
        {
            "id": a.get("id", ""),
            "clerk_user_id": a.get("clerk_user_id", "")[:12] + "...",  # partial
            "ip_address": a.get("ip_address", ""),
            "attempted_at": a.get("attempted_at", ""),
            "success": a.get("success", False),
            "flagged_by_ai": a.get("flagged_by_ai", False),
        }
        for a in recent
    ]

    prompt = PATTERN_ANALYSIS_PROMPT.format(
        attempts=json.dumps(safe_attempts, indent=2)
    )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": THREAT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content.strip()
        result = _parse_json_response(raw)
        return result
    except Exception as exc:
        return {
            "threat_level": "unknown",
            "threats_detected": [],
            "recommended_actions": [],
            "summary": f"Analysis failed: {str(exc)}",
            "error": str(exc),
        }


def analyze_user_action(user_profile: dict, action: dict, history: list[dict]) -> dict:
    """
    Analyze a single user action for anomalous behavior using Groq.

    Args:
        user_profile: Sanitized user info (role, department, year, etc.)
        action:       The action being performed (endpoint, payload summary, timestamp)
        history:      Last 10 recent actions by this user

    Returns:
        {
            "is_suspicious": bool,
            "risk_score": float (0.0–1.0),
            "reason": str,
            "recommended_action": "allow|warn|block|require_2fa"
        }
    """
    # Sanitize user profile — remove PII
    safe_profile = {
        "role": user_profile.get("role", ""),
        "department_id": user_profile.get("department_id", ""),
        "year": user_profile.get("year", ""),
        "branch": user_profile.get("branch", ""),
    }

    prompt = ANOMALY_PROMPT.format(
        user_profile=json.dumps(safe_profile),
        action=json.dumps(action),
        history=json.dumps(history[-10:]),
    )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": THREAT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=512,
        )
        raw = response.choices[0].message.content.strip()
        return _parse_json_response(raw)
    except Exception as exc:
        # Fail open — allow the action if AI is unavailable
        return {
            "is_suspicious": False,
            "risk_score": 0.0,
            "reason": f"AI analysis unavailable: {str(exc)}",
            "recommended_action": "allow",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Rule-Based Pre-Checks  (fast, no LLM call needed)
# ─────────────────────────────────────────────────────────────────────────────


def quick_threat_check(ip: str, attempts_in_window: int) -> dict:
    """
    Fast rule-based check — runs before the LLM for obvious threats.

    Returns:
        { "blocked": bool, "reason": str, "threat_level": str }
    """
    if attempts_in_window >= 20:
        return {
            "blocked": True,
            "reason": f"IP {ip} made {attempts_in_window} failed attempts — critical brute force.",
            "threat_level": "critical",
        }
    if attempts_in_window >= 10:
        return {
            "blocked": True,
            "reason": f"IP {ip} exceeded the {10}-attempt rate limit.",
            "threat_level": "high",
        }
    if attempts_in_window >= 5:
        return {
            "blocked": False,
            "reason": f"IP {ip} has {attempts_in_window} failed attempts — monitoring.",
            "threat_level": "medium",
        }
    return {
        "blocked": False,
        "reason": "No immediate threat detected.",
        "threat_level": "low",
    }


def detect_sql_injection(value: str) -> bool:
    """
    Lightweight SQL injection pattern detector for input values.
    Not a substitute for parameterized queries — use as an extra layer.
    """
    sqli_patterns = [
        r"(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\s",
        r"'[\s]*OR[\s]*'",
        r"'[\s]*=[\s]*'",
        r"--[\s]",
        r"/\*.*\*/",
        r";\s*(DROP|DELETE|UPDATE|INSERT)",
        r"CHAR\(\d+\)",
        r"0x[0-9a-fA-F]+",
    ]
    text = str(value).upper()
    for pattern in sqli_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def detect_xss_attempt(value: str) -> bool:
    """
    Lightweight XSS payload detector.
    bleach.clean() in security.py is the primary defense — this is a secondary flag.
    """
    xss_patterns = [
        r"<script[\s>]",
        r"javascript\s*:",
        r"on\w+\s*=",  # onerror=, onload=, etc.
        r"<\s*iframe",
        r"<\s*img[^>]*src\s*=",
        r"document\.cookie",
        r"eval\s*\(",
        r"window\.location",
    ]
    for pattern in xss_patterns:
        if re.search(pattern, str(value), re.IGNORECASE):
            return True
    return False


def scan_request_payload(payload: dict) -> dict:
    """
    Scan all string values in a request payload for SQLi and XSS patterns.

    Returns:
        {
            "clean": bool,
            "threats": [{ "field": str, "type": "sqli|xss", "value_preview": str }]
        }
    """
    threats = []
    _scan_recursive(payload, threats, path="")

    return {
        "clean": len(threats) == 0,
        "threats": threats,
    }


def _scan_recursive(obj, threats: list, path: str):
    if isinstance(obj, dict):
        for k, v in obj.items():
            _scan_recursive(v, threats, path=f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            _scan_recursive(item, threats, path=f"{path}[{i}]")
    elif isinstance(obj, str):
        preview = obj[:80] + ("..." if len(obj) > 80 else "")
        if detect_sql_injection(obj):
            threats.append({"field": path, "type": "sqli", "value_preview": preview})
        if detect_xss_attempt(obj):
            threats.append({"field": path, "type": "xss", "value_preview": preview})


# ─────────────────────────────────────────────────────────────────────────────
# Flag & Report Helpers
# ─────────────────────────────────────────────────────────────────────────────


def flag_suspicious_attempts(attempt_ids: list[str]) -> None:
    """Mark a list of login_attempts rows as flagged_by_ai=True."""
    try:
        from models import flag_login_attempt

        for attempt_id in attempt_ids:
            flag_login_attempt(attempt_id)
    except Exception:
        pass


def build_threat_report(analysis_result: dict, timestamp: str | None = None) -> dict:
    """
    Wrap an analysis result in a structured threat report envelope.
    """
    return {
        "report_generated_at": timestamp or datetime.now(timezone.utc).isoformat(),
        "system": "LTSU-Events Threat Detection",
        "ai_model": GROQ_MODEL,
        "analysis": analysis_result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# JSON Parser Helper
# ─────────────────────────────────────────────────────────────────────────────


def _parse_json_response(raw: str) -> dict:
    """
    Robustly parse a JSON string that may be wrapped in markdown code fences.
    """
    # Strip markdown code fences if present
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.IGNORECASE)
    raw = re.sub(r"\n?```$", "", raw.strip())

    # Try direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try to extract first {...} block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return {"error": "Failed to parse AI response", "raw": raw[:500]}
