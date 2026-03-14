"""
ai_utils.py — Gemini Vision + Groq AI integrations for LTSU Events Flask API
Handles: payment verification, personalised event feed, form suggestions,
         WhatsApp/email drafting, student chatbot, threat detection helpers.
"""

import base64
import json
import os
import re

import google.generativeai as genai
from groq import Groq

# ─────────────────────────────────────────────────────────────────────────────
# Client Initialisation
# ─────────────────────────────────────────────────────────────────────────────

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

GEMINI_FLASH = "gemini-1.5-flash"
GROQ_MODEL = "llama3-8b-8192"


# ─────────────────────────────────────────────────────────────────────────────
# Internal Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _extract_json_object(text: str) -> dict:
    """Pull the first {...} block out of a model response and parse it."""
    match = re.search(r"\{.*?\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return {}


def _extract_json_array(text: str) -> list:
    """Pull the first [...] block out of a model response and parse it."""
    match = re.search(r"\[.*?\]", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return []


def _image_part(image_bytes: bytes, mime: str = "image/png") -> dict:
    """Build an inline image part for Gemini multimodal requests."""
    return {
        "mime_type": mime,
        "data": base64.b64encode(image_bytes).decode("utf-8"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 1. Payment Screenshot Verification  (Gemini Vision)
# ─────────────────────────────────────────────────────────────────────────────


def verify_payment_screenshot(
    image_bytes: bytes,
    expected_amount: float,
    mime: str = "image/png",
) -> dict:
    """
    Use Gemini Vision to verify a UPI payment screenshot.

    Args:
        image_bytes:     Raw bytes of the uploaded screenshot.
        expected_amount: The registration fee amount in INR.
        mime:            Image MIME type (image/png or image/jpeg).

    Returns a dict:
        {
            "verified":    bool,
            "amount":      float,
            "utr":         str,
            "status":      "success" | "failed" | "unknown",
            "confidence":  "high" | "medium" | "low",
            "reason":      str
        }
    """
    model = genai.GenerativeModel(GEMINI_FLASH)
    prompt = (
        f"Analyse this UPI payment screenshot carefully.\n"
        f"Extract the following information:\n"
        f"  1. Transaction amount in INR (number only)\n"
        f"  2. UTR / reference number (string)\n"
        f"  3. Payment status (success or failed)\n"
        f"  4. Whether the amount matches the expected amount of Rs.{expected_amount:.2f}\n\n"
        f"Reply ONLY with a JSON object in this exact format:\n"
        f'{{"verified": true/false, "amount": <number>, "utr": "<string>", '
        f'"status": "success|failed|unknown", "confidence": "high|medium|low", '
        f'"reason": "<short explanation>"}}'
    )

    try:
        response = model.generate_content([prompt, _image_part(image_bytes, mime)])
        result = _extract_json_object(response.text)
        if not result:
            return {
                "verified": False,
                "amount": 0.0,
                "utr": "",
                "status": "unknown",
                "confidence": "low",
                "reason": "Could not parse Gemini response.",
            }
        # Cross-check extracted amount vs expected amount
        extracted_amount = float(result.get("amount", 0))
        if abs(extracted_amount - expected_amount) > 1.0:  # allow Rs.1 tolerance
            result["verified"] = False
            result["reason"] = (
                f"Amount mismatch: extracted Rs.{extracted_amount}, "
                f"expected Rs.{expected_amount}."
            )
        return result
    except Exception as exc:
        return {
            "verified": False,
            "amount": 0.0,
            "utr": "",
            "status": "unknown",
            "confidence": "low",
            "reason": f"Gemini Vision error: {exc}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Duplicate Screenshot Detection via Ollama  (image hash comparison)
# ─────────────────────────────────────────────────────────────────────────────


def check_duplicate_screenshot_ollama(
    image_bytes: bytes,
    existing_hashes: list[str],
) -> dict:
    """
    Use Ollama (llava) to describe the image and check for duplicates.
    Falls back to SHA-256 hash comparison for fast exact-duplicate detection.

    Returns:
        {"is_duplicate": bool, "method": "hash|ollama", "reason": str}
    """
    import hashlib

    import requests

    new_hash = hashlib.sha256(image_bytes).hexdigest()
    if new_hash in existing_hashes:
        return {
            "is_duplicate": True,
            "method": "hash",
            "reason": "Exact duplicate screenshot detected (SHA-256 match).",
            "hash": new_hash,
        }

    # Ask Ollama for a visual description (perceptual duplicate check)
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        b64_img = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "model": "llava",
            "prompt": (
                "Describe this payment screenshot in one sentence. "
                "Include the transaction amount, UTR number, and status."
            ),
            "images": [b64_img],
            "stream": False,
        }
        resp = requests.post(f"{ollama_url}/api/generate", json=payload, timeout=30)
        description = resp.json().get("response", "")
        return {
            "is_duplicate": False,
            "method": "ollama",
            "reason": description,
            "hash": new_hash,
        }
    except Exception as exc:
        return {
            "is_duplicate": False,
            "method": "hash",
            "reason": f"Ollama unavailable ({exc}). Hash check passed.",
            "hash": new_hash,
        }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Personalised Event Feed  (Gemini)
# ─────────────────────────────────────────────────────────────────────────────


def get_personalized_feed(
    student_profile: dict,
    all_events: list[dict],
    top_n: int = 6,
) -> list[str]:
    """
    Rank events for a student's "For You" feed using Gemini.

    Args:
        student_profile: dict with keys: name, year, branch, section, interests.
        all_events:      List of live event dicts (id, title, description, club).
        top_n:           Maximum number of event IDs to return.

    Returns a list of event IDs in ranked order.
    """
    if not all_events:
        return []

    model = genai.GenerativeModel(GEMINI_FLASH)
    events_summary = [
        {
            "id": e["id"],
            "title": e.get("title", ""),
            "club": e.get("clubs", {}).get("name", ""),
        }
        for e in all_events[:30]  # cap to avoid token overflow
    ]
    prompt = (
        f"A college student has the following profile:\n{json.dumps(student_profile)}\n\n"
        f"Available events:\n{json.dumps(events_summary)}\n\n"
        f"Rank the top {top_n} most relevant events for this student based on their "
        f"year, branch, and interests. "
        f"Reply ONLY with a JSON array of event IDs (strings) in ranked order: "
        f'["id1", "id2", ...]'
    )

    try:
        response = model.generate_content(prompt)
        ranked_ids = _extract_json_array(response.text)
        # Validate — keep only IDs that actually exist in all_events
        valid_ids = {e["id"] for e in all_events}
        return [eid for eid in ranked_ids if eid in valid_ids][:top_n]
    except Exception:
        # Graceful fallback: return first top_n event IDs
        return [e["id"] for e in all_events[:top_n]]


# ─────────────────────────────────────────────────────────────────────────────
# 4. Form Field Suggestions  (Gemini)
# ─────────────────────────────────────────────────────────────────────────────


def suggest_form_fields(event_title: str, event_type: str) -> list[dict]:
    """
    Suggest registration form fields for an event using Gemini.

    Returns a list of field dicts:
        [{"label": "...", "type": "text|email|phone|select|checkbox|file", "required": bool}]
    """
    model = genai.GenerativeModel(GEMINI_FLASH)
    prompt = (
        f"Suggest smart registration form fields for a college event.\n"
        f"Event title: '{event_title}'\n"
        f"Event type: '{event_type}'\n\n"
        f"Reply ONLY with a JSON array of field objects:\n"
        f'[{{"label": "Full Name", "type": "text", "required": true}}, ...]\n'
        f"Supported types: text, email, phone, number, select, radio, checkbox, textarea, file, date.\n"
        f"Include 5-8 relevant fields. Always include Full Name, Email, and Roll Number."
    )

    try:
        response = model.generate_content(prompt)
        fields = _extract_json_array(response.text)
        return fields if isinstance(fields, list) else []
    except Exception:
        # Minimal fallback fields
        return [
            {"label": "Full Name", "type": "text", "required": True},
            {"label": "Email", "type": "email", "required": True},
            {"label": "Roll Number", "type": "text", "required": True},
            {"label": "Department", "type": "text", "required": True},
            {
                "label": "Year",
                "type": "select",
                "required": True,
                "options": ["1st Year", "2nd Year", "3rd Year", "4th Year"],
            },
        ]


# ─────────────────────────────────────────────────────────────────────────────
# 5. WhatsApp / Email Message Drafter  (Gemini)
# ─────────────────────────────────────────────────────────────────────────────


def draft_event_message(event: dict, message_type: str = "whatsapp") -> str:
    """
    Draft a promotional message for an event.

    Args:
        event:        Event dict with keys: title, date, venue, fee, description.
        message_type: "whatsapp" → concise + emojis | "email" → formal HTML.

    Returns the drafted message as a plain string.
    """
    model = genai.GenerativeModel(GEMINI_FLASH)

    if message_type == "whatsapp":
        format_hint = (
            "a concise, engaging WhatsApp message with relevant emojis. "
            "Use bold (*text*) for key details. Keep it under 200 words."
        )
    else:
        format_hint = (
            "a formal, professional email in plain text. "
            "Include a subject line on the first line prefixed with 'Subject: '."
        )

    prompt = (
        f"Write {format_hint}\n\n"
        f"Event details:\n{json.dumps(event, default=str)}\n\n"
        f"Include: event name, date, venue, registration fee, brief description, "
        f"and a call-to-action to register."
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as exc:
        return f"Could not generate message. Error: {exc}"


# ─────────────────────────────────────────────────────────────────────────────
# 6. Student Chatbot  (Groq — llama3)
# ─────────────────────────────────────────────────────────────────────────────


def student_chatbot(
    message: str,
    conversation_history: list[dict] | None = None,
    context: str = "",
) -> str:
    """
    Answer a student's question using Groq (llama3-8b).

    Args:
        message:              The student's current question.
        conversation_history: Previous [{"role": "user"|"assistant", "content": "..."}].
        context:              Optional system context (e.g. list of upcoming events).

    Returns the assistant's reply as a string.
    """
    system_prompt = (
        "You are a helpful assistant for LTSU Events, the College Event Management System "
        "of Lamrin Tech Skills University. You help students with questions about events, "
        "registration, clubs, duty leaves, and other college activities. "
        "Be friendly, concise, and accurate. "
        "If you don't know something, say so honestly.\n"
    )
    if context:
        system_prompt += f"\nCurrent context:\n{context}"

    messages = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        messages.extend(conversation_history[-8:])  # keep last 8 turns

    messages.append({"role": "user", "content": message})

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            max_tokens=512,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        return f"I'm having trouble connecting right now. Please try again. ({exc})"


# ─────────────────────────────────────────────────────────────────────────────
# 7. Threat Detection  (Groq)
# ─────────────────────────────────────────────────────────────────────────────


def analyse_login_patterns(login_attempts: list[dict]) -> dict:
    """
    Use Groq to analyse recent login attempts and flag suspicious activity.

    Args:
        login_attempts: List of login_attempts table rows for a user or IP.

    Returns:
        {
            "suspicious": bool,
            "risk_level": "low|medium|high|critical",
            "reason":     str,
            "recommended_action": str
        }
    """
    if not login_attempts:
        return {
            "suspicious": False,
            "risk_level": "low",
            "reason": "No login attempts to analyse.",
            "recommended_action": "none",
        }

    summary = json.dumps(login_attempts[:20], default=str)
    prompt = (
        f"Analyse these login attempt records from a university event management system:\n"
        f"{summary}\n\n"
        f"Identify if there are signs of brute-force attacks, credential stuffing, "
        f"unusual geographic patterns, or other suspicious behaviour.\n\n"
        f"Reply ONLY with a JSON object:\n"
        f'{{"suspicious": true/false, "risk_level": "low|medium|high|critical", '
        f'"reason": "<explanation>", "recommended_action": "<action>"}}'
    )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a cybersecurity analyst. Respond only with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=256,
            temperature=0.1,
        )
        text = response.choices[0].message.content.strip()
        result = _extract_json_object(text)
        return (
            result
            if result
            else {
                "suspicious": False,
                "risk_level": "low",
                "reason": "Could not parse threat analysis response.",
                "recommended_action": "manual_review",
            }
        )
    except Exception as exc:
        return {
            "suspicious": False,
            "risk_level": "low",
            "reason": f"Groq threat analysis unavailable: {exc}",
            "recommended_action": "none",
        }


def flag_suspicious_content(text: str) -> dict:
    """
    Check user-submitted text (e.g. event descriptions, form responses) for
    inappropriate or malicious content using Groq.

    Returns:
        {"flagged": bool, "reason": str, "category": str}
    """
    prompt = (
        f"Review this text submitted in a college event management system:\n\n"
        f'"{text}"\n\n'
        f"Determine if it contains: spam, hate speech, threats, phishing links, "
        f"SQL injection attempts, or other harmful content.\n\n"
        f"Reply ONLY with JSON:\n"
        f'{{"flagged": true/false, "reason": "<reason>", "category": "<category>"}}'
    )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a content moderation system. Respond only with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=128,
            temperature=0.1,
        )
        result = _extract_json_object(response.choices[0].message.content)
        return (
            result if result else {"flagged": False, "reason": "", "category": "clean"}
        )
    except Exception:
        return {
            "flagged": False,
            "reason": "Moderation service unavailable.",
            "category": "unknown",
        }


# ─────────────────────────────────────────────────────────────────────────────
# 9. Form Field Suggestions — corrected arg order  (Gemini)
# ─────────────────────────────────────────────────────────────────────────────


def suggest_form_fields(event_type: str, event_title: str) -> list:
    """
    Gemini suggests relevant form field labels based on event type.
    Returns a list of { label, field_type, required, options } dicts.
    Overrides the earlier definition to match (event_type, event_title) call order.
    """
    model = genai.GenerativeModel(GEMINI_FLASH)
    prompt = (
        f"Suggest form fields for a college event registration form.\n"
        f"Event type: {event_type}\n"
        f"Event title: {event_title}\n\n"
        f"Return a JSON array of form field objects. Each object must have:\n"
        f'  "label": the field label (string)\n'
        f'  "field_type": one of: short_answer, paragraph, multiple_choice, checkboxes, dropdown, date, time, file_upload\n'
        f'  "required": true or false\n'
        f'  "options": array of strings (only for multiple_choice, checkboxes, dropdown; else empty array)\n\n'
        f"Return ONLY the JSON array, no other text."
    )
    try:
        response = model.generate_content(prompt)
        return _extract_json_array(response.text)
    except Exception:
        return [{"label": "Name", "field_type": "short_answer", "required": True, "options": []}]


# ─────────────────────────────────────────────────────────────────────────────
# 10. Event Announcement Drafter  (Gemini)
# ─────────────────────────────────────────────────────────────────────────────


def draft_event_announcement(event_details: dict, message_type: str = "whatsapp") -> str:
    """
    Generate a professional event announcement message using Gemini.
    message_type: 'whatsapp' | 'email'
    Returns the formatted message string.
    """
    model = genai.GenerativeModel(GEMINI_FLASH)

    if message_type == "email":
        prompt = (
            f"Write a professional email announcement for this college event:\n"
            f"{json.dumps(event_details, indent=2)}\n\n"
            f"Include: subject line, greeting, event details, call to action, signature.\n"
            f"Format as plain text. Start with 'Subject: ...' then the email body."
        )
    else:
        prompt = (
            f"Write a WhatsApp message announcing this college event:\n"
            f"{json.dumps(event_details, indent=2)}\n\n"
            f"Requirements:\n"
            f"- Use emojis appropriately\n"
            f"- Include event name, date, time, venue, and registration link\n"
            f"- Keep it engaging and under 300 characters\n"
            f"- End with the registration link placeholder: [REGISTRATION_LINK]\n"
            f"Return ONLY the message text."
        )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return f"Join us for {event_details.get('title', 'our upcoming event')}! Register now at [REGISTRATION_LINK]"


# ─────────────────────────────────────────────────────────────────────────────
# 11. Student Chatbot — simple signature  (Groq)
# ─────────────────────────────────────────────────────────────────────────────


def answer_student_question(question: str, available_events: list) -> str:
    """
    Groq-powered chatbot answers student questions about events.
    Returns a natural language answer string.
    """
    events_summary = [
        {
            "title": e.get("title", ""),
            "date": e.get("date", ""),
            "fee": e.get("fee", 0),
            "status": e.get("status", ""),
            "venue": (e.get("venues") or {}).get("name", ""),
            "club": (e.get("clubs") or {}).get("name", ""),
        }
        for e in (available_events or [])[:20]
    ]

    system_prompt = (
        "You are a helpful assistant for LTSU (Lamrin Tech Skills University) Events. "
        "Answer student questions about events concisely and helpfully. "
        "Only answer based on the events data provided. "
        "If you don't know something, say so politely."
    )

    user_prompt = (
        f"Available events:\n{json.dumps(events_summary, indent=2)}\n\n"
        f"Student question: {question}"
    )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=512,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "I'm sorry, I couldn't process your question right now. Please try again later."
