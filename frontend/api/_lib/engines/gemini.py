"""Minimal Gemini client (JSON structured output). Returns None on any failure so callers fall back.

Two kinds of key work:
  • Google AI Studio keys ("AIza…")      → generativelanguage.googleapis.com
  • Vertex AI express-mode keys ("AQ.…")  → aiplatform.googleapis.com
The endpoint is chosen from the key and the other is tried if the first rejects it.
"""

from __future__ import annotations

import json
import re
from typing import Any, Optional

import httpx

from ..core.config import get_settings

AI_STUDIO = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
VERTEX_EXPRESS = "https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent"
TIMEOUT_S = httpx.Timeout(12.0, connect=4.0)  # pages wait on this; the rule-based fallback answers after it
AI_STUDIO_MODELS = "https://generativelanguage.googleapis.com/v1beta/models"
_state: dict[str, Any] = {"last_error": None, "endpoint": None, "model": None, "thinking_low": True}
_SKIP = ("lite", "image", "tts", "audio", "live", "embedding", "thinking", "exp", "preview", "vision")


def _version(name: str) -> tuple:
    return tuple(int(n) for n in re.findall(r"\d+", name.split("/")[-1])[:3])


def list_models(key: str) -> list[str]:
    """Every model this key can call with generateContent (AI Studio model list), newest first."""
    try:
        resp = httpx.get(AI_STUDIO_MODELS, params={"pageSize": 200}, headers={"x-goog-api-key": key}, timeout=TIMEOUT_S)
        resp.raise_for_status()
        models = resp.json().get("models", [])
    except (httpx.HTTPError, ValueError):
        return []
    names = [m["name"].split("/")[-1] for m in models if "generateContent" in m.get("supportedGenerationMethods", [])]
    return sorted(names, key=_version, reverse=True)


def discover_model(key: str) -> Optional[str]:
    """Newest stable Flash model this key can call."""
    names = [n for n in list_models(key) if "flash" in n and not any(t in n for t in _SKIP)]
    return names[0] if names else None


def _next_model(key: str, current: str) -> Optional[str]:
    names = [n for n in list_models(key) if "flash" in n and not any(t in n for t in _SKIP)]
    older = [n for n in names if _version(n) < _version(current)]
    return older[0] if older else None


def _model(key: str) -> str:
    """GEMINI_MODEL if set; otherwise (or once it has been retired) the newest Flash model available."""
    return _state["model"] or get_settings().gemini_model


def available() -> bool:
    return bool(get_settings().gemini_api_key)


def last_error() -> Optional[str]:
    return _state["last_error"]


def _endpoints(key: str) -> list[str]:
    return [VERTEX_EXPRESS, AI_STUDIO] if key.startswith("AQ.") else [AI_STUDIO, VERTEX_EXPRESS]


def _summarise(resp: httpx.Response) -> str:
    try:
        message = resp.json().get("error", {}).get("message", "")
    except ValueError:
        message = resp.text
    return f"HTTP {resp.status_code}: {str(message).strip()[:180]}"


def generate_text(prompt: str, *, json_output: bool = False, temperature: float = 0.2) -> Optional[str]:
    settings = get_settings()
    key = settings.gemini_api_key
    if not key:
        _state["last_error"] = "GEMINI_API_KEY is not set"
        return None
    config: dict[str, Any] = {"temperature": temperature}
    if json_output:
        config["responseMimeType"] = "application/json"
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": config}
    current = _model(key)
    text, error, retired = _call_fast(key, current, body)
    timed_out = bool(error and error.startswith(("ReadTimeout", "WriteTimeout", "ConnectTimeout")))
    if text is None and (retired or timed_out):
        # Retired (404): move to the newest Flash model. Timed out: step down to the next Flash model.
        replacement = discover_model(key) if retired else _next_model(key, current)
        if replacement and replacement != current:
            _state["model"] = replacement
            text, error, _ = _call_fast(key, replacement, body)
    if text is None:
        _state["last_error"] = error
    return text


def _call_fast(key: str, model: str, body: dict) -> tuple[Optional[str], Optional[str], bool]:
    """Ask for minimal thinking (short structured tasks); drop the setting if the model rejects it."""
    if _state["thinking_low"]:
        fast = {**body, "generationConfig": {**body["generationConfig"], "thinkingConfig": {"thinkingLevel": "low"}}}
        text, error, retired = _call(key, model, fast)
        if text is not None or not (error and error.startswith("HTTP 400") and "think" in error.lower()):
            return text, error, retired
        _state["thinking_low"] = False
    return _call(key, model, body)


def _call(key: str, model: str, body: dict) -> tuple[Optional[str], Optional[str], bool]:
    """(text, error, model_unavailable) for one model across both endpoints."""
    error, retired = None, False
    for endpoint in _endpoints(key):
        try:
            resp = httpx.post(endpoint.format(model=model), json=body, timeout=TIMEOUT_S,
                              headers={"x-goog-api-key": key})
        except httpx.HTTPError as exc:
            error = f"{type(exc).__name__}: {str(exc)[:180]}"
            break  # network trouble — the other endpoint will not do better
        if resp.status_code == 404:
            retired = True
        if resp.status_code in (400, 401, 403, 404) and endpoint != _endpoints(key)[-1]:
            error = error or _summarise(resp)
            continue  # key belongs to the other service, or the model is not offered there
        if resp.status_code != 200:
            error = _summarise(resp)
            break
        try:
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, ValueError):
            return None, "Unexpected response shape (blocked or empty candidate)", False
        _state.update(last_error=None, endpoint="vertex-express" if endpoint == VERTEX_EXPRESS else "ai-studio")
        return text, None, False
    return None, error, retired


def generate_json(prompt: str, schema_hint: str) -> Optional[dict[str, Any]]:
    text = generate_text(f"{prompt}\n\nRespond only with JSON matching: {schema_hint}", json_output=True)
    if text is None:
        return None
    try:
        data = json.loads(text)
    except ValueError:
        _state["last_error"] = "Model returned non-JSON output"
        return None
    return data if isinstance(data, dict) else None


def probe(model: Optional[str] = None) -> dict[str, Any]:
    """Live check used by /api/health?deep=1 (optionally &gemini_model=<one of the listed models>)."""
    if not available():
        return {"configured": False, "ok": False, "error": "GEMINI_API_KEY is not set"}
    key = get_settings().gemini_api_key
    import time
    started = time.perf_counter()
    if model:
        body = {"contents": [{"role": "user", "parts": [{"text": "Reply with the single word: ready"}]}],
                "generationConfig": {"temperature": 0.0}}
        text, error, _ = _call_fast(key, model, body)
        ok = text is not None
    else:
        ok = generate_text("Reply with the single word: ready", temperature=0.0) is not None
        error = _state["last_error"]
    out = {"configured": True, "ok": ok, "model": model or _model(key),
           "seconds": round(time.perf_counter() - started, 2)}
    out.update({"endpoint": _state["endpoint"]} if ok else {"error": error})
    if not ok:
        out["available_models"] = list_models(key)[:25]
    return out
