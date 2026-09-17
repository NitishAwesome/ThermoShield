"""
ThermoShield Authority Access Request Validation
Canonical compatibility validation between Organization, Department,
Designation, Functional Role, and Operational Jurisdiction.
"""
from typing import Tuple, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Configured Authority Organizations and their allowed parameters
CONFIGURED_ORGANIZATIONS = {
    "MCGM": {
        "id": "MCGM",
        "name": "Municipal Corporation of Greater Mumbai (MCGM / BMC)",
        "allowed_levels": ["MUNICIPAL_CORPORATION", "ADMINISTRATIVE_WARD"],
        "primary_jurisdiction": "IN-MH-MCGM",
        "allowed_roles": ["municipal_hap_officer", "ward_officer", "responder", "official"],
        "departments": [
            "Disaster Management Cell",
            "Heat Action / Climate Cell",
            "Public Health",
            "Urban Health",
            "Administration",
        ],
    },
    "MH_SDMA": {
        "id": "MH_SDMA",
        "name": "Maharashtra State Disaster Management Authority (SDMA)",
        "allowed_levels": ["STATE_UT"],
        "primary_jurisdiction": "IN-MH",
        "allowed_roles": ["state_coordinator", "national_analyst", "responder", "official"],
        "departments": [
            "Disaster Management Cell",
            "State Emergency Operations Centre",
            "Heat Action / Climate Cell",
            "Emergency Response",
            "Administration",
        ],
    },
    "MH_PHD": {
        "id": "MH_PHD",
        "name": "Maharashtra Public Health Department",
        "allowed_levels": ["STATE_UT", "DISTRICT"],
        "primary_jurisdiction": "IN-MH",
        "allowed_roles": ["state_coordinator", "district_authority", "official"],
        "departments": [
            "Public Health",
            "Urban Health",
            "Administration",
            "Emergency Response",
        ],
    },
    "PUNE_DDMA": {
        "id": "PUNE_DDMA",
        "name": "District Disaster Management Authority — Pune",
        "allowed_levels": ["DISTRICT"],
        "primary_jurisdiction": "IN-MH-DIST-PUN",
        "allowed_roles": ["district_authority", "responder", "official"],
        "departments": [
            "Disaster Management Cell",
            "Emergency Response",
            "Public Health",
            "Administration",
        ],
    },
    "NAGPUR_DDMA": {
        "id": "NAGPUR_DDMA",
        "name": "District Disaster Management Authority — Nagpur",
        "allowed_levels": ["DISTRICT"],
        "primary_jurisdiction": "IN-MH-DIST-NAGPUR",
        "allowed_roles": ["district_authority", "responder", "official"],
        "departments": [
            "Disaster Management Cell",
            "Emergency Response",
            "Public Health",
            "Administration",
        ],
    },
    "NDMA": {
        "id": "NDMA",
        "name": "National Disaster Management Authority (NDMA)",
        "allowed_levels": ["COUNTRY"],
        "primary_jurisdiction": "IN",
        "allowed_roles": ["national_analyst", "system_admin", "responder", "official"],
        "departments": [
            "Disaster Management Cell",
            "Emergency Response",
            "Administration",
        ],
    },
    "IMD": {
        "id": "IMD",
        "name": "India Meteorological Department (IMD)",
        "allowed_levels": ["COUNTRY"],
        "primary_jurisdiction": "IN",
        "allowed_roles": ["national_analyst", "analyst"],
        "departments": [
            "Meteorological Analysis",
            "Heat Action / Climate Cell",
            "Administration",
        ],
    },
    "NCDC": {
        "id": "NCDC",
        "name": "National Centre for Disease Control (NCDC)",
        "allowed_levels": ["COUNTRY"],
        "primary_jurisdiction": "IN",
        "allowed_roles": ["national_analyst", "district_authority", "official"],
        "departments": [
            "Public Health",
            "Urban Health",
            "Administration",
        ],
    },
}

