"""
backend/app/jurisdiction/__init__.py
"""

from .jurisdiction import (
    JurisdictionType,
    JurisdictionNode,
    BMC_WARDS_REGISTRY,
    get_jurisdiction,
    get_subordinate_jurisdiction_ids,
    is_in_jurisdiction_scope,
    resolve_area_to_jurisdiction_id,
    _JURISDICTION_REGISTRY,
)

__all__ = [
    "JurisdictionType",
    "JurisdictionNode",
    "BMC_WARDS_REGISTRY",
    "get_jurisdiction",
    "get_subordinate_jurisdiction_ids",
    "is_in_jurisdiction_scope",
    "resolve_area_to_jurisdiction_id",
    "_JURISDICTION_REGISTRY",
]
