import asyncio
import httpx
import logging
import math
from typing import Dict, List, Any, Optional, Tuple
from app.config import NOMINATIM_URL

logger = logging.getLogger(__name__)

# In-memory search cache to accelerate autocomplete and eliminate redundant network calls
MAX_LOCATION_CACHE_ENTRIES = 1000
MAX_REVERSE_CACHE_ENTRIES = 1000
_LOCATION_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_REVERSE_CACHE: Dict[tuple, Dict[str, Any]] = {}

# Shared persistent HTTP client with keep-alive connection pooling
_SHARED_CLIENT: Optional[httpx.AsyncClient] = None
_CLIENT_LOOP: Optional[asyncio.AbstractEventLoop] = None

def get_http_client() -> httpx.AsyncClient:
    global _SHARED_CLIENT, _CLIENT_LOOP
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if (
        _SHARED_CLIENT is None 
        or _SHARED_CLIENT.is_closed 
        or _CLIENT_LOOP != current_loop
    ):
        _SHARED_CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(2.5, connect=1.5),
            limits=httpx.Limits(max_keepalive_connections=25, max_connections=60, keepalive_expiry=60.0),
            headers={
                "User-Agent": "ThermoShield-HeatHealth-App/2.0 (admin@thermoshield.org)"
            }
        )
        _CLIENT_LOOP = current_loop
    return _SHARED_CLIENT


# ==============================================================================
# COMPREHENSIVE HIGH-COVERAGE INDIAN & GLOBAL GEOGRAPHIC DIRECTORY
# Enables instantaneous (<1ms) offline geocoding for all major cities,
# MMR nodes (Panvel, Navi Mumbai, Thane, Kalyan, etc.), tech hubs, and districts.
# ==============================================================================

