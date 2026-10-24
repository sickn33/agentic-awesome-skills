"""vai.client - HTTP and SSE streaming client for Venice AI."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Generator


class AuthError(Exception):
    pass


class VeniceHTTPError(Exception):
    pass


class Client:
    def __init__(self, session: dict, endpoint: str | None = None, timeout: int = 120):
        self.session = session
        self.endpoint = (endpoint or session.get("chat_endpoint") or "https://api.venice.ai/api/v1").rstrip("/")
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "vai-agent/0.1.0",
        }
        token = self.session.get("token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        cookies = self.session.get("cookies")
        if cookies:
            if isinstance(cookies, list):
                cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in cookies if 'name' in c and 'value' in c)
            else:
                cookie_str = str(cookies)
            if cookie_str:
                headers["Cookie"] = cookie_str
        return headers

    def models(self) -> list[dict]:
        url = f"{self.endpoint}/models"
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
                return data.get("data") or data.get("models") or []
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                raise AuthError("401 Unauthorized: session token expired or invalid") from exc
            err = exc.read().decode(errors="replace")
            raise VeniceHTTPError(f"HTTP {exc.code}: {err}") from exc
        except Exception as exc:
            raise VeniceHTTPError(f"Request failed: {exc}") from exc

    def stream_chat(self, payload: dict) -> Generator[dict, None, None]:
        url = f"{self.endpoint}/chat/completions"
        payload = {**payload, "stream": True}
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=self._headers(), method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                buffer = ""
                for line in resp:
                    decoded = line.decode("utf-8", errors="replace")
                    buffer += decoded
                    while "\n" in buffer:
                        curr, buffer = buffer.split("\n", 1)
                        curr = curr.strip()
                        if not curr or not curr.startswith("data:"):
                            continue
                        raw = curr[5:].strip()
                        if raw == "[DONE]":
                            return
                        try:
                            yield json.loads(raw)
                        except json.JSONDecodeError:
                            continue
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                raise AuthError("401 Unauthorized: session token expired or invalid") from exc
            err = exc.read().decode(errors="replace")
            raise VeniceHTTPError(f"HTTP {exc.code}: {err}") from exc
        except Exception as exc:
            raise VeniceHTTPError(f"Stream request failed: {exc}") from exc
