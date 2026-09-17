"""
backend/app/jurisdiction/jurisdiction.py
========================================
Canonical jurisdiction domain model, taxonomy, and graph relationships
for ThermoShield Authority.

Implements:
1. Canonical Jurisdiction Types:
   COUNTRY, STATE_UT, DISTRICT, MUNICIPAL_CORPORATION, MUNICIPALITY,
   LOCAL_BODY, ADMINISTRATIVE_ZONE, ADMINISTRATIVE_WARD.
2. Stable Canonical Jurisdiction IDs:
   - IN (Country)
   - IN-MH (Maharashtra State)
   - IN-DL (Delhi UT)
   - IN-MH-DIST-MUMBAI-CITY (Mumbai City District)
   - IN-MH-DIST-MUMBAI-SUBURBAN (Mumbai Suburban District)
   - IN-MH-DIST-NAGPUR (Nagpur District)
   - IN-MH-MCGM (Greater Mumbai Municipal Corporation / BMC)
   - IN-MH-MCGM-A through IN-MH-MCGM-T (24 BMC Administrative Wards)
3. Multi-Parent / Non-Tree Relationship Graph:
   Greater Mumbai (IN-MH-MCGM) is a MUNICIPAL jurisdiction spanning
   two revenue districts (Mumbai City & Mumbai Suburban) and containing
   the 24 administrative wards.
4. Scope Authorization Verification:
   is_in_jurisdiction_scope(user_scope_id, target_jurisdiction_id) -> bool
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class JurisdictionType(str, Enum):
    COUNTRY = "COUNTRY"
    STATE_UT = "STATE_UT"
    DISTRICT = "DISTRICT"
    MUNICIPAL_CORPORATION = "MUNICIPAL_CORPORATION"
    MUNICIPALITY = "MUNICIPALITY"
    LOCAL_BODY = "LOCAL_BODY"
    ADMINISTRATIVE_ZONE = "ADMINISTRATIVE_ZONE"
    ADMINISTRATIVE_WARD = "ADMINISTRATIVE_WARD"


class JurisdictionNode(BaseModel):
    id: str
    name: str
    type: JurisdictionType
    parent_id: Optional[str] = None
    state_id: Optional[str] = None
    district_ids: List[str] = Field(default_factory=list)
    child_ids: List[str] = Field(default_factory=list)
    aliases: List[str] = Field(default_factory=list)
    centroid: Dict[str, float] = Field(default_factory=dict)
    has_municipal_detail: bool = False


# Canonical 24 BMC Administrative Wards Registry
BMC_WARDS_REGISTRY = [
    {"id": "IN-MH-MCGM-A", "code": "A", "name": "Colaba / Fort / Nariman Point", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 18.9220, "lon": 72.8347},
    {"id": "IN-MH-MCGM-B", "code": "B", "name": "Sandhurst Road / Dongri", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 18.9600, "lon": 72.8400},
    {"id": "IN-MH-MCGM-C", "code": "C", "name": "Marine Lines / Kalbadevi", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 18.9480, "lon": 72.8250},
    {"id": "IN-MH-MCGM-D", "code": "D", "name": "Malabar Hill / Grant Road", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 18.9630, "lon": 72.8120},
    {"id": "IN-MH-MCGM-EN", "code": "E", "name": "Byculla / Mazgaon", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 18.9750, "lon": 72.8350},
    {"id": "IN-MH-MCGM-FS", "code": "F/S", "name": "Parel / Sewri", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 18.9950, "lon": 72.8400},
    {"id": "IN-MH-MCGM-FN", "code": "F/N", "name": "Matunga / Wadala / Sion", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 19.0280, "lon": 72.8550},
    {"id": "IN-MH-MCGM-GS", "code": "G/S", "name": "Worli / Lower Parel", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 19.0050, "lon": 72.8200},
    {"id": "IN-MH-MCGM-GN", "code": "G/N", "name": "Dharavi / Mahim / Dadar", "parent_id": "IN-MH-MCGM", "district": "Mumbai City", "lat": 19.0400, "lon": 72.8420},
    {"id": "IN-MH-MCGM-HE", "code": "H/E", "name": "Bandra East / Santacruz East", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.0600, "lon": 72.8500},
    {"id": "IN-MH-MCGM-HW", "code": "H/W", "name": "Bandra West / Khar West", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.0550, "lon": 72.8300},
    {"id": "IN-MH-MCGM-KE", "code": "K/E", "name": "Andheri East / Jogeshwari East", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.1150, "lon": 72.8650},
    {"id": "IN-MH-MCGM-KW", "code": "K/W", "name": "Andheri West / Juhu / Versova", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.1250, "lon": 72.8250},
    {"id": "IN-MH-MCGM-L", "code": "L", "name": "Kurla / Chunabhatti", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.0700, "lon": 72.8800},
    {"id": "IN-MH-MCGM-ME", "code": "M/E", "name": "Govandi / Mankhurd / Shivaji Nagar", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.0550, "lon": 72.9250},
    {"id": "IN-MH-MCGM-MW", "code": "M/W", "name": "Chembur / Tilak Nagar", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.0600, "lon": 72.8950},
    {"id": "IN-MH-MCGM-N", "code": "N", "name": "Ghatkopar / Vikhroli West", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.0850, "lon": 72.9100},
    {"id": "IN-MH-MCGM-PS", "code": "P/S", "name": "Goregaon East / Goregaon West", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.1600, "lon": 72.8450},
    {"id": "IN-MH-MCGM-PN", "code": "P/N", "name": "Malad East / Malad West", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.1850, "lon": 72.8400},
    {"id": "IN-MH-MCGM-RC", "code": "R/C", "name": "Borivali / Gorai", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.2300, "lon": 72.8550},
    {"id": "IN-MH-MCGM-RS", "code": "R/S", "name": "Kandivali East / Kandivali West", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.2050, "lon": 72.8450},
    {"id": "IN-MH-MCGM-RN", "code": "R/N", "name": "Dahisar / Mandapeshwar", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.2550, "lon": 72.8600},
    {"id": "IN-MH-MCGM-S", "code": "S", "name": "Bhandup / Powai / Kanjurmarg", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.1450, "lon": 72.9300},
    {"id": "IN-MH-MCGM-T", "code": "T", "name": "Mulund / Nahur", "parent_id": "IN-MH-MCGM", "district": "Mumbai Suburban", "lat": 19.1750, "lon": 72.9500},
]


def build_jurisdiction_registry() -> Dict[str, JurisdictionNode]:
    """Builds the canonical in-memory jurisdiction graph."""
    registry: Dict[str, JurisdictionNode] = {}

    # 1. Country (India)
    registry["IN"] = JurisdictionNode(
        id="IN",
        name="India",
        type=JurisdictionType.COUNTRY,
        parent_id=None,
        state_id=None,
        centroid={"latitude": 22.8000, "longitude": 79.5000},
        has_municipal_detail=False,
    )

    # 2. Key States / UTs (All 36 Units Supported)
    states_data = [
        ("IN-AN", "Andaman & Nicobar Islands", "UT", 11.7401, 92.6586),
        ("IN-AP", "Andhra Pradesh", "State", 15.9129, 79.7400),
        ("IN-AR", "Arunachal Pradesh", "State", 28.2180, 94.7278),
        ("IN-AS", "Assam", "State", 26.2006, 92.9376),
        ("IN-BR", "Bihar", "State", 25.0961, 85.3131),
        ("IN-CH", "Chandigarh", "UT", 30.7333, 76.7794),
        ("IN-CT", "Chhattisgarh", "State", 21.2787, 81.8661),
        ("IN-DH", "Dadra and Nagar Haveli and Daman and Diu", "UT", 20.4283, 72.8397),
        ("IN-DL", "Delhi", "UT", 28.7041, 77.1025),
        ("IN-GA", "Goa", "State", 15.2993, 74.1240),
        ("IN-GJ", "Gujarat", "State", 22.2587, 71.1924),
        ("IN-HR", "Haryana", "State", 29.0588, 76.0856),
        ("IN-HP", "Himachal Pradesh", "State", 31.1048, 77.1734),
        ("IN-JK", "Jammu and Kashmir", "UT", 33.7782, 76.5762),
        ("IN-JH", "Jharkhand", "State", 23.6102, 85.2799),
        ("IN-KA", "Karnataka", "State", 15.3173, 75.7139),
        ("IN-KL", "Kerala", "State", 10.8505, 76.2711),
        ("IN-LA", "Ladakh", "UT", 34.1526, 77.5771),
        ("IN-LD", "Lakshadweep", "UT", 10.5667, 72.6417),
        ("IN-MP", "Madhya Pradesh", "State", 22.9734, 78.6569),
        ("IN-MH", "Maharashtra", "State", 19.7515, 75.7139),
        ("IN-MN", "Manipur", "State", 24.6637, 93.9063),
        ("IN-ML", "Meghalaya", "State", 25.4670, 91.3662),
        ("IN-MZ", "Mizoram", "State", 23.1645, 92.9376),
        ("IN-NL", "Nagaland", "State", 26.1584, 94.5624),
        ("IN-OR", "Odisha", "State", 20.9517, 85.9838),
        ("IN-PY", "Puducherry", "UT", 11.9416, 79.8083),
        ("IN-PB", "Punjab", "State", 31.1471, 75.3412),
        ("IN-RJ", "Rajasthan", "State", 27.0238, 74.2179),
        ("IN-SK", "Sikkim", "State", 27.5330, 88.5122),
        ("IN-TN", "Tamil Nadu", "State", 11.1271, 78.6569),
        ("IN-TG", "Telangana", "State", 18.1124, 79.0193),
        ("IN-TR", "Tripura", "State", 23.9408, 91.9882),
        ("IN-UP", "Uttar Pradesh", "State", 26.8467, 80.9462),
        ("IN-UT", "Uttarakhand", "State", 30.0668, 79.0193),
        ("IN-WB", "West Bengal", "State", 22.9868, 87.8550),
    ]

    for s_id, s_name, _st_type, s_lat, s_lon in states_data:
        registry[s_id] = JurisdictionNode(
            id=s_id,
            name=s_name,
            type=JurisdictionType.STATE_UT,
            parent_id="IN",
            state_id=s_id,
            centroid={"latitude": s_lat, "longitude": s_lon},
            has_municipal_detail=(s_id == "IN-MH"),
        )
        registry["IN"].child_ids.append(s_id)

    # 3. Maharashtra Districts (All 36 Units)
    mh_districts = [
        ("IN-MH-DIST-AHM", "Ahilyanagar", ["Ahmednagar"], 19.0952, 74.7496),
        ("IN-MH-DIST-AKO", "Akola", [], 20.7002, 77.0082),
        ("IN-MH-DIST-AMR", "Amravati", [], 20.9320, 77.7523),
        ("IN-MH-DIST-BEED", "Beed", [], 18.9891, 75.7601),
        ("IN-MH-DIST-BHA", "Bhandara", [], 21.1667, 79.6500),
        ("IN-MH-DIST-BUL", "Buldhana", [], 20.5293, 76.1843),
        ("IN-MH-DIST-CHA", "Chandrapur", [], 19.9615, 79.2961),
        ("IN-MH-DIST-CSN", "Chhatrapati Sambhajinagar", ["Aurangabad"], 19.8762, 75.3433),
        ("IN-MH-DIST-DHA", "Dharashiv", ["Osmanabad"], 18.1856, 76.0419),
        ("IN-MH-DIST-DHU", "Dhule", [], 20.9042, 74.7749),
        ("IN-MH-DIST-GAD", "Gadchiroli", [], 20.1809, 80.0034),
        ("IN-MH-DIST-GON", "Gondia", [], 21.4598, 80.1961),
        ("IN-MH-DIST-HIN", "Hingoli", [], 19.7196, 77.1472),
        ("IN-MH-DIST-JAL", "Jalgaon", [], 21.0077, 75.5626),
        ("IN-MH-DIST-JLN", "Jalna", [], 19.8410, 75.8864),
        ("IN-MH-DIST-KOL", "Kolhapur", [], 16.7050, 74.2433),
        ("IN-MH-DIST-LAT", "Latur", [], 18.4088, 76.5604),
        ("IN-MH-DIST-MUMBAI-CITY", "Mumbai City", ["Mumbai"], 18.9600, 72.8200),
        ("IN-MH-DIST-MUMBAI-SUBURBAN", "Mumbai Suburban", ["Mumbai Suburb"], 19.1200, 72.8800),
        ("IN-MH-DIST-NAGPUR", "Nagpur", [], 21.1458, 79.0882),
        ("IN-MH-DIST-NAN", "Nanded", [], 19.1383, 77.3210),
        ("IN-MH-DIST-NANB", "Nandurbar", [], 21.3739, 74.2386),
        ("IN-MH-DIST-NAS", "Nashik", [], 19.9975, 73.7898),
        ("IN-MH-DIST-PAL", "Palghar", [], 19.6967, 72.7699),
        ("IN-MH-DIST-PAR", "Parbhani", [], 19.2612, 76.7749),
        ("IN-MH-DIST-PUN", "Pune", [], 18.5204, 73.8567),
        ("IN-MH-DIST-RAI", "Raigad", [], 18.5158, 73.1822),
        ("IN-MH-DIST-RAT", "Ratnagiri", [], 16.9902, 73.3120),
        ("IN-MH-DIST-SAN", "Sangli", [], 16.8524, 74.5815),
        ("IN-MH-DIST-SAT", "Satara", [], 17.6805, 73.9935),
        ("IN-MH-DIST-SIN", "Sindhudurg", [], 16.1167, 73.6667),
        ("IN-MH-DIST-SOL", "Solapur", [], 17.6599, 75.9064),
        ("IN-MH-DIST-THA", "Thane", [], 19.2183, 72.9781),
        ("IN-MH-DIST-WAR", "Wardha", [], 20.7453, 78.6022),
        ("IN-MH-DIST-WAS", "Washim", [], 20.1111, 77.1333),
        ("IN-MH-DIST-YAV", "Yavatmal", [], 20.3888, 78.1204),
    ]

    for d_id, d_name, d_aliases, d_lat, d_lon in mh_districts:
        has_mcgm = d_id in ("IN-MH-DIST-MUMBAI-CITY", "IN-MH-DIST-MUMBAI-SUBURBAN")
        registry[d_id] = JurisdictionNode(
            id=d_id,
            name=d_name,
            type=JurisdictionType.DISTRICT,
            parent_id="IN-MH",
            state_id="IN-MH",
            aliases=d_aliases,
            centroid={"latitude": d_lat, "longitude": d_lon},
            has_municipal_detail=has_mcgm,
        )
        registry["IN-MH"].child_ids.append(d_id)

    # 4. Greater Mumbai Municipal Corporation (MCGM / BMC)
    # Important Non-Strict-Tree Relation: MCGM spans Mumbai City and Mumbai Suburban districts!
    registry["IN-MH-MCGM"] = JurisdictionNode(
        id="IN-MH-MCGM",
        name="Greater Mumbai Municipal Corporation",
        type=JurisdictionType.MUNICIPAL_CORPORATION,
        parent_id="IN-MH",
        state_id="IN-MH",
        district_ids=["IN-MH-DIST-MUMBAI-CITY", "IN-MH-DIST-MUMBAI-SUBURBAN"],
        aliases=["BMC", "MCGM", "Greater Mumbai", "Brihanmumbai Municipal Corporation"],
        centroid={"latitude": 19.0760, "longitude": 72.8777},
        has_municipal_detail=True,
    )
    registry["IN-MH"].child_ids.append("IN-MH-MCGM")

    # 5. 24 BMC Administrative Wards
    for ward in BMC_WARDS_REGISTRY:
        w_id = ward["id"]
        registry[w_id] = JurisdictionNode(
            id=w_id,
            name=f"Ward {ward['code']} ({ward['name']})",
            type=JurisdictionType.ADMINISTRATIVE_WARD,
            parent_id="IN-MH-MCGM",
            state_id="IN-MH",
            district_ids=["IN-MH-DIST-MUMBAI-CITY" if ward["district"] == "Mumbai City" else "IN-MH-DIST-MUMBAI-SUBURBAN"],
            aliases=[ward["code"], ward["name"]],
            centroid={"latitude": ward["lat"], "longitude": ward["lon"]},
            has_municipal_detail=False,
        )
        registry["IN-MH-MCGM"].child_ids.append(w_id)

    return registry


_JURISDICTION_REGISTRY = build_jurisdiction_registry()


def get_jurisdiction(jurisdiction_id: str) -> Optional[JurisdictionNode]:
    """Retrieves a canonical jurisdiction node by ID or normalized alias."""
    if not jurisdiction_id:
        return None
    
    clean_id = jurisdiction_id.strip()
    if clean_id in _JURISDICTION_REGISTRY:
        return _JURISDICTION_REGISTRY[clean_id]
    
    # Check normalized aliases
    clean_lower = clean_id.lower()
    for node in _JURISDICTION_REGISTRY.values():
        if node.name.lower() == clean_lower or clean_lower in [a.lower() for a in node.aliases]:
            return node
        
    # Standard legacy mappings
    legacy_map = {
        "mumbai": "IN-MH-MCGM",
        "greater mumbai": "IN-MH-MCGM",
        "maharashtra": "IN-MH",
        "india": "IN",
        "delhi": "IN-DL",
        "nagpur": "IN-MH-DIST-NAGPUR",
        "pune": "IN-MH-DIST-PUN",
    }
    if clean_lower in legacy_map:
        return _JURISDICTION_REGISTRY.get(legacy_map[clean_lower])
        
    return None


def get_subordinate_jurisdiction_ids(jurisdiction_id: str) -> List[str]:
    """Returns all subordinate (descendant) jurisdiction IDs recursively."""
    node = get_jurisdiction(jurisdiction_id)
    if not node:
        return []
    
    result = [node.id]
    stack = list(node.child_ids)
    while stack:
        child_id = stack.pop()
        if child_id not in result:
            result.append(child_id)
            child_node = _JURISDICTION_REGISTRY.get(child_id)
            if child_node:
                stack.extend(child_node.child_ids)
    return result


def is_in_jurisdiction_scope(user_scope_id: Optional[str], target_jurisdiction_id: Optional[str]) -> bool:
    """
    Verifies whether the target jurisdiction is within the user's operational scope.
    Rules:
      1. National scope ('IN') has operational oversight across the country.
      2. Direct match (user_scope == target) is authorized.
      3. Target is a valid descendant in the jurisdiction graph.
      4. Special Mumbai cross-boundary case:
         A Greater Mumbai (IN-MH-MCGM) user has scope over all 24 BMC wards.
         A Ward user (IN-MH-MCGM-KE) ONLY has scope over their specific ward.
    """
    if not user_scope_id or not target_jurisdiction_id:
        return False
        
    user_node = get_jurisdiction(user_scope_id)
    target_node = get_jurisdiction(target_jurisdiction_id)
    
    if not user_node or not target_node:
        # Fallback to direct string match if unknown
        return user_scope_id.strip().upper() == target_jurisdiction_id.strip().upper()
        
    if user_node.id == "IN":
        return True
        
    if user_node.id == target_node.id:
        return True
        
    # Check if target is a subordinate of user's node
    subordinates = get_subordinate_jurisdiction_ids(user_node.id)
    return target_node.id in subordinates


def resolve_area_to_jurisdiction_id(area_id: str) -> str:
    """
    Maps area IDs (e.g. 'ward_a', 'ward_k_east', 'ward_f_south', 'mumbai', 'delhi', or raw canonical IDs)
    to a canonical jurisdiction ID.
    """
    if not area_id:
        return "IN"

    clean = area_id.strip().lower()
    if clean.startswith("in-"):
        clean_upper = clean.upper()
        if clean_upper in _JURISDICTION_REGISTRY:
            return clean_upper

    # Special handling for BMC wards: 'ward_a', 'ward_ke', 'ward_f_south', etc.
    normalized_ward = (
        clean.replace("ward_", "")
        .replace("_south", "s")
        .replace("_north", "n")
        .replace("_east", "e")
        .replace("_west", "w")
        .replace("_central", "c")
        .replace("/", "")
        .replace("_", "")
        .upper()
    )

    for w in BMC_WARDS_REGISTRY:
        w_code_clean = w["code"].replace("/", "").upper()
        if w_code_clean == normalized_ward or w["code"].upper() == normalized_ward:
            return w["id"]
        if w["id"].upper().endswith(f"-{normalized_ward}"):
            return w["id"]

    # Check ward names / localities
    for w in BMC_WARDS_REGISTRY:
        if normalized_ward in w["name"].upper().replace(" ", ""):
            return w["id"]

    if "mumbai" in clean or "mcgm" in clean or "bmc" in clean:
        return "IN-MH-MCGM"

    node = get_jurisdiction(clean)
    if node:
        return node.id

    return "IN"