POPULAR_GLOBAL_CITIES: List[Dict[str, Any]] = [
    # ── MUMBAI METROPOLITAN REGION (MMR) & NAVI MUMBAI ──
    {"name": "Panvel, Maharashtra, India", "latitude": 18.9894, "longitude": 73.1175, "aliases": ["panvel", "new panvel", "khandeshwar", "panvel city", "raigad panvel"]},
    {"name": "Navi Mumbai, Maharashtra, India", "latitude": 19.0330, "longitude": 73.0297, "aliases": ["navi mumbai", "new bombay", "nmmc"]},
    {"name": "Vashi, Navi Mumbai, Maharashtra, India", "latitude": 19.0771, "longitude": 72.9986, "aliases": ["vashi", "vashi sector 17", "vashi station"]},
    {"name": "Kharghar, Navi Mumbai, Maharashtra, India", "latitude": 19.0434, "longitude": 73.0689, "aliases": ["kharghar", "kharghar hills", "central park kharghar"]},
    {"name": "Nerul, Navi Mumbai, Maharashtra, India", "latitude": 19.0330, "longitude": 73.0180, "aliases": ["nerul", "nerul west", "nerul east", "seawoods nerul"]},
    {"name": "CBD Belapur, Navi Mumbai, Maharashtra, India", "latitude": 19.0178, "longitude": 73.0400, "aliases": ["belapur", "cbd belapur", "belapur station"]},
    {"name": "Seawoods, Navi Mumbai, Maharashtra, India", "latitude": 19.0195, "longitude": 73.0130, "aliases": ["seawoods", "seawoods grand central"]},
    {"name": "Kopar Khairane, Navi Mumbai, Maharashtra, India", "latitude": 19.1026, "longitude": 73.0090, "aliases": ["kopar khairane", "koparkhairane"]},
    {"name": "Ghansoli, Navi Mumbai, Maharashtra, India", "latitude": 19.1245, "longitude": 73.0034, "aliases": ["ghansoli", "reliance corporate park ghansoli"]},
    {"name": "Airoli, Navi Mumbai, Maharashtra, India", "latitude": 19.1579, "longitude": 72.9935, "aliases": ["airoli", "mindspace airoli"]},
    {"name": "Kamothe, Navi Mumbai, Maharashtra, India", "latitude": 19.0180, "longitude": 73.0900, "aliases": ["kamothe", "mansarovar"]},
    {"name": "Kalamboli, Navi Mumbai, Maharashtra, India", "latitude": 19.0300, "longitude": 73.1050, "aliases": ["kalamboli", "steel market kalamboli"]},
    {"name": "Taloja, Navi Mumbai, Maharashtra, India", "latitude": 19.0600, "longitude": 73.1250, "aliases": ["taloja", "taloja midc"]},
    {"name": "Ulwe, Navi Mumbai, Maharashtra, India", "latitude": 18.9750, "longitude": 73.0250, "aliases": ["ulwe", "navi mumbai airport ulwe"]},
    {"name": "Uran, Maharashtra, India", "latitude": 18.8800, "longitude": 72.9300, "aliases": ["uran", "jnpt", "dronagiri"]},

    # ── THANE & CENTRAL / NORTHERN SUBURBS ──
    {"name": "Thane, Maharashtra, India", "latitude": 19.2183, "longitude": 72.9781, "aliases": ["thane", "thane west", "thane east", "ghodbunder", "majiwada"]},
    {"name": "Kalyan, Maharashtra, India", "latitude": 19.2403, "longitude": 73.1305, "aliases": ["kalyan", "kalyan west", "kalyan station", "kdmc"]},
    {"name": "Dombivli, Maharashtra, India", "latitude": 19.2184, "longitude": 73.0867, "aliases": ["dombivli", "dombivali", "dombivli east", "dombivli west"]},
    {"name": "Ulhasnagar, Maharashtra, India", "latitude": 19.2167, "longitude": 73.1500, "aliases": ["ulhasnagar"]},
    {"name": "Ambernath, Maharashtra, India", "latitude": 19.2000, "longitude": 73.1800, "aliases": ["ambernath", "ambarnath"]},
    {"name": "Badlapur, Maharashtra, India", "latitude": 19.1667, "longitude": 73.2333, "aliases": ["badlapur", "kulgaon badlapur"]},
    {"name": "Bhiwandi, Maharashtra, India", "latitude": 19.2967, "longitude": 73.0631, "aliases": ["bhiwandi", "bhiwandi logistics"]},
    {"name": "Mira-Bhayandar, Maharashtra, India", "latitude": 19.2813, "longitude": 72.8561, "aliases": ["mira road", "bhayandar", "mira bhayandar", "mbmc"]},
    {"name": "Vasai-Virar, Maharashtra, India", "latitude": 19.3919, "longitude": 72.8397, "aliases": ["vasai", "virar", "vasai virar", "nalasopara", "vvcmc"]},

    # ── MUMBAI CITY & SUBURBS ──
    {"name": "Mumbai, Maharashtra, India", "latitude": 19.0760, "longitude": 72.8777, "aliases": ["mumbai", "bombay", "bmc", "mcgm"]},
    {"name": "Andheri, Mumbai, Maharashtra, India", "latitude": 19.1197, "longitude": 72.8468, "aliases": ["andheri", "andheri west", "andheri east", "lokhandwala"]},
    {"name": "Bandra, Mumbai, Maharashtra, India", "latitude": 19.0596, "longitude": 72.8295, "aliases": ["bandra", "bandra west", "bandra bandstand", "carter road"]},
    {"name": "Bandra Kurla Complex (BKC), Mumbai, Maharashtra, India", "latitude": 19.0662, "longitude": 72.8687, "aliases": ["bkc", "bandra kurla complex", "bkc mumbai"]},
    {"name": "Dadar, Mumbai, Maharashtra, India", "latitude": 19.0178, "longitude": 72.8478, "aliases": ["dadar", "dadar west", "dadar east", "shivaji park"]},
    {"name": "Borivali, Mumbai, Maharashtra, India", "latitude": 19.2307, "longitude": 72.8567, "aliases": ["borivali", "borivali west", "borivali east", "national park borivali"]},
    {"name": "Kandivali, Mumbai, Maharashtra, India", "latitude": 19.2047, "longitude": 72.8522, "aliases": ["kandivali", "kandivali west", "kandivali east"]},
    {"name": "Malad, Mumbai, Maharashtra, India", "latitude": 19.1874, "longitude": 72.8484, "aliases": ["malad", "malad west", "malad east", "inorbit malad"]},
    {"name": "Goregaon, Mumbai, Maharashtra, India", "latitude": 19.1663, "longitude": 72.8526, "aliases": ["goregaon", "goregaon east", "aarey colony"]},
    {"name": "Chembur, Mumbai, Maharashtra, India", "latitude": 19.0522, "longitude": 72.8994, "aliases": ["chembur", "chembur east", "chembur naka"]},
    {"name": "Kurla, Mumbai, Maharashtra, India", "latitude": 19.0726, "longitude": 72.8845, "aliases": ["kurla", "kurla west", "phoenix marketcity kurla"]},
    {"name": "Ghatkopar, Mumbai, Maharashtra, India", "latitude": 19.0860, "longitude": 72.9090, "aliases": ["ghatkopar", "ghatkopar east", "ghatkopar west"]},
    {"name": "Mulund, Mumbai, Maharashtra, India", "latitude": 19.1726, "longitude": 72.9565, "aliases": ["mulund", "mulund west"]},
    {"name": "Powai, Mumbai, Maharashtra, India", "latitude": 19.1176, "longitude": 72.9060, "aliases": ["powai", "iit bombay", "hiranandani powai"]},
    {"name": "Worli, Mumbai, Maharashtra, India", "latitude": 19.0130, "longitude": 72.8180, "aliases": ["worli", "worli sea face", "lower parel"]},
    {"name": "Colaba, Mumbai, Maharashtra, India", "latitude": 18.9067, "longitude": 72.8147, "aliases": ["colaba", "cuffe parade", "fort mumbai", "gateway of india", "nariman point"]},
    {"name": "Dharavi, Mumbai, Maharashtra, India", "latitude": 19.0400, "longitude": 72.8550, "aliases": ["dharavi", "sion dharavi"]},
    {"name": "Juhu, Mumbai, Maharashtra, India", "latitude": 19.1000, "longitude": 72.8250, "aliases": ["juhu", "juhu beach", "vile parle"]},

    # ── MAHARASHTRA STATE CITIES ──
    {"name": "Pune, Maharashtra, India", "latitude": 18.5204, "longitude": 73.8567, "aliases": ["pune", "pmc", "poona", "kothrud", "hadapsar", "hinjewadi", "viman nagar"]},
    {"name": "Pimpri-Chinchwad, Maharashtra, India", "latitude": 18.6298, "longitude": 73.7997, "aliases": ["pimpri", "chinchwad", "pcmc", "nigdi", "bhosari"]},
    {"name": "Nagpur, Maharashtra, India", "latitude": 21.1458, "longitude": 79.0882, "aliases": ["nagpur", "nmc", "dharampeth", "sitabuldi"]},
    {"name": "Nashik, Maharashtra, India", "latitude": 19.9975, "longitude": 73.7898, "aliases": ["nashik", "nasik", "panchavati"]},
    {"name": "Chhatrapati Sambhaji Nagar (Aurangabad), Maharashtra, India", "latitude": 19.8762, "longitude": 75.3433, "aliases": ["aurangabad", "sambhajinagar", "chhatrapati sambhaji nagar"]},
    {"name": "Solapur, Maharashtra, India", "latitude": 17.6599, "longitude": 75.9064, "aliases": ["solapur", "sholapur"]},
    {"name": "Kolhapur, Maharashtra, India", "latitude": 16.7050, "longitude": 74.2433, "aliases": ["kolhapur"]},
    {"name": "Amravati, Maharashtra, India", "latitude": 20.9374, "longitude": 77.7796, "aliases": ["amravati"]},
    {"name": "Nanded, Maharashtra, India", "latitude": 19.1383, "longitude": 77.3210, "aliases": ["nanded"]},
    {"name": "Jalgaon, Maharashtra, India", "latitude": 21.0077, "longitude": 75.5626, "aliases": ["jalgaon"]},
    {"name": "Akola, Maharashtra, India", "latitude": 20.7002, "longitude": 77.0082, "aliases": ["akola"]},
    {"name": "Latur, Maharashtra, India", "latitude": 18.4088, "longitude": 76.5604, "aliases": ["latur"]},
    {"name": "Dhule, Maharashtra, India", "latitude": 20.9042, "longitude": 74.7749, "aliases": ["dhule"]},
    {"name": "Ahmednagar (Ahilyanagar), Maharashtra, India", "latitude": 19.0948, "longitude": 74.7480, "aliases": ["ahmednagar", "ahilyanagar"]},
    {"name": "Chandrapur, Maharashtra, India", "latitude": 19.9615, "longitude": 79.2961, "aliases": ["chandrapur"]},
    {"name": "Satara, Maharashtra, India", "latitude": 17.6805, "longitude": 73.9997, "aliases": ["satara"]},
    {"name": "Alibag, Raigad, Maharashtra, India", "latitude": 18.6414, "longitude": 72.8722, "aliases": ["alibag", "alibaug", "raigad"]},

    # ── DELHI NCR & NORTHERN HUBS ──
    {"name": "Delhi, National Capital Territory of Delhi, India", "latitude": 28.6139, "longitude": 77.2090, "aliases": ["delhi", "new delhi", "nct delhi", "mcd"]},
    {"name": "Noida, Gautam Buddha Nagar, Uttar Pradesh, India", "latitude": 28.5355, "longitude": 77.3910, "aliases": ["noida", "sector 18 noida", "sector 62 noida", "greater noida"]},
    {"name": "Gurugram (Gurgaon), Haryana, India", "latitude": 28.4595, "longitude": 77.0266, "aliases": ["gurgaon", "gurugram", "cyber city", "dlf cyber city", "sohna road"]},
    {"name": "Ghaziabad, Uttar Pradesh, India", "latitude": 28.6692, "longitude": 77.4538, "aliases": ["ghaziabad", "indirapuram", "vaishali"]},
    {"name": "Faridabad, Haryana, India", "latitude": 28.4089, "longitude": 77.3178, "aliases": ["faridabad"]},
    {"name": "Dwarka, New Delhi, India", "latitude": 28.5921, "longitude": 77.0460, "aliases": ["dwarka delhi", "dwarka sector"]},
    {"name": "Rohini, New Delhi, India", "latitude": 28.7495, "longitude": 77.0565, "aliases": ["rohini delhi"]},
    {"name": "Connaught Place, New Delhi, India", "latitude": 28.6315, "longitude": 77.2167, "aliases": ["connaught place", "cp delhi"]},
    {"name": "Chandigarh, India", "latitude": 30.7333, "longitude": 76.7794, "aliases": ["chandigarh", "mohali", "panchkula", "tricity"]},
    {"name": "Jaipur, Rajasthan, India", "latitude": 26.9124, "longitude": 75.7873, "aliases": ["jaipur", "pink city", "jmc"]},
    {"name": "Jodhpur, Rajasthan, India", "latitude": 26.2389, "longitude": 73.0243, "aliases": ["jodhpur"]},
    {"name": "Kota, Rajasthan, India", "latitude": 25.2138, "longitude": 75.8648, "aliases": ["kota"]},
    {"name": "Lucknow, Uttar Pradesh, India", "latitude": 26.8467, "longitude": 80.9462, "aliases": ["lucknow", "lmc", "gomti nagar", "hazratganj"]},
    {"name": "Kanpur, Uttar Pradesh, India", "latitude": 26.4499, "longitude": 80.3319, "aliases": ["kanpur"]},
    {"name": "Varanasi, Uttar Pradesh, India", "latitude": 25.3176, "longitude": 82.9739, "aliases": ["varanasi", "banaras", "kashi"]},
    {"name": "Agra, Uttar Pradesh, India", "latitude": 27.1767, "longitude": 78.0081, "aliases": ["agra", "taj mahal"]},
    {"name": "Prayagraj (Allahabad), Uttar Pradesh, India", "latitude": 25.4358, "longitude": 81.8463, "aliases": ["allahabad", "prayagraj"]},
    {"name": "Dehradun, Uttarakhand, India", "latitude": 30.3165, "longitude": 78.0322, "aliases": ["dehradun"]},
    {"name": "Shimla, Himachal Pradesh, India", "latitude": 31.1048, "longitude": 77.1734, "aliases": ["shimla"]},
    {"name": "Srinagar, Jammu and Kashmir, India", "latitude": 34.0837, "longitude": 74.7973, "aliases": ["srinagar"]},
    {"name": "Jammu, Jammu and Kashmir, India", "latitude": 32.7266, "longitude": 74.8570, "aliases": ["jammu"]},
    {"name": "Amritsar, Punjab, India", "latitude": 31.6340, "longitude": 74.8723, "aliases": ["amritsar", "golden temple"]},
    {"name": "Ludhiana, Punjab, India", "latitude": 30.9010, "longitude": 75.8573, "aliases": ["ludhiana"]},

    # ── SOUTHERN & WESTERN TECH CORRIDORS ──
    {"name": "Bengaluru, Karnataka, India", "latitude": 12.9716, "longitude": 77.5946, "aliases": ["bengaluru", "bangalore", "bbmp"]},
    {"name": "Whitefield, Bengaluru, Karnataka, India", "latitude": 12.9698, "longitude": 77.7500, "aliases": ["whitefield", "itpl"]},
    {"name": "Electronic City, Bengaluru, Karnataka, India", "latitude": 12.8399, "longitude": 77.6770, "aliases": ["electronic city", "ecity"]},
    {"name": "Koramangala, Bengaluru, Karnataka, India", "latitude": 12.9352, "longitude": 77.6245, "aliases": ["koramangala"]},
    {"name": "Indiranagar, Bengaluru, Karnataka, India", "latitude": 12.9784, "longitude": 77.6408, "aliases": ["indiranagar"]},
    {"name": "Mysuru (Mysore), Karnataka, India", "latitude": 12.2958, "longitude": 76.6394, "aliases": ["mysore", "mysuru"]},
    {"name": "Mangaluru, Karnataka, India", "latitude": 12.9141, "longitude": 74.8560, "aliases": ["mangalore", "mangaluru"]},
    {"name": "Hyderabad, Telangana, India", "latitude": 17.3850, "longitude": 78.4867, "aliases": ["hyderabad", "ghmc", "secunderabad"]},
    {"name": "Hitec City, Hyderabad, Telangana, India", "latitude": 17.4435, "longitude": 78.3772, "aliases": ["hitec city", "hitex", "madhapur", "cyberabad"]},
    {"name": "Gachibowli, Hyderabad, Telangana, India", "latitude": 17.4401, "longitude": 78.3489, "aliases": ["gachibowli", "financial district hyderabad"]},
    {"name": "Chennai, Tamil Nadu, India", "latitude": 13.0827, "longitude": 80.2707, "aliases": ["chennai", "madras", "gcc"]},
    {"name": "T. Nagar, Chennai, Tamil Nadu, India", "latitude": 13.0418, "longitude": 78.2345, "aliases": ["t nagar", "thyagaraya nagar"]},
    {"name": "Adyar, Chennai, Tamil Nadu, India", "latitude": 13.0012, "longitude": 80.2565, "aliases": ["adyar", "velachery"]},
    {"name": "Coimbatore, Tamil Nadu, India", "latitude": 11.0168, "longitude": 76.9558, "aliases": ["coimbatore"]},
    {"name": "Madurai, Tamil Nadu, India", "latitude": 9.9252, "longitude": 78.1198, "aliases": ["madurai"]},
    {"name": "Kochi, Kerala, India", "latitude": 9.9312, "longitude": 76.2673, "aliases": ["kochi", "cochin", "ernakulam"]},
    {"name": "Thiruvananthapuram, Kerala, India", "latitude": 8.5241, "longitude": 76.9366, "aliases": ["trivandrum", "thiruvananthapuram"]},
    {"name": "Kozhikode (Calicut), Kerala, India", "latitude": 11.2588, "longitude": 75.7804, "aliases": ["calicut", "kozhikode"]},
    {"name": "Visakhapatnam, Andhra Pradesh, India", "latitude": 17.6868, "longitude": 83.2185, "aliases": ["visakhapatnam", "vizag"]},
    {"name": "Vijayawada, Andhra Pradesh, India", "latitude": 16.5062, "longitude": 80.6480, "aliases": ["vijayawada"]},

    # ── GUJARAT, CENTRAL & EASTERN HUBS ──
    {"name": "Ahmedabad, Gujarat, India", "latitude": 23.0225, "longitude": 72.5714, "aliases": ["ahmedabad", "amc", "ashram road"]},
    {"name": "Surat, Gujarat, India", "latitude": 21.1702, "longitude": 72.8311, "aliases": ["surat", "smc", "varachha", "udhna"]},
    {"name": "Vadodara, Gujarat, India", "latitude": 22.3072, "longitude": 73.1812, "aliases": ["vadodara", "baroda", "vmc"]},
    {"name": "Rajkot, Gujarat, India", "latitude": 22.3039, "longitude": 70.8022, "aliases": ["rajkot", "rmc"]},
    {"name": "Bhopal, Madhya Pradesh, India", "latitude": 23.2599, "longitude": 77.4126, "aliases": ["bhopal"]},
    {"name": "Indore, Madhya Pradesh, India", "latitude": 22.7196, "longitude": 75.8577, "aliases": ["indore"]},
    {"name": "Gwalior, Madhya Pradesh, India", "latitude": 26.2183, "longitude": 78.1828, "aliases": ["gwalior"]},
    {"name": "Jabalpur, Madhya Pradesh, India", "latitude": 23.1815, "longitude": 79.9864, "aliases": ["jabalpur"]},
    {"name": "Kolkata, West Bengal, India", "latitude": 22.5726, "longitude": 88.3639, "aliases": ["kolkata", "calcutta", "kmc", "salt lake", "new town"]},
    {"name": "Patna, Bihar, India", "latitude": 25.5941, "longitude": 85.1376, "aliases": ["patna", "pmc bihar"]},
    {"name": "Gaya, Bihar, India", "latitude": 24.7914, "longitude": 85.0002, "aliases": ["gaya", "bodh gaya"]},
    {"name": "Bhubaneswar, Odisha, India", "latitude": 20.2961, "longitude": 85.8245, "aliases": ["bhubaneswar", "cuttack"]},
    {"name": "Ranchi, Jharkhand, India", "latitude": 23.3441, "longitude": 85.3096, "aliases": ["ranchi"]},
    {"name": "Jamshedpur, Jharkhand, India", "latitude": 22.8046, "longitude": 86.2029, "aliases": ["jamshedpur", "tatanagar"]},
    {"name": "Raipur, Chhattisgarh, India", "latitude": 21.2514, "longitude": 81.6296, "aliases": ["raipur"]},
    {"name": "Guwahati, Assam, India", "latitude": 26.1445, "longitude": 91.7362, "aliases": ["guwahati", "dispur"]},

    # ── GLOBAL MEGACITIES & EXTREME HEAT HOTSPOTS ──
    {"name": "Dubai, United Arab Emirates", "latitude": 25.2048, "longitude": 55.2708, "aliases": ["dubai", "uae"]},
    {"name": "Riyadh, Saudi Arabia", "latitude": 24.7136, "longitude": 46.6753, "aliases": ["riyadh"]},
    {"name": "Kuwait City, Kuwait", "latitude": 29.3759, "longitude": 47.9774, "aliases": ["kuwait city", "kuwait"]},
    {"name": "Doha, Qatar", "latitude": 25.2854, "longitude": 51.5310, "aliases": ["doha", "qatar"]},
    {"name": "Cairo, Egypt", "latitude": 30.0444, "longitude": 31.2357, "aliases": ["cairo"]},
    {"name": "Phoenix, Arizona, United States", "latitude": 33.4484, "longitude": -112.0740, "aliases": ["phoenix"]},
    {"name": "Houston, Texas, United States", "latitude": 29.7604, "longitude": -95.3698, "aliases": ["houston"]},
    {"name": "Las Vegas, Nevada, United States", "latitude": 36.1699, "longitude": -115.1398, "aliases": ["las vegas"]},
    {"name": "London, England, United Kingdom", "latitude": 51.5074, "longitude": -0.1278, "aliases": ["london"]},
    {"name": "Paris, Île-de-France, France", "latitude": 48.8566, "longitude": 2.3522, "aliases": ["paris"]},
    {"name": "Singapore", "latitude": 1.3521, "longitude": 103.8198, "aliases": ["singapore"]},
    {"name": "Tokyo, Japan", "latitude": 35.6762, "longitude": 139.6503, "aliases": ["tokyo"]},
    {"name": "Sydney, New South Wales, Australia", "latitude": -33.8688, "longitude": 151.2093, "aliases": ["sydney"]},
    {"name": "Bangkok, Thailand", "latitude": 13.7563, "longitude": 100.5018, "aliases": ["bangkok"]},
]

