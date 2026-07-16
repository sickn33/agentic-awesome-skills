"""WhatsApp Template Management - CRUD operations via API."""

import os
from typing import Any

import httpx

GRAPH_API = "https://graph.facebook.com/v21.0"


class TemplateManager:
    """Manage WhatsApp message templates programmatically."""

    def __init__(
        self,
        token: str | None = None,
        waba_id: str | None = None,
    ):
        self.token = token or os.environ["WHATSAPP_TOKEN"]
        self.waba_id = waba_id or os.environ["WABA_ID"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    async def list_templates(self, status: str | None = None) -> list[dict[str, Any]]:
        """List all templates, optionally filtered by status (APPROVED, PENDING, REJECTED)."""
        params: dict[str, Any] = {"limit": 100}
        if status:
            params["status"] = status

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GRAPH_API}/{self.waba_id}/message_templates",
                params=params,
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()["data"]

    async def create_template(
        self,
        name: str,
        category: str,
        language: str,
        components: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Create a new message template.

        Args:
            name: Template name (lowercase, underscores, no spaces)
            category: MARKETING, UTILITY, or AUTHENTICATION
            language: Language code (e.g., 'pt_BR')
            components: List of template components (HEADER, BODY, FOOTER, BUTTONS)

        Returns:
            Dict with id, status, and category of created template.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRAPH_API}/{self.waba_id}/message_templates",
                json={
                    "name": name,
                    "category": category,
                    "language": language,
                    "components": components,
                },
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def delete_template(self, template_name: str) -> None:
        """
        Delete a template by name.

        Note: This deletes ALL translations of the template.
        Templates cannot be edited - delete and recreate instead.
        """
        async with httpx.AsyncClient() as client:
            response = await client.request(
                "DELETE",
                f"{GRAPH_API}/{self.waba_id}/message_templates",
                json={"name": template_name},
                headers=self.headers,
            )
            response.raise_for_status()

    async def get_approved(self) -> list[dict[str, Any]]:
        """List only approved templates ready for use."""
        return await self.list_templates("APPROVED")

    async def get_pending(self) -> list[dict[str, Any]]:
        """List templates awaiting approval."""
        return await self.list_templates("PENDING")

    async def get_rejected(self) -> list[dict[str, Any]]:
        """List rejected templates."""
        return await self.list_templates("REJECTED")
