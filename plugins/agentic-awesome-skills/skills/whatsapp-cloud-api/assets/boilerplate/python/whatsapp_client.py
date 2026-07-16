"""WhatsApp Cloud API Client with async support and retry logic."""

import os
import asyncio
from typing import Any

import httpx

GRAPH_API = "https://graph.facebook.com/v21.0"


class WhatsAppClient:
    """Client for WhatsApp Cloud API with retry and error handling."""

    def __init__(
        self,
        token: str | None = None,
        phone_number_id: str | None = None,
        waba_id: str | None = None,
    ):
        self.token = token or os.environ["WHATSAPP_TOKEN"]
        self.phone_number_id = phone_number_id or os.environ["PHONE_NUMBER_ID"]
        self.waba_id = waba_id or os.environ["WABA_ID"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    async def send_message(self, payload: dict[str, Any]) -> dict:
        """Send a message with retry logic."""
        return await self._send_with_retry(payload)

    async def send_text(self, to: str, body: str, preview_url: bool = False) -> dict:
        """Send a text message."""
        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body, "preview_url": preview_url},
        })

    async def send_template(
        self,
        to: str,
        template_name: str,
        language_code: str,
        components: list[dict] | None = None,
    ) -> dict:
        """Send a template message."""
        payload: dict[str, Any] = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }
        if components:
            payload["template"]["components"] = components
        return await self.send_message(payload)

    async def send_image(self, to: str, image_url: str, caption: str | None = None) -> dict:
        """Send an image message."""
        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "image",
            "image": {"link": image_url, **({"caption": caption} if caption else {})},
        })

    async def send_document(
        self, to: str, document_url: str, filename: str, caption: str | None = None
    ) -> dict:
        """Send a document message."""
        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "document",
            "document": {
                "link": document_url,
                "filename": filename,
                **({"caption": caption} if caption else {}),
            },
        })

    async def send_interactive_buttons(
        self,
        to: str,
        body_text: str,
        buttons: list[dict[str, str]],
        header_text: str | None = None,
        footer_text: str | None = None,
    ) -> dict:
        """Send interactive button message (max 3 buttons)."""
        interactive: dict[str, Any] = {
            "type": "button",
            "body": {"text": body_text},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                    for b in buttons
                ]
            },
        }
        if header_text:
            interactive["header"] = {"type": "text", "text": header_text}
        if footer_text:
            interactive["footer"] = {"text": footer_text}

        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        })

    async def send_interactive_list(
        self,
        to: str,
        body_text: str,
        button_text: str,
        sections: list[dict],
        header_text: str | None = None,
        footer_text: str | None = None,
    ) -> dict:
        """Send interactive list message (max 10 options across sections)."""
        interactive: dict[str, Any] = {
            "type": "list",
            "body": {"text": body_text},
            "action": {"button": button_text, "sections": sections},
        }
        if header_text:
            interactive["header"] = {"type": "text", "text": header_text}
        if footer_text:
            interactive["footer"] = {"text": footer_text}

        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": interactive,
        })

    async def send_reaction(self, to: str, message_id: str, emoji: str) -> dict:
        """React to a message with an emoji."""
        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "reaction",
            "reaction": {"message_id": message_id, "emoji": emoji},
        })

    async def send_location(
        self,
        to: str,
        latitude: float,
        longitude: float,
        name: str | None = None,
        address: str | None = None,
    ) -> dict:
        """Send a location message."""
        return await self.send_message({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "location",
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                **({"name": name} if name else {}),
                **({"address": address} if address else {}),
            },
        })

    async def mark_as_read(self, message_id: str) -> None:
        """Mark a message as read (blue checkmarks)."""
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{GRAPH_API}/{self.phone_number_id}/messages",
                json={
                    "messaging_product": "whatsapp",
                    "status": "read",
                    "message_id": message_id,
                },
                headers=self.headers,
            )

    async def _send_with_retry(self, payload: dict, max_retries: int = 3) -> dict:
        """Send message with exponential backoff retry."""
        non_retryable_codes = {100, 131026, 131051, 132000, 132001, 132005, 133010}

        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{GRAPH_API}/{self.phone_number_id}/messages",
                        json=payload,
                        headers=self.headers,
                    )
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPStatusError as e:
                error_data = e.response.json().get("error", {})
                error_code = error_data.get("code", 0)
                error_message = error_data.get("message", str(e))

                if error_code in non_retryable_codes:
                    raise RuntimeError(f"WhatsApp API Error {error_code}: {error_message}")

                if attempt < max_retries:
                    delay = 2**attempt
                    await asyncio.sleep(delay)
                    continue

                raise RuntimeError(
                    f"WhatsApp API Error after {max_retries} retries: {error_message}"
                )

        raise RuntimeError("Unexpected: retry loop exited without return or raise")