POPULAR_INDIAN_CITIES = POPULAR_GLOBAL_CITIES


def search_local_directory(query: str) -> List[Dict[str, Any]]:
    """
    Ultra-fast (<1ms) tokenized and prefix search across the built-in geographic directory.
    Matches city names, state names, and sub-locality aliases.
    """
    norm_q = query.strip().lower()
    if len(norm_q) < 2:
        return []

    tokens = [t for t in norm_q.replace(",", " ").replace("-", " ").split() if len(t) >= 2]
    if not tokens:
        tokens = [norm_q]

    exact_prefix_matches: List[Dict[str, Any]] = []
    alias_matches: List[Dict[str, Any]] = []
    token_matches: List[Dict[str, Any]] = []

    for entry in POPULAR_GLOBAL_CITIES:
        name_lower = entry["name"].lower()
        aliases = entry.get("aliases", [])

        # Priority 1: City name starts with query
        city_part = name_lower.split(",")[0].strip()
        if city_part.startswith(norm_q):
            exact_prefix_matches.append({
                "name": entry["name"],
                "latitude": entry["latitude"],
                "longitude": entry["longitude"]
            })
            continue

        # Priority 2: Matches an alias directly or prefix
        matched_alias = False
        for a in aliases:
            if a == norm_q or a.startswith(norm_q):
                alias_matches.append({
                    "name": entry["name"],
                    "latitude": entry["latitude"],
                    "longitude": entry["longitude"]
                })
                matched_alias = True
                break
        if matched_alias:
            continue

        # Priority 3: All query tokens are contained in name or aliases
        combined_text = f"{name_lower} {' '.join(aliases)}"
        if all(token in combined_text for token in tokens):
            token_matches.append({
                "name": entry["name"],
                "latitude": entry["latitude"],
                "longitude": entry["longitude"]
            })

    # Combine with priority order and limit to top 8
    combined = exact_prefix_matches + alias_matches + token_matches
    # Deduplicate by coordinates
    seen = set()
    unique = []
    for item in combined:
        key = (round(item["latitude"], 3), round(item["longitude"], 3))
        if key not in seen:
            seen.add(key)
            unique.append(item)
            if len(unique) >= 8:
                break

    return unique


