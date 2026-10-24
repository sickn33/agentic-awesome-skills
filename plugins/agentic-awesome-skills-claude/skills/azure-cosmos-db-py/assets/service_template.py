"""
Service Layer Template

Application-specific starter service class pattern for Cosmos DB with:
- Document ↔ Model conversion
- CRUD operations
- Graceful degradation
- Unique slug generation

Usage:
    Rename and customize for your entity type.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.db.cosmos import (
    delete_document,
    get_container,
    get_document,
    query_documents,
    upsert_document,
)

# TODO: Import your Pydantic models
# from app.models.entity import Entity, EntityCreate, EntityUpdate, EntityInDB


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    import re

    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


class EntityService:
    """
    Service for Entity CRUD operations.

    Replace 'Entity' with your actual entity name (Project, Workspace, etc.)
    """

    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------

    def _use_cosmos(self) -> bool:
        """Check if Cosmos DB is available."""
        return get_container() is not None

    def _doc_to_model_in_db(self, doc: dict[str, Any]) -> "EntityInDB":
        """
        Convert Cosmos document to internal model.

        Maps camelCase JSON fields to snake_case Python attributes.
        """
        # TODO: Customize for your entity
        return EntityInDB(
            id=doc["id"],
            name=doc["name"],
            description=doc.get("description"),
            slug=doc["slug"],
            workspace_id=doc["workspaceId"],  # Partition key
            author_id=doc["authorId"],
            visibility=doc.get("visibility", "public"),
            tags=doc.get("tags", []),
            created_at=datetime.fromisoformat(doc["createdAt"]),
            updated_at=(
                datetime.fromisoformat(doc["updatedAt"]) if doc.get("updatedAt") else None
            ),
            doc_type=doc.get("docType", "entity"),
        )

    def _model_in_db_to_doc(self, model: "EntityInDB") -> dict[str, Any]:
        """
        Convert internal model to Cosmos document.

        Maps snake_case Python attributes to camelCase JSON fields.
        """
        # TODO: Customize for your entity
        return {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "slug": model.slug,
            "workspaceId": model.workspace_id,  # Partition key
            "authorId": model.author_id,
            "visibility": model.visibility,
            "tags": model.tags,
            "createdAt": model.created_at.isoformat(),
            "updatedAt": model.updated_at.isoformat() if model.updated_at else None,
            "docType": model.doc_type,
        }

    def _model_in_db_to_model(self, model_in_db: "EntityInDB") -> "Entity":
        """
        Convert internal model to API response model.

        Strips internal fields like doc_type.
        """
        # TODO: Customize for your entity
        return Entity(
            id=model_in_db.id,
            name=model_in_db.name,
            description=model_in_db.description,
            slug=model_in_db.slug,
            workspace_id=model_in_db.workspace_id,
            author_id=model_in_db.author_id,
            visibility=model_in_db.visibility,
            tags=model_in_db.tags,
            created_at=model_in_db.created_at,
            updated_at=model_in_db.updated_at,
        )

    async def _generate_unique_slug(self, name: str, workspace_id: str) -> str:
        """Generate unique slug within workspace."""
        base_slug = slugify(name)
        slug = base_slug
        counter = 1

        # Advisory availability check only; enforce uniqueness with a
        # container unique-key policy or atomic reservation and handle conflict.
        while True:
            existing = await query_documents(
                doc_type="entity",  # TODO: Change to your entity type
                partition_key=workspace_id,
                extra_filter="AND c.slug = @slug",
                parameters=[{"name": "@slug", "value": slug}],
            )
            if not existing:
                return slug
            slug = f"{base_slug}-{counter}"
            counter += 1

    # -------------------------------------------------------------------------
    # CRUD Operations
    # -------------------------------------------------------------------------

    async def create(self, data: "EntityCreate", author_id: str) -> "Entity":
        """
        Create a new entity.

        Args:
            data: Creation request data
            author_id: ID of the creating user

        Returns:
            Created entity

        Raises:
            RuntimeError: If Cosmos is unavailable
        """
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        now = datetime.now(timezone.utc)
        slug = await self._generate_unique_slug(data.name, data.workspace_id)

        entity_in_db = EntityInDB(
            id=str(uuid.uuid4()),
            name=data.name,
            description=data.description,
            slug=slug,
            workspace_id=data.workspace_id,
            author_id=author_id,
            visibility=data.visibility,
            tags=data.tags or [],
            created_at=now,
            updated_at=None,
            doc_type="entity",  # TODO: Change to your entity type
        )

        doc = self._model_in_db_to_doc(entity_in_db)
        await upsert_document(doc, partition_key=data.workspace_id)

        return self._model_in_db_to_model(entity_in_db)

    async def get_by_id(
        self, entity_id: str, workspace_id: str
    ) -> Optional["Entity"]:
        """
        Get entity by ID.

        Args:
            entity_id: Entity ID
            workspace_id: Workspace ID (partition key)

        Returns:
            Entity if found, None otherwise
        """
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        doc = await get_document(entity_id, partition_key=workspace_id)
        if doc is None:
            return None

        model_in_db = self._doc_to_model_in_db(doc)
        return self._model_in_db_to_model(model_in_db)

    async def get_by_slug(
        self, slug: str, workspace_id: str
    ) -> Optional["Entity"]:
        """
        Get entity by slug within a workspace.

        Args:
            slug: URL-friendly slug
            workspace_id: Workspace ID (partition key)

        Returns:
            Entity if found, None otherwise
        """
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        docs = await query_documents(
            doc_type="entity",  # TODO: Change to your entity type
            partition_key=workspace_id,
            extra_filter="AND c.slug = @slug",
            parameters=[{"name": "@slug", "value": slug}],
        )

        if not docs:
            return None

        model_in_db = self._doc_to_model_in_db(docs[0])
        return self._model_in_db_to_model(model_in_db)

    async def update(
        self,
        entity_id: str,
        workspace_id: str,
        data: "EntityUpdate",
    ) -> Optional["Entity"]:
        """
        Update entity.

        Args:
            entity_id: Entity ID
            workspace_id: Workspace ID (partition key)
            data: Update data (only non-None fields are applied)

        Returns:
            Updated entity if found, None otherwise
        """
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        doc = await get_document(entity_id, partition_key=workspace_id)
        if doc is None:
            return None

        model_in_db = self._doc_to_model_in_db(doc)

        # Apply only mutable fields; exclude_unset preserves an explicit null.
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field in {"name", "description", "visibility", "tags"}:
                setattr(model_in_db, field, value)

        model_in_db.updated_at = datetime.now(timezone.utc)

        updated_doc = self._model_in_db_to_doc(model_in_db)
        await upsert_document(updated_doc, partition_key=workspace_id)

        return self._model_in_db_to_model(model_in_db)

    async def delete(self, entity_id: str, workspace_id: str) -> bool:
        """
        Delete entity.

        Args:
            entity_id: Entity ID
            workspace_id: Workspace ID (partition key)

        Returns:
            True if deleted, False if not found
        """
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        return await delete_document(entity_id, partition_key=workspace_id)

    async def list_by_workspace(self, workspace_id: str) -> list["Entity"]:
        """
        List all entities in a workspace.

        Args:
            workspace_id: Workspace ID (partition key)

        Returns:
            List of entities (empty if unavailable)
        """
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        docs = await query_documents(
            doc_type="entity",  # TODO: Change to your entity type
            partition_key=workspace_id,
        )

        return [
            self._model_in_db_to_model(self._doc_to_model_in_db(doc))
            for doc in docs
        ]


# Singleton instance
entity_service = EntityService()