ROLE_KEY_NORMALIZATION = {
    "heat action plan officer": "municipal_hap_officer",
    "municipal_hap_officer": "municipal_hap_officer",
    "heat-risk analyst": "national_analyst",
    "national_analyst": "national_analyst",
    "public health monitoring": "district_authority",
    "district_authority": "district_authority",
    "emergency / field response": "responder",
    "responder": "responder",
    "ward operations": "ward_officer",
    "ward_officer": "ward_officer",
    "state coordination": "state_coordinator",
    "state_coordinator": "state_coordinator",
    "national analysis": "national_analyst",
    "system_admin": "system_admin",
    "official": "official",
}


def match_organization(org_str: str | None) -> Dict[str, Any] | None:
    if not org_str:
        return None
    org_upper = org_str.strip().upper()

    # Exact key match
    if org_upper in CONFIGURED_ORGANIZATIONS:
        return CONFIGURED_ORGANIZATIONS[org_upper]

    # Substring / Keyword matching
    if "MCGM" in org_upper or "GREATER MUMBAI" in org_upper or "BMC" in org_upper:
        return CONFIGURED_ORGANIZATIONS["MCGM"]
    if "SDMA" in org_upper or ("MAHARASHTRA" in org_upper and "DISASTER" in org_upper):
        return CONFIGURED_ORGANIZATIONS["MH_SDMA"]
    if "MAHARASHTRA" in org_upper and ("HEALTH" in org_upper or "PHD" in org_upper):
        return CONFIGURED_ORGANIZATIONS["MH_PHD"]
    if "PUNE" in org_upper and "DDMA" in org_upper:
        return CONFIGURED_ORGANIZATIONS["PUNE_DDMA"]
    if "NAGPUR" in org_upper and "DDMA" in org_upper:
        return CONFIGURED_ORGANIZATIONS["NAGPUR_DDMA"]
    if "NDMA" in org_upper or "NATIONAL DISASTER" in org_upper:
        return CONFIGURED_ORGANIZATIONS["NDMA"]
    if "IMD" in org_upper or "METEOROLOGICAL" in org_upper:
        return CONFIGURED_ORGANIZATIONS["IMD"]
    if "NCDC" in org_upper or "DISEASE CONTROL" in org_upper:
        return CONFIGURED_ORGANIZATIONS["NCDC"]

    return None


def validate_authority_access_request(
    organization: str | None,
    department: str | None,
    designation: str | None,
    requested_role: str | None,
    jurisdiction_id: str | None,
    jurisdiction_type: str | None = None,
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Validates mutually consistent Organization, Department, Designation,
    Functional Role, and Jurisdiction.

    Returns:
        (is_valid, errors_list, normalized_data_dict)
    """
    errors: List[str] = []
    normalized: Dict[str, Any] = {
        "organization": organization,
        "department": department,
        "designation": designation,
        "normalized_role": "user",
        "normalized_jurisdiction_id": jurisdiction_id or "IN",
        "normalized_jurisdiction_type": jurisdiction_type or "COUNTRY",
        "normalized_jurisdiction_name": "India (National)",
    }

    if not organization or not organization.strip():
        errors.append("Organization is required for authority access requests.")
        return False, errors, normalized

    org_config = match_organization(organization)
    if not org_config:
        errors.append(f"Organization '{organization}' is not recognized in the configured authority catalog.")
        return False, errors, normalized

    normalized["organization"] = org_config["name"]

    # Normalize Role
    role_input = (requested_role or "").strip().lower()
    canonical_role = ROLE_KEY_NORMALIZATION.get(role_input, role_input)
    normalized["normalized_role"] = canonical_role

    # Verify role is allowed for organization
    if canonical_role not in org_config["allowed_roles"]:
        allowed_names = ", ".join(org_config["allowed_roles"])
        errors.append(
            f"Role '{requested_role}' is not compatible with '{org_config['name']}'. "
            f"Allowed roles: {allowed_names}."
        )

    # Resolve and Validate Jurisdiction
    req_juris = (jurisdiction_id or "").strip()
    if not req_juris:
        errors.append("Operational jurisdiction is required for authority access requests.")
        return False, errors, normalized

    normalized["normalized_jurisdiction_id"] = req_juris

    # Specific Organization Jurisdiction Rules
    org_id = org_config["id"]
    if org_id == "MCGM":
        # Must be IN-MH-MCGM or a BMC ward
        if req_juris != "IN-MH-MCGM" and not req_juris.startswith("IN-MH-MCGM-"):
            errors.append(
                f"MCGM operates strictly within Greater Mumbai (IN-MH-MCGM) or its administrative wards. "
                f"Requested jurisdiction '{req_juris}' is invalid."
            )
        else:
            normalized["normalized_jurisdiction_type"] = (
                "ADMINISTRATIVE_WARD" if req_juris.startswith("IN-MH-MCGM-") else "MUNICIPAL_CORPORATION"
            )
            normalized["normalized_jurisdiction_name"] = (
                f"BMC Ward ({req_juris.replace('IN-MH-MCGM-', '')})"
                if req_juris.startswith("IN-MH-MCGM-")
                else "Greater Mumbai (MCGM)"
            )

    elif org_id in ("MH_SDMA", "MH_PHD"):
        # Must be IN-MH or a Maharashtra district
        if req_juris != "IN-MH" and not req_juris.startswith("IN-MH-DIST-"):
            errors.append(
                f"'{org_config['name']}' operates within Maharashtra (IN-MH) or its subordinate districts. "
                f"Requested jurisdiction '{req_juris}' is invalid."
            )
        else:
            normalized["normalized_jurisdiction_type"] = (
                "DISTRICT" if req_juris.startswith("IN-MH-DIST-") else "STATE_UT"
            )
            normalized["normalized_jurisdiction_name"] = (
                f"District ({req_juris.replace('IN-MH-DIST-', '')})"
                if req_juris.startswith("IN-MH-DIST-")
                else "Maharashtra"
            )

    elif org_id == "PUNE_DDMA":
        if req_juris != "IN-MH-DIST-PUN" and "PUN" not in req_juris.upper():
            errors.append(
                f"Pune DDMA operates strictly within Pune District (IN-MH-DIST-PUN). "
                f"Requested jurisdiction '{req_juris}' is invalid."
            )
        else:
            normalized["normalized_jurisdiction_id"] = "IN-MH-DIST-PUN"
            normalized["normalized_jurisdiction_type"] = "DISTRICT"
            normalized["normalized_jurisdiction_name"] = "Pune District"

    elif org_id == "NAGPUR_DDMA":
        if req_juris != "IN-MH-DIST-NAGPUR" and "NAGPUR" not in req_juris.upper():
            errors.append(
                f"Nagpur DDMA operates strictly within Nagpur District (IN-MH-DIST-NAGPUR). "
                f"Requested jurisdiction '{req_juris}' is invalid."
            )
        else:
            normalized["normalized_jurisdiction_id"] = "IN-MH-DIST-NAGPUR"
            normalized["normalized_jurisdiction_type"] = "DISTRICT"
            normalized["normalized_jurisdiction_name"] = "Nagpur District"

    elif org_id in ("NDMA", "IMD", "NCDC"):
        if req_juris != "IN":
            errors.append(
                f"'{org_config['name']}' operates at the National level (IN). "
                f"Requested jurisdiction '{req_juris}' is invalid."
            )
        else:
            normalized["normalized_jurisdiction_id"] = "IN"
            normalized["normalized_jurisdiction_type"] = "COUNTRY"
            normalized["normalized_jurisdiction_name"] = "India (National)"

    # Role <-> Jurisdiction semantic consistency
    if canonical_role == "municipal_hap_officer" and normalized["normalized_jurisdiction_type"] != "MUNICIPAL_CORPORATION":
        errors.append("Municipal HAP Nodal Officer role must be assigned to a Municipal Corporation jurisdiction (e.g. IN-MH-MCGM).")

    if canonical_role == "ward_officer" and normalized["normalized_jurisdiction_type"] != "ADMINISTRATIVE_WARD":
        errors.append("Ward Officer role must be assigned to an Administrative Ward jurisdiction.")

    if canonical_role == "state_coordinator" and normalized["normalized_jurisdiction_type"] != "STATE_UT":
        errors.append("State Coordinator role must be assigned to a State / UT jurisdiction (e.g. IN-MH).")

    if canonical_role == "national_analyst" and normalized["normalized_jurisdiction_type"] not in ("COUNTRY", "STATE_UT"):
        errors.append("National / Regional Analyst role cannot be assigned below State level.")

    is_valid = len(errors) == 0
    return is_valid, errors, normalized
