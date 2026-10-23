"""
{{ResourceName}} Router

Handles CRUD operations for {{resource_name}} resources.

Template placeholders to replace:
- {{ResourceName}} (PascalCase)
- {{resource_name}} (snake_case)
- {{resource_plural}} (plural snake_case)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth.jwt import get_current_user, get_current_user_required
from app.models.user import User
from app.models.{{resource_name}} import (
    {{ResourceName}},
    {{ResourceName}}Create,
    {{ResourceName}}Update,
)
from app.services.{{resource_name}}_service import {{ResourceName}}Service

router = APIRouter(prefix="/api", tags=["{{resource_plural}}"])


# ============================================================================
# Dependencies
# ============================================================================


def get_service() -> {{ResourceName}}Service:
    """Dependency to get service instance."""
    return {{ResourceName}}Service()


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/{{resource_plural}}", response_model=list[{{ResourceName}}])
async def list_{{resource_plural}}(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    service: {{ResourceName}}Service = Depends(get_service),
) -> list[{{ResourceName}}]:
    """
    List all {{resource_plural}}.

    - **limit**: Maximum number of items to return (1-100)
    - **offset**: Number of items to skip
    """
    return await service.list_{{resource_plural}}(limit=limit, offset=offset)


@router.get("/{{resource_plural}}/{{{resource_name}}_id}", response_model={{ResourceName}})
async def get_{{resource_name}}(
    {{resource_name}}_id: str,
    current_user: Optional[User] = Depends(get_current_user),
    service: {{ResourceName}}Service = Depends(get_service),
) -> {{ResourceName}}:
    """
    Get a specific {{resource_name}} by ID.

    Raises 404 if not found.
    """
    result = await service.get_{{resource_name}}_by_id({{resource_name}}_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{{ResourceName}} not found",
        )
    return result


@router.post(
    "/{{resource_plural}}",
    response_model={{ResourceName}},
    status_code=status.HTTP_201_CREATED,
)
async def create_{{resource_name}}(
    data: {{ResourceName}}Create,
    current_user: User = Depends(get_current_user_required),
    service: {{ResourceName}}Service = Depends(get_service),
) -> {{ResourceName}}:
    """
    Create a new {{resource_name}}.

    Requires authentication.
    """
    return await service.create_{{resource_name}}(data, current_user.id)


@router.patch("/{{resource_plural}}/{{{resource_name}}_id}", response_model={{ResourceName}})
async def update_{{resource_name}}(
    {{resource_name}}_id: str,
    data: {{ResourceName}}Update,
    current_user: User = Depends(get_current_user_required),
    service: {{ResourceName}}Service = Depends(get_service),
) -> {{ResourceName}}:
    """
    Update an existing {{resource_name}}.

    Requires authentication and ownership.
    """
    # Verify ownership
    existing = await service.get_{{resource_name}}_by_id({{resource_name}}_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{{ResourceName}} not found",
        )

    # Adapt the ownership field to the actual model; enforce before mutation.
    if existing.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this {{resource_name}}",
        )

    return await service.update_{{resource_name}}({{resource_name}}_id, data)


@router.delete(
    "/{{resource_plural}}/{{{resource_name}}_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_{{resource_name}}(
    {{resource_name}}_id: str,
    current_user: User = Depends(get_current_user_required),
    service: {{ResourceName}}Service = Depends(get_service),
) -> None:
    """
    Delete a {{resource_name}}.

    Requires authentication and ownership.
    """
    existing = await service.get_{{resource_name}}_by_id({{resource_name}}_id)
    if existing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{{ResourceName}} not found",
        )

    if existing.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this {{resource_name}}",
        )

    await service.delete_{{resource_name}}({{resource_name}}_id)