async def search_location(query: str) -> List[Dict[str, Any]]:
    """
    High-speed, multi-tier geocoding search:
    1. Instant Local Directory search (0ms).
    2. Parallel Open-Meteo geocoding with keep-alive connection pool & 2.0s timeout.
    3. Fast Photon OSM Geocoder fallback (if Open-Meteo returns 0 or fails).
    4. Nominatim fallback with 2.0s timeout.
    5. Deduplicated merge prioritizing high-accuracy Indian results.
    """
    normalized_q = query.strip().lower()
    if not normalized_q or len(normalized_q) < 2:
        return []

    # Check cache first
    if normalized_q in _LOCATION_CACHE:
        return _LOCATION_CACHE[normalized_q]

    # 1. Tier 1: Local Directory Match (Instant <1ms)
    local_results = search_local_directory(query)

    # 2. Tier 2: Open-Meteo Geocoding API via persistent client
    client = get_http_client()
    external_results: List[Dict[str, Any]] = []

    try:
        resp = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": query.strip(),
                "count": 8,
                "language": "en",
                "format": "json"
            },
            timeout=2.2,
        )
        if resp.status_code == 200:
            data = resp.json()
            raw_results = data.get("results", [])
            # Prioritize Indian locations
            india_results = [r for r in raw_results if r.get("country_code") == "IN" or r.get("country") == "India"]
            other_results = [r for r in raw_results if r not in india_results]

            for item in (india_results + other_results):
                name_parts = [item.get("name"), item.get("admin1"), item.get("country")]
                display_name = ", ".join([p for p in name_parts if p])
                try:
                    external_results.append({
                        "name": display_name,
                        "latitude": float(item.get("latitude")),
                        "longitude": float(item.get("longitude"))
                    })
                except (ValueError, TypeError):
                    continue
    except Exception as e:
        logger.warning(f"Open-Meteo geocoding query failed for '{query}': {e}")

    # 3. Tier 3: Photon OSM Geocoder fallback if Open-Meteo returned 0 and no local matches
    if not external_results and not local_results:
        try:
            resp = await client.get(
                "https://photon.komoot.io/api/",
                params={
                    "q": query.strip(),
                    "limit": 6,
                    "lang": "en"
                },
                timeout=2.0,
            )
            if resp.status_code == 200:
                features = resp.json().get("features", [])
                for f in features:
                    props = f.get("properties", {})
                    geom = f.get("geometry", {})
                    coords = geom.get("coordinates", [])
                    if len(coords) >= 2:
                        p_lon, p_lat = float(coords[0]), float(coords[1])
                        name_parts = [props.get("name"), props.get("city"), props.get("state"), props.get("country")]
                        clean_parts = [p for p in name_parts if p and p != props.get("name")]
                        full_name = f"{props.get('name', query)}, {', '.join(clean_parts)}" if clean_parts else props.get("name", query)
                        external_results.append({
                            "name": full_name,
                            "latitude": p_lat,
                            "longitude": p_lon
                        })
        except Exception as e:
            logger.warning(f"Photon OSM lookup failed for '{query}': {e}")

    # 4. Tier 4: OpenStreetMap Nominatim (Last-resort fallback)
    if not external_results and not local_results:
        try:
            params = {
                "q": query.strip(),
                "format": "json",
                "limit": 6,
            }
            response = await client.get(
                NOMINATIM_URL,
                params=params,
                timeout=2.0,
            )
            if response.status_code == 200:
                results = response.json()
                for item in results:
                    try:
                        external_results.append({
                            "name": item.get("display_name"),
                            "latitude": float(item.get("lat")),
                            "longitude": float(item.get("lon"))
                        })
                    except (ValueError, TypeError):
                        continue
        except Exception as e:
            logger.warning(f"Nominatim lookup failed for '{query}': {e}")

    # 5. Merge & Deduplicate (Local results first for pinpoint accuracy, then external)
    final_locations: List[Dict[str, Any]] = []
    seen_coords: List[Tuple[float, float]] = []
    seen_names = set()

    # If local results exist, they are highly curated, accurate, and preferred
    for loc in (local_results + external_results):
        norm_name = loc["name"].strip().lower()
        primary_part = norm_name.split(",")[0].strip()
        
        # Check duplicate by exact name or spatial proximity (< ~3km)
        is_dup = False
        if norm_name in seen_names or primary_part in seen_names:
            is_dup = True
        else:
            for ex_lat, ex_lon in seen_coords:
                if abs(loc["latitude"] - ex_lat) < 0.03 and abs(loc["longitude"] - ex_lon) < 0.03:
                    is_dup = True
                    break

        if not is_dup:
            seen_coords.append((loc["latitude"], loc["longitude"]))
            seen_names.add(norm_name)
            seen_names.add(primary_part)
            final_locations.append(loc)
            if len(final_locations) >= 8:
                break

    # Cache successful results
    if final_locations:
        if len(_LOCATION_CACHE) > MAX_LOCATION_CACHE_ENTRIES:
            for k in list(_LOCATION_CACHE.keys())[:MAX_LOCATION_CACHE_ENTRIES // 5]:
                _LOCATION_CACHE.pop(k, None)
        _LOCATION_CACHE[normalized_q] = final_locations

    return final_locations


async def reverse_location(lat: float, lon: float) -> Dict[str, Any]:
    """
    Reverse geocodes coordinates to a human-friendly place name for citizen map interaction.
    Features in-memory coordinate-bucket caching, local proximity lookup, and reliable multi-tier fallbacks.
    """
    cache_key = (round(lat, 3), round(lon, 3))
    if cache_key in _REVERSE_CACHE:
        return _REVERSE_CACHE[cache_key]

    resolved_name: Optional[str] = None
    client = get_http_client()

    # 1. Primary: OpenStreetMap Nominatim reverse lookup via pooled client
    try:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "zoom": 14,
                "addressdetails": 1,
            },
            timeout=2.5,
        )
        if resp.status_code == 200:
            data = resp.json()
            address = data.get("address", {})
            parts = []
            # Local neighborhood / suburb / ward
            locality = address.get("suburb") or address.get("neighbourhood") or address.get("residential") or address.get("hamlet")
            if locality:
                parts.append(locality)
            # City / Town / Municipal area
            city = address.get("city") or address.get("town") or address.get("county") or address.get("district")
            if city and city not in parts:
                parts.append(city)
            # State / Territory
            state = address.get("state")
            if state and state not in parts:
                parts.append(state)
            # Country
            country = address.get("country")
            if country and country not in parts:
                parts.append(country)

            if parts:
                resolved_name = ", ".join(parts)
            elif data.get("display_name"):
                disp_parts = [p.strip() for p in data["display_name"].split(",")[:3]]
                resolved_name = ", ".join(disp_parts)
    except Exception as e:
        logger.warning(f"Reverse geocode failed for ({lat}, {lon}): {e}")

    # 2. Secondary: Nearest popular city in local directory (if within 45km)
    if not resolved_name:
        closest_city = None
        min_dist = float("inf")
        for c in POPULAR_GLOBAL_CITIES:
            dlat = math.radians(c["latitude"] - lat)
            dlon = math.radians(c["longitude"] - lon)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(c["latitude"])) * math.sin(dlon / 2) ** 2
            dist_km = 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            if dist_km < min_dist:
                min_dist = dist_km
                closest_city = c

        if closest_city and min_dist <= 35.0:
            c_name = closest_city["name"].split(",")[0]
            resolved_name = f"{c_name} Area ({lat:.3f}°N, {lon:.3f}°E)"

    # 3. Tertiary fallback: Clean formatted coordinate name
    if not resolved_name:
        resolved_name = f"Selected Point ({lat:.3f}°N, {lon:.3f}°E)"

    result = {
        "name": resolved_name,
        "latitude": lat,
        "longitude": lon,
    }

    if len(_REVERSE_CACHE) > MAX_REVERSE_CACHE_ENTRIES:
        for k in list(_REVERSE_CACHE.keys())[:MAX_REVERSE_CACHE_ENTRIES // 5]:
            _REVERSE_CACHE.pop(k, None)

    _REVERSE_CACHE[cache_key] = result
    return result