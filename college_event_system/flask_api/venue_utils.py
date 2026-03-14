"""
venue_utils.py — Venue conflict detection and booking logic
LTSU College Event Management System — Flask API
"""

from datetime import datetime
from typing import Optional

# ─────────────────────────────────────────────────────────────────────────────
# Date/Time Helpers
# ─────────────────────────────────────────────────────────────────────────────


def parse_datetime(dt_str: str) -> datetime:
    """
    Parse an ISO 8601 datetime string into a Python datetime object.
    Accepts formats: '2025-03-15T10:00:00' or '2025-03-15T10:00:00+05:30'
    """
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime string: {dt_str!r}")


def intervals_overlap(
    start_a: datetime,
    end_a: datetime,
    start_b: datetime,
    end_b: datetime,
    buffer_minutes: int = 30,
) -> bool:
    """
    Return True if two time intervals overlap, including a setup/teardown buffer.

    The buffer ensures at least `buffer_minutes` of gap between back-to-back events
    at the same venue (e.g. 30 min for room setup/cleanup).

    Overlap condition (with buffer):
        start_a < end_b + buffer  AND  end_a + buffer > start_b
    """
    from datetime import timedelta

    buffer = timedelta(minutes=buffer_minutes)
    return (start_a < end_b + buffer) and (end_a + buffer > start_b)


# ─────────────────────────────────────────────────────────────────────────────
# Conflict Detection
# ─────────────────────────────────────────────────────────────────────────────


def check_venue_conflict(
    venue_id: str,
    requested_start: str,
    requested_end: str,
    exclude_event_id: Optional[str] = None,
    buffer_minutes: int = 30,
) -> dict:
    """
    Check whether a venue is available for the requested time slot.

    Queries the venue_bookings table for confirmed/pending bookings that
    overlap with [requested_start, requested_end].

    Args:
        venue_id:         UUID of the venue to check.
        requested_start:  ISO 8601 string for the desired start time.
        requested_end:    ISO 8601 string for the desired end time.
        exclude_event_id: Optionally exclude a specific event (used when editing).
        buffer_minutes:   Minimum gap required between consecutive events.

    Returns:
        {
            "available":        bool,
            "conflicts":        [ { booking details } ],
            "conflict_count":   int,
            "next_available":   str | None   (ISO string of earliest free slot)
        }
    """
    from models import get_bookings_for_venue

    req_start = parse_datetime(requested_start)
    req_end = parse_datetime(requested_end)

    if req_end <= req_start:
        return {
            "available": False,
            "conflicts": [],
            "conflict_count": 0,
            "error": "End time must be after start time.",
            "next_available": None,
        }

    # Fetch all active bookings for this venue
    all_bookings = get_bookings_for_venue(venue_id) or []

    conflicts = []
    for booking in all_bookings:
        # Skip cancelled bookings
        if booking.get("status") == "cancelled":
            continue

        # Skip the event being edited
        if exclude_event_id and str(booking.get("event_id")) == str(exclude_event_id):
            continue

        try:
            b_start = parse_datetime(booking["start_time"])
            b_end = parse_datetime(booking["end_time"])
        except (KeyError, ValueError):
            continue

        if intervals_overlap(req_start, req_end, b_start, b_end, buffer_minutes):
            conflicts.append(
                {
                    "booking_id": booking.get("id"),
                    "event_id": booking.get("event_id"),
                    "event_title": (booking.get("events") or {}).get(
                        "title", "Unknown"
                    ),
                    "event_date": (booking.get("events") or {}).get("date", ""),
                    "start_time": booking["start_time"],
                    "end_time": booking["end_time"],
                    "status": booking.get("status", ""),
                }
            )

    next_available = (
        _find_next_available_slot(all_bookings, req_start, req_end, buffer_minutes)
        if conflicts
        else None
    )

    return {
        "available": len(conflicts) == 0,
        "conflicts": conflicts,
        "conflict_count": len(conflicts),
        "next_available": next_available,
    }


