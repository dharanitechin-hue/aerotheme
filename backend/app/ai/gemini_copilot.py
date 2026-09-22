"""
AeroTwin-X AI Copilot — Gemini integration.

This module is the ONLY place the Gemini API key and endpoint are touched.
The key is read from the environment (GEMINI_API_KEY) and never returned
to the frontend, logged, or hard-coded.
"""

import os
import json
import httpx
from typing import Dict, Any

from app.simulator.engine_state import EngineState

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

SYSTEM_PREAMBLE = (
    "You are the AeroTwin-X AI Copilot, an experienced flight-line engineer "
    "explaining the current state of a MALE UAV aero piston engine to a "
    "colleague. You are given the CURRENT simulated engine state, the "
    "digital twin's expected (healthy) values, and the residuals between "
    "them. Answer the engineer's question using ONLY this data.\n\n"
    "Rules:\n"
    "1. Write like you're talking to a colleague — full sentences and short "
    "paragraphs, not a terse spec sheet. It's fine to use a few bullet "
    "points for lists of numbers, but the reasoning and explanation around "
    "them should read naturally, the way a person would actually explain "
    "it out loud.\n"
    "2. Still clearly distinguish, in your own words, what's (a) actual "
    "sensor data, (b) what the healthy digital twin would expect, and (c) "
    "your interpretation — but weave these together conversationally "
    "rather than using rigid headers for short answers.\n"
    "3. Be thorough enough to actually be useful: explain *why* a reading "
    "matters, not just what it is.\n"
    "4. Never invent sensor values, fault types, or data fields that are "
    "not present in the provided state. If something needed to answer "
    "isn't available, say so plainly instead of guessing.\n"
    "5. Plain text only — do NOT use Markdown formatting of any kind. No "
    "asterisks, no bold, no italics, no headers, no numbered lists with "
    "markdown syntax. Write it exactly as it should appear on screen, "
    "like a plain chat message.\n"
    "5. Reference concrete numbers from the provided state when relevant."
)


def _strip_markdown(text: str) -> str:
    """
    Safety net: remove common Markdown symbols in case the model still
    slips them in, so the chat UI always shows plain, natural text.
    """
    import re
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)   # **bold**
    text = re.sub(r"\*(.+?)\*", r"\1", text)        # *italic*
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)  # # headers
    text = re.sub(r"^[\-\*]\s+", "", text, flags=re.MULTILINE)  # - / * bullets
    text = text.replace("**", "").replace("*", "")
    return text.strip()


def _build_engine_context(state: EngineState) -> Dict[str, Any]:
    """
    Build a compact, field-accurate snapshot of the current engine state.
    Only fields that actually exist on EngineState are included — nothing
    is invented here.
    """
    data = state.model_dump()
    return {
        "engine_id": data.get("engine_id"),
        "timestamp": data.get("timestamp"),
        "operating_state": data.get("engine_state"),
        "actual_sensor_readings": {
            "rpm": data.get("rpm"),
            "throttle": data.get("throttle"),
            "load": data.get("load"),
            "cht_c": data.get("cht"),
            "egt_c": data.get("egt"),
            "oil_pressure_bar": data.get("oil_pressure"),
            "oil_temperature_c": data.get("oil_temperature"),
            "fuel_flow_lph": data.get("fuel_flow"),
            "vibration_mm_s": data.get("vibration"),
            "battery_voltage_v": data.get("battery_voltage"),
            "alternator_voltage_v": data.get("alternator_voltage"),
            "injection_timing_btdc": data.get("injection_timing"),
            "altitude_ft": data.get("altitude"),
            "ambient_temperature_c": data.get("ambient_temperature"),
        },
        "digital_twin_expected_healthy_values": data.get("expected"),
        "residuals_actual_minus_expected": data.get("residuals"),
        "ai_health_intelligence": {
            "health_score_pct": data.get("health_score"),
            "degradation_level": data.get("degradation_level"),
            "anomaly_score": data.get("anomaly_score"),
            "fault_type": data.get("fault_type"),
            "fault_severity": data.get("fault_severity"),
            "rul_hours": data.get("rul_hours"),
            "rul_confidence": data.get("rul_confidence"),
            "rul_lower_bound_hours": data.get("rul_lower_bound"),
            "rul_upper_bound_hours": data.get("rul_upper_bound"),
            "failure_probability_pct": data.get("failure_probability"),
            "mission_risk": data.get("mission_risk"),
            "maintenance_recommendation": data.get("maintenance_recommendation"),
        },
        "component_status": data.get("component_status"),
    }


async def ask_copilot(user_message: str, state: EngineState) -> str:
    """
    Send the user's question plus the current AeroTwin-X engine state to
    Gemini and return the plain-text response.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return (
            "AI Copilot is not configured yet. Set GEMINI_API_KEY in the "
            "backend .env file to enable engineering analysis."
        )

    context = _build_engine_context(state)

    prompt = (
        f"{SYSTEM_PREAMBLE}\n\n"
        f"CURRENT AEROTWIN-X ENGINE STATE (JSON):\n"
        f"{json.dumps(context, indent=2)}\n\n"
        f"ENGINEER'S QUESTION:\n{user_message}"
    )

    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 1000,
        },
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(GEMINI_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        # Surface Gemini's own error message (never the key) so the failure
        # is actually debuggable instead of a bare status code.
        reason = "Unknown error."
        try:
            err_body = e.response.json()
            reason = err_body.get("error", {}).get("message", reason)
        except Exception:
            pass
        print(f"[AI Copilot] Gemini API error {e.response.status_code}: {reason}")
        return f"AI Copilot request failed ({e.response.status_code}): {reason}"
    except httpx.RequestError as e:
        print(f"[AI Copilot] Network error contacting Gemini: {e}")
        return "AI Copilot could not reach the Gemini API. Check network connectivity."

    try:
        candidates = data.get("candidates", [])
        if not candidates:
            return "AI Copilot received no response from Gemini. Please try again."
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        return _strip_markdown(text) or "AI Copilot received an empty response. Please try again."
    except (KeyError, IndexError, TypeError):
        return "AI Copilot received an unexpected response format from Gemini."