def check_multiple_venues(
    venue_ids: list,
    requested_start: str,
    requested_end: str,
    buffer_minutes: int = 30,
) -> dict:
    """
    Check availability for multiple venues at once.
    Useful for showing the organizer which venues are free.

    Returns:
        {
            "available_venues":   [venue_id, ...],
            "unavailable_venues": [{ venue_id, conflicts }, ...],
        }
    """
    available = []
    unavailable = []

    for venue_id in venue_ids:
        result = check_venue_conflict(
            venue_id, requested_start, requested_end, buffer_minutes=buffer_minutes
        )
        if result["available"]:
            available.append(venue_id)
        else:
            unavailable.append(
                {
                    "venue_id": venue_id,
                    "conflict_count": result["conflict_count"],
                    "conflicts": result["conflicts"],
                    "next_available": result.get("next_available"),
                }
            )

    return {
        "available_venues": available,
        "unavailable_venues": unavailable,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Booking Management
# ─────────────────────────────────────────────────────────────────────────────


def create_booking_if_available(
    venue_id: str,
    event_id: str,
    start_time: str,
    end_time: str,
    buffer_minutes: int = 30,
) -> dict:
    """
    Atomically check for conflicts and create a booking if the slot is free.

    Returns:
        { "success": bool, "booking": dict | None, "error": str | None,
          "conflicts": list }
    """
    from models import create_venue_booking

    conflict_result = check_venue_conflict(
        venue_id, start_time, end_time, buffer_minutes=buffer_minutes
    )

    if not conflict_result["available"]:
        return {
            "success": False,
            "booking": None,
            "error": (
                f"Venue is not available. "
                f"{conflict_result['conflict_count']} conflicting booking(s) found."
            ),
            "conflicts": conflict_result["conflicts"],
            "next_available": conflict_result.get("next_available"),
        }

    booking_data = {
        "venue_id": venue_id,
        "event_id": event_id,
        "start_time": start_time,
        "end_time": end_time,
        "status": "confirmed",
    }

    try:
        booking = create_venue_booking(booking_data)
        return {
            "success": True,
            "booking": booking[0] if isinstance(booking, list) else booking,
            "error": None,
            "conflicts": [],
        }
    except Exception as exc:
        return {
            "success": False,
            "booking": None,
            "error": f"Database error while creating booking: {exc}",
            "conflicts": [],
        }


def get_venue_schedule(venue_id: str, date_str: str) -> list:
    """
    Return all bookings for a venue on a specific date, sorted by start time.

    Args:
        venue_id:  UUID of the venue.
        date_str:  Date in 'YYYY-MM-DD' format.

    Returns list of booking dicts sorted by start_time.
    """
    from models import get_bookings_for_venue

    all_bookings = get_bookings_for_venue(venue_id) or []
    day_bookings = []

    for booking in all_bookings:
        if booking.get("status") == "cancelled":
            continue
        start = booking.get("start_time", "")
        if start.startswith(date_str):
            day_bookings.append(booking)

    day_bookings.sort(key=lambda b: b.get("start_time", ""))
    return day_bookings


def get_venue_calendar(venue_id: str, year: int, month: int) -> dict:
    """
    Return a calendar view of bookings for a venue for a given month.

    Returns:
        {
            "venue_id": str,
            "year":     int,
            "month":    int,
            "bookings": { "YYYY-MM-DD": [ booking, ... ], ... }
        }
    """
    from models import get_bookings_for_venue

    all_bookings = get_bookings_for_venue(venue_id) or []
    calendar: dict = {}
    month_prefix = f"{year:04d}-{month:02d}"

    for booking in all_bookings:
        if booking.get("status") == "cancelled":
            continue
        start = booking.get("start_time", "")
        if not start.startswith(month_prefix):
            continue
        date_key = start[:10]  # 'YYYY-MM-DD'
        if date_key not in calendar:
            calendar[date_key] = []
        calendar[date_key].append(
            {
                "booking_id": booking.get("id"),
                "event_id": booking.get("event_id"),
                "event_title": (booking.get("events") or {}).get("title", "Unknown"),
                "start_time": start,
                "end_time": booking.get("end_time", ""),
                "status": booking.get("status", ""),
            }
        )

    return {
        "venue_id": venue_id,
        "year": year,
        "month": month,
        "bookings": calendar,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Slot Suggestion Helper
# ─────────────────────────────────────────────────────────────────────────────


def suggest_available_slots(
    venue_id: str,
    desired_date: str,
    duration_hours: float = 2.0,
    working_hours: tuple = (8, 20),
    buffer_minutes: int = 30,
    max_suggestions: int = 3,
) -> list:
    """
    Suggest available time slots for a venue on a given date.

    Args:
        venue_id:        UUID of the venue.
        desired_date:    Date string 'YYYY-MM-DD'.
        duration_hours:  Required event duration in hours.
        working_hours:   Tuple of (start_hour, end_hour) in 24h format.
        buffer_minutes:  Gap required between events.
        max_suggestions: Maximum number of slot suggestions to return.

    Returns a list of { "start": str, "end": str } dicts.
    """
    from datetime import timedelta

    duration = timedelta(hours=duration_hours)
    step = timedelta(minutes=30)
    suggestions = []

    work_start_hour, work_end_hour = working_hours
    slot_start = datetime.strptime(
        f"{desired_date}T{work_start_hour:02d}:00:00", "%Y-%m-%dT%H:%M:%S"
    )
    work_end = datetime.strptime(
        f"{desired_date}T{work_end_hour:02d}:00:00", "%Y-%m-%dT%H:%M:%S"
    )

    while slot_start + duration <= work_end and len(suggestions) < max_suggestions:
        slot_end = slot_start + duration
        result = check_venue_conflict(
            venue_id,
            slot_start.strftime("%Y-%m-%dT%H:%M:%S"),
            slot_end.strftime("%Y-%m-%dT%H:%M:%S"),
            buffer_minutes=buffer_minutes,
        )
        if result["available"]:
            suggestions.append(
                {
                    "start": slot_start.strftime("%Y-%m-%dT%H:%M:%S"),
                    "end": slot_end.strftime("%Y-%m-%dT%H:%M:%S"),
                }
            )
            # Jump past this slot to avoid overlapping suggestions
            slot_start = slot_end
        else:
            slot_start += step

    return suggestions


# ─────────────────────────────────────────────────────────────────────────────
# Internal Helper
# ─────────────────────────────────────────────────────────────────────────────


def _find_next_available_slot(
    all_bookings: list,
    req_start: datetime,
    req_end: datetime,
    buffer_minutes: int,
) -> Optional[str]:
    """
    Given existing bookings, find the earliest datetime after which
    the requested duration (req_end - req_start) is free.

    Returns an ISO 8601 string or None if it cannot be determined.
    """
    from datetime import timedelta

    duration = req_end - req_start
    buffer = timedelta(minutes=buffer_minutes)

    # Collect all end times from active bookings that are after req_start
    candidate_times = []
    for booking in all_bookings:
        if booking.get("status") == "cancelled":
            continue
        try:
            b_end = parse_datetime(booking["end_time"])
            if b_end > req_start:
                candidate_times.append(b_end + buffer)
        except (KeyError, ValueError):
            continue

    if not candidate_times:
        return None

    candidate_times.sort()

    for candidate_start in candidate_times:
        candidate_end = candidate_start + duration
        overlap_found = False
        for booking in all_bookings:
            if booking.get("status") == "cancelled":
                continue
            try:
                b_start = parse_datetime(booking["start_time"])
                b_end = parse_datetime(booking["end_time"])
            except (KeyError, ValueError):
                continue
            if intervals_overlap(
                candidate_start, candidate_end, b_start, b_end, buffer_minutes
            ):
                overlap_found = True
                break
        if not overlap_found:
            return candidate_start.strftime("%Y-%m-%dT%H:%M:%S")

    return None
