"""
ThermoShield Localized Heat Action Plan (HAP) Trigger Engine & City Administration Decision Service

Strict Architectural Boundary:
- This service is the operational decision engine for municipal authorities to initiate Heat Action Plans.
- It operates strictly on current and forecast biometeorological data and socio-demographic vulnerability.
- It is COMPLETELY INDEPENDENT of the Intervention Simulator (which is for hypothetical 'what-if' policy testing).
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

# Official 5 Municipal Action Categories required by SIH26083
CATEGORY_COOLING = "COOLING"
CATEGORY_OUTDOOR_WORK = "OUTDOOR_WORK"
CATEGORY_HYDRATION = "HYDRATION"
CATEGORY_HEALTH = "HEALTH_PREPAREDNESS"
CATEGORY_INFRASTRUCTURE = "INFRASTRUCTURE"

# Trigger States
TRIGGER_ACTION_NOW = "ACTION_REVIEW_REQUIRED_NOW"
TRIGGER_PREPARE_24H = "PREPARE_WITHIN_24_HOURS"
TRIGGER_PREPARE_3D = "PREPARE_WITHIN_3_DAYS"
TRIGGER_BASELINE = "MONITOR_NORMAL_BASELINE"


@dataclass
class HeatActionItem:
    category: str
    action: str
    title: str
    description: str
    priority: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    status: str = "RECOMMENDED_FOR_REVIEW"
    justification: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "category": self.category,
            "action": self.action,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "justification": self.justification,
        }


@dataclass
class HeatActionPlanResult:
    area_id: str
    area_name: str
    risk_level: str
    risk_score: float
    trigger_state: str
    trigger_reasons: List[str]
    recommended_actions: List[HeatActionItem]
    evaluated_telemetry: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "area_id": self.area_id,
            "area_name": self.area_name,
            "risk_level": self.risk_level,
            "risk_score": round(self.risk_score, 1),
            "trigger_state": self.trigger_state,
            "trigger_reasons": self.trigger_reasons,
            "action_count": len(self.recommended_actions),
            "recommended_actions": [a.to_dict() for a in self.recommended_actions],
            "evaluated_telemetry": self.evaluated_telemetry,
        }


# Curated Administrative Ward Profiles for All 24 BMC Administrative Wards (A to T)
MUNICIPAL_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ward_a": {
        "name": "Ward A (Colaba, Fort, Nariman Point)",
        "ward_code": "A",
        "district": "South Mumbai",
        "latitude": 18.9220,
        "longitude": 72.8346,
        "vulnerability_score": 25.0,
        "population_density": "Moderate (Commercial administrative center)",
        "baseline_temp": 32.5,
        "wbgt_offset": 0.0,
    },
    "ward_b": {
        "name": "Ward B (Sandhurst Road, Dongri, Masjid Bunder)",
        "ward_code": "B",
        "district": "South Mumbai",
        "latitude": 18.9569,
        "longitude": 72.8397,
        "vulnerability_score": 68.0,
        "population_density": "Dense historic wholesale market district",
        "baseline_temp": 34.6,
        "wbgt_offset": 1.4,
    },
    "ward_c": {
        "name": "Ward C (Chandanwadi, Bhuleshwar, Kalbadevi)",
        "ward_code": "C",
        "district": "South Mumbai",
        "latitude": 18.9515,
        "longitude": 72.8258,
        "vulnerability_score": 72.0,
        "population_density": "Extreme (Wholesale trading markets)",
        "baseline_temp": 34.4,
        "wbgt_offset": 0.6,
    },
    "ward_d": {
        "name": "Ward D (Malabar Hill, Grant Road, Tardeo)",
        "ward_code": "D",
        "district": "South Mumbai",
        "latitude": 18.9552,
        "longitude": 72.8083,
        "vulnerability_score": 30.0,
        "population_density": "Coastal ridge zone with tree canopy cover",
        "baseline_temp": 32.5,
        "wbgt_offset": 0.3,
    },
    "ward_e": {
        "name": "Ward E (Byculla, Mazgaon, Kamathipura)",
        "ward_code": "E",
        "district": "South Mumbai",
        "latitude": 18.9734,
        "longitude": 72.8340,
        "vulnerability_score": 78.0,
        "population_density": "Very High (Old tenements & narrow corridors)",
        "baseline_temp": 34.6,
        "wbgt_offset": 0.7,
    },
    "ward_f_south": {
        "name": "Ward F/South (Parel, Sewri, Naigaon)",
        "ward_code": "F/S",
        "district": "South Central Mumbai",
        "latitude": 19.0048,
        "longitude": 72.8428,
        "vulnerability_score": 75.0,
        "population_density": "High (Former mill clusters & transit corridors)",
        "baseline_temp": 34.8,
        "wbgt_offset": 0.8,
    },
    "ward_f_north": {
        "name": "Ward F/North (Matunga, Wadala, Sion)",
        "ward_code": "F/N",
        "district": "South Central Mumbai",
        "latitude": 19.0319,
        "longitude": 72.8707,
        "vulnerability_score": 65.0,
        "population_density": "High (Educational institutions and Wadala freight yards)",
        "baseline_temp": 34.5,
        "wbgt_offset": 1.3,
    },
    "ward_g_south": {
        "name": "Ward G/South (Worli, Prabhadevi, Lower Parel)",
        "ward_code": "G/S",
        "district": "South Central Mumbai",
        "latitude": 19.0042,
        "longitude": 72.8201,
        "vulnerability_score": 48.0,
        "population_density": "Moderate (Commercial high-rises and coastal fishing settlements)",
        "baseline_temp": 33.6,
        "wbgt_offset": 1.0,
    },
    "ward_g_north": {
        "name": "Ward G/North (Dharavi, Dadar West, Mahim)",
        "ward_code": "G/N",
        "district": "Central Mumbai",
        "latitude": 19.0434,
        "longitude": 72.8526,
        "vulnerability_score": 88.0,
        "population_density": "Very High (Dense settlements & cottage industries)",
        "baseline_temp": 35.5,
        "wbgt_offset": 1.2,
    },
    "ward_h_west": {
        "name": "Ward H/West (Bandra West, Khar, Santacruz)",
        "ward_code": "H/W",
        "district": "Western Suburbs",
        "latitude": 19.0622,
        "longitude": 72.8285,
        "vulnerability_score": 38.0,
        "population_density": "Moderate (Coastal residential and commercial avenues)",
        "baseline_temp": 33.2,
        "wbgt_offset": 0.6,
    },
    "ward_h_east": {
        "name": "Ward H/East (Bandra East, Khar East, Santacruz East)",
        "ward_code": "H/E",
        "district": "Western Suburbs",
        "latitude": 19.0700,
        "longitude": 72.8450,
        "vulnerability_score": 62.0,
        "population_density": "High (BKC commercial outskirts & transit links)",
        "baseline_temp": 34.5,
        "wbgt_offset": 0.6,
    },
    "ward_k_west": {
        "name": "Ward K/West (Andheri West, Juhu, Versova)",
        "ward_code": "K/W",
        "district": "Western Suburbs",
        "latitude": 19.1205,
        "longitude": 72.8347,
        "vulnerability_score": 45.0,
        "population_density": "Moderate-High (Commercial & residential coast)",
        "baseline_temp": 33.8,
        "wbgt_offset": 0.4,
    },
    "ward_k_east": {
        "name": "Ward K/East (Andheri East, Jogeshwari East)",
        "ward_code": "K/E",
        "district": "Western Suburbs",
        "latitude": 19.1172,
        "longitude": 72.8682,
        "vulnerability_score": 68.0,
        "population_density": "High (MIDC industrial workforce & transport hubs)",
        "baseline_temp": 35.0,
        "wbgt_offset": 0.9,
    },
    "ward_p_south": {
        "name": "Ward P/South (Goregaon)",
        "ward_code": "P/S",
        "district": "Western Suburbs",
        "latitude": 19.1575,
        "longitude": 72.8584,
        "vulnerability_score": 55.0,
        "population_density": "Moderate-High (Commercial IT parks and residential developments)",
        "baseline_temp": 33.9,
        "wbgt_offset": 1.0,
    },
    "ward_p_north": {
        "name": "Ward P/North (Malad, Marve, Manori)",
        "ward_code": "P/N",
        "district": "Western Suburbs",
        "latitude": 19.1877,
        "longitude": 72.8339,
        "vulnerability_score": 64.0,
        "population_density": "High (Retail commercial hubs and hillside informal settlements)",
        "baseline_temp": 34.4,
        "wbgt_offset": 1.2,
    },
    "ward_r_south": {
        "name": "Ward R/South (Kandivali, Charkop)",
        "ward_code": "R/S",
        "district": "Western Suburbs",
        "latitude": 19.1996,
        "longitude": 72.8562,
        "vulnerability_score": 58.0,
        "population_density": "Moderate (Organized MHADA layouts and industrial units)",
        "baseline_temp": 34.1,
        "wbgt_offset": 1.1,
    },
    "ward_r_central": {
        "name": "Ward R/Central (Borivali, Gorai, SGNP Fringe)",
        "ward_code": "R/C",
        "district": "Western Suburbs",
        "latitude": 19.2337,
        "longitude": 72.8297,
        "vulnerability_score": 40.0,
        "population_density": "Moderate (Residential hub bordering national park canopy)",
        "baseline_temp": 32.9,
        "wbgt_offset": 0.5,
    },
    "ward_r_north": {
        "name": "Ward R/North (Dahisar)",
        "ward_code": "R/N",
        "district": "Western Suburbs",
        "latitude": 19.2553,
        "longitude": 72.8663,
        "vulnerability_score": 50.0,
        "population_density": "Moderate (Northern municipal boundary and river basin)",
        "baseline_temp": 33.6,
        "wbgt_offset": 0.8,
    },
    "ward_l": {
        "name": "Ward L (Kurla, Chunabhatti, Sakinaka)",
        "ward_code": "L",
        "district": "Eastern Suburbs",
        "latitude": 19.0688,
        "longitude": 72.8856,
        "vulnerability_score": 82.0,
        "population_density": "Very High (Transit junctions & crowded markets)",
        "baseline_temp": 35.4,
        "wbgt_offset": 1.1,
    },
    "ward_m_east": {
        "name": "Ward M/East (Govandi, Mankhurd, Deonar)",
        "ward_code": "M/E",
        "district": "Eastern Suburbs",
        "latitude": 19.0558,
        "longitude": 72.9312,
        "vulnerability_score": 85.0,
        "population_density": "Very High (Informal labor concentration)",
        "baseline_temp": 35.8,
        "wbgt_offset": 1.4,
    },
    "ward_m_west": {
        "name": "Ward M/West (Chembur West, Mahul)",
        "ward_code": "M/W",
        "district": "Eastern Suburbs",
        "latitude": 19.0378,
        "longitude": 72.8893,
        "vulnerability_score": 62.0,
        "population_density": "High (Suburban residential and chemical industrial periphery)",
        "baseline_temp": 34.4,
        "wbgt_offset": 1.3,
    },
    "ward_n": {
        "name": "Ward N (Ghatkopar, Vidyavihar)",
        "ward_code": "N",
        "district": "Eastern Suburbs",
        "latitude": 19.0867,
        "longitude": 72.9202,
        "vulnerability_score": 60.0,
        "population_density": "High (Transit junctions and dense residential societies)",
        "baseline_temp": 34.2,
        "wbgt_offset": 1.2,
    },
    "ward_s": {
        "name": "Ward S (Bhandup, Powai, Kanjurmarg, Vikhroli)",
        "ward_code": "S",
        "district": "Eastern Suburbs",
        "latitude": 19.1336,
        "longitude": 72.9219,
        "vulnerability_score": 54.0,
        "population_density": "Moderate-High (Powai lake buffer, institutional canopy, and hillside settlements)",
        "baseline_temp": 33.7,
        "wbgt_offset": 0.9,
    },
    "ward_t": {
        "name": "Ward T (Mulund)",
        "ward_code": "T",
        "district": "Eastern Suburbs",
        "latitude": 19.1675,
        "longitude": 72.9376,
        "vulnerability_score": 42.0,
        "population_density": "Moderate (Planned residential suburb and hill slope canopy)",
        "baseline_temp": 33.1,
        "wbgt_offset": 0.7,
    },
}

# ── Jaipur Municipal Corporation (JMC Heritage & Greater) Wards ──
JAIPUR_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    "jmc_ward_1": {
        "name": "Ward 1: Kishanpole & Johari Bazar",
        "ward_code": "JMC-01",
        "district": "Heritage Walled City",
        "latitude": 26.9210,
        "longitude": 75.8240,
        "vulnerability_score": 78.0,
        "population_density": "Extreme (Historic core wholesale & gemstone bazaar)",
        "baseline_temp": 36.8,
        "wbgt_offset": 1.6,
    },
    "jmc_ward_2": {
        "name": "Ward 2: Hawamahal & Sireh Deori",
        "ward_code": "JMC-02",
        "district": "Heritage Walled City",
        "latitude": 26.9240,
        "longitude": 75.8270,
        "vulnerability_score": 72.0,
        "population_density": "Very High (Tourism core & pedestrian plazas)",
        "baseline_temp": 36.5,
        "wbgt_offset": 1.4,
    },
    "jmc_ward_3": {
        "name": "Ward 3: Ramganj & Ghat Gate",
        "ward_code": "JMC-03",
        "district": "Heritage Walled City",
        "latitude": 26.9230,
        "longitude": 75.8390,
        "vulnerability_score": 82.0,
        "population_density": "Very High (Dense artisan & residential tenements)",
        "baseline_temp": 37.0,
        "wbgt_offset": 1.8,
    },
    "jmc_ward_4": {
        "name": "Ward 4: Amer Heritage & Jal Mahal Foothills",
        "ward_code": "JMC-04",
        "district": "Heritage Walled City",
        "latitude": 26.9855,
        "longitude": 75.8513,
        "vulnerability_score": 52.0,
        "population_density": "Moderate (Valley ridge corridor & lake perimeter)",
        "baseline_temp": 34.8,
        "wbgt_offset": 0.6,
    },
    "jmc_ward_5": {
        "name": "Ward 5: Civil Lines & Raj Bhavan",
        "ward_code": "JMC-05",
        "district": "Central Administrative Corridor",
        "latitude": 26.9030,
        "longitude": 75.7870,
        "vulnerability_score": 38.0,
        "population_density": "Low-Moderate (Administrative precinct & leafy avenues)",
        "baseline_temp": 34.2,
        "wbgt_offset": 0.4,
    },
    "jmc_ward_6": {
        "name": "Ward 6: M.I. Road & Railway Station",
        "ward_code": "JMC-06",
        "district": "Central Administrative Corridor",
        "latitude": 26.9180,
        "longitude": 75.7950,
        "vulnerability_score": 68.0,
        "population_density": "High (Commercial arterial & multi-modal transport)",
        "baseline_temp": 36.2,
        "wbgt_offset": 1.2,
    },
    "jmc_ward_7": {
        "name": "Ward 7: Mansarovar Central",
        "ward_code": "JMC-07",
        "district": "Jaipur South & Educational Hub",
        "latitude": 26.8550,
        "longitude": 75.7650,
        "vulnerability_score": 50.0,
        "population_density": "High (Planned mega residential layout)",
        "baseline_temp": 35.4,
        "wbgt_offset": 0.8,
    },
    "jmc_ward_8": {
        "name": "Ward 8: Mansarovar South & New Sanganer Road",
        "ward_code": "JMC-08",
        "district": "Jaipur South & Educational Hub",
        "latitude": 26.8400,
        "longitude": 75.7550,
        "vulnerability_score": 54.0,
        "population_density": "High (Multi-storey residential corridor)",
        "baseline_temp": 35.6,
        "wbgt_offset": 0.9,
    },
    "jmc_ward_9": {
        "name": "Ward 9: Malviya Nagar & GT Corridor",
        "ward_code": "JMC-09",
        "district": "Jaipur South & Educational Hub",
        "latitude": 26.8520,
        "longitude": 75.8150,
        "vulnerability_score": 48.0,
        "population_density": "Moderate-High (Commercial retail & shopping complexes)",
        "baseline_temp": 35.5,
        "wbgt_offset": 0.8,
    },
    "jmc_ward_10": {
        "name": "Ward 10: Jagatpura & Pratap Nagar",
        "ward_code": "JMC-10",
        "district": "Jaipur South & Educational Hub",
        "latitude": 26.8220,
        "longitude": 75.8480,
        "vulnerability_score": 56.0,
        "population_density": "Moderate (University campuses & expansion housing)",
        "baseline_temp": 35.2,
        "wbgt_offset": 0.7,
    },
    "jmc_ward_11": {
        "name": "Ward 11: Vaishali Nagar & Chitrakoot",
        "ward_code": "JMC-11",
        "district": "Jaipur West & Expansion",
        "latitude": 26.9050,
        "longitude": 75.7420,
        "vulnerability_score": 42.0,
        "population_density": "Moderate (Planned residential suburb & commercial nodes)",
        "baseline_temp": 34.8,
        "wbgt_offset": 0.5,
    },
    "jmc_ward_12": {
        "name": "Ward 12: Jhotwara & Kalwar Road",
        "ward_code": "JMC-12",
        "district": "Jaipur West & Expansion",
        "latitude": 26.9450,
        "longitude": 75.7500,
        "vulnerability_score": 70.0,
        "population_density": "High (Railway corridor & small manufacturing units)",
        "baseline_temp": 36.1,
        "wbgt_offset": 1.1,
    },
    "jmc_ward_13": {
        "name": "Ward 13: Vidhyadhar Nagar",
        "ward_code": "JMC-13",
        "district": "Jaipur West & Expansion",
        "latitude": 26.9650,
        "longitude": 75.7820,
        "vulnerability_score": 52.0,
        "population_density": "Moderate-High (Organized residential grid & asphalt boulevards)",
        "baseline_temp": 35.5,
        "wbgt_offset": 0.8,
    },
    "jmc_ward_14": {
        "name": "Ward 14: Murlipura & Dahar Ka Balaji",
        "ward_code": "JMC-14",
        "district": "Jaipur West & Expansion",
        "latitude": 26.9580,
        "longitude": 75.7680,
        "vulnerability_score": 62.0,
        "population_density": "High (Mixed residential & freight transit highway)",
        "baseline_temp": 35.8,
        "wbgt_offset": 1.0,
    },
    "jmc_ward_15": {
        "name": "Ward 15: Vishwakarma (VKI) Industrial Area",
        "ward_code": "JMC-15",
        "district": "Heavy Industrial & Manufacturing Belts",
        "latitude": 26.9950,
        "longitude": 75.7750,
        "vulnerability_score": 85.0,
        "population_density": "High Industrial (Metal foundries, chemical plants, metal roofing)",
        "baseline_temp": 37.5,
        "wbgt_offset": 2.0,
    },
    "jmc_ward_16": {
        "name": "Ward 16: Sanganer Artisan & Textile Belt",
        "ward_code": "JMC-16",
        "district": "Heavy Industrial & Manufacturing Belts",
        "latitude": 26.8150,
        "longitude": 75.7800,
        "vulnerability_score": 80.0,
        "population_density": "Very High (Block printing, dyeing sheds & Muhana Mandi porters)",
        "baseline_temp": 36.9,
        "wbgt_offset": 1.5,
    },
    "jmc_ward_17": {
        "name": "Ward 17: Sitapura Industrial Area & JECC",
        "ward_code": "JMC-17",
        "district": "Heavy Industrial & Manufacturing Belts",
        "latitude": 26.7800,
        "longitude": 75.8300,
        "vulnerability_score": 76.0,
        "population_density": "High Industrial (Export promotion zone & garment factories)",
        "baseline_temp": 37.1,
        "wbgt_offset": 1.7,
    },
    "jmc_ward_18": {
        "name": "Ward 18: Transport Nagar & Agra Road Gateway",
        "ward_code": "JMC-18",
        "district": "Heavy Industrial & Manufacturing Belts",
        "latitude": 26.9050,
        "longitude": 75.8550,
        "vulnerability_score": 74.0,
        "population_density": "High (Truck freight yards & valley pass corridor)",
        "baseline_temp": 36.5,
        "wbgt_offset": 1.3,
    },
}

# ── Pune Municipal Corporation (PMC) Official 20 Wards by District ────────
PUNE_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    "pune_ward_1": {
        "name": "Ward 1: Shivajinagar - Ghole Road",
        "ward_code": "PMC-1",
        "district": "Pune Central",
        "latitude": 18.5314,
        "longitude": 73.8446,
        "vulnerability_score": 62.0,
        "population_density": "High Administrative (FC Road & Ghole Road)",
        "baseline_temp": 35.8,
        "wbgt_offset": 1.2,
    },
    "pune_ward_2": {
        "name": "Ward 2: Kasba - Vishrambaugwada",
        "ward_code": "PMC-2",
        "district": "Old Pune Historic Core",
        "latitude": 18.5180,
        "longitude": 73.8553,
        "vulnerability_score": 75.0,
        "population_density": "Very High (Traditional peth market grid)",
        "baseline_temp": 36.4,
        "wbgt_offset": 1.6,
    },
    "pune_ward_3": {
        "name": "Ward 3: Kothrud - Bavdhan",
        "ward_code": "PMC-3",
        "district": "Pune West",
        "latitude": 18.5074,
        "longitude": 73.8077,
        "vulnerability_score": 45.0,
        "population_density": "Medium Residential (Paud Road & Chandani Chowk)",
        "baseline_temp": 34.6,
        "wbgt_offset": 0.8,
    },
    "pune_ward_4": {
        "name": "Ward 4: Aundh - Baner",
        "ward_code": "PMC-4",
        "district": "Pune North-West IT Corridor",
        "latitude": 18.5590,
        "longitude": 73.8074,
        "vulnerability_score": 42.0,
        "population_density": "Medium Commercial (Balewadi High St & Baner)",
        "baseline_temp": 34.8,
        "wbgt_offset": 0.9,
    },
    "pune_ward_5": {
        "name": "Ward 5: Hadapsar - Mundhwa",
        "ward_code": "PMC-5",
        "district": "Pune East Industrial & Tech",
        "latitude": 18.5089,
        "longitude": 73.9260,
        "vulnerability_score": 68.0,
        "population_density": "High Industrial-Commercial (Magarpatta & Gadital)",
        "baseline_temp": 36.2,
        "wbgt_offset": 1.4,
    },
    "pune_ward_6": {
        "name": "Ward 6: Viman Nagar - Nagar Road",
        "ward_code": "PMC-6",
        "district": "Pune North-East",
        "latitude": 18.5679,
        "longitude": 73.9143,
        "vulnerability_score": 58.0,
        "population_density": "High Commercial (Airport corridor & Kalyani Nagar)",
        "baseline_temp": 35.7,
        "wbgt_offset": 1.1,
    },
    "pune_ward_7": {
        "name": "Ward 7: Nagar Road - Vadgaon Sheri",
        "ward_code": "PMC-7",
        "district": "Pune North-East",
        "latitude": 18.5512,
        "longitude": 73.9312,
        "vulnerability_score": 64.0,
        "population_density": "High Residential (Ramwadi & Somnath Nagar)",
        "baseline_temp": 36.0,
        "wbgt_offset": 1.3,
    },
    "pune_ward_8": {
        "name": "Ward 8: Sinhagad Road - Dhayari",
        "ward_code": "PMC-8",
        "district": "Pune South-West",
        "latitude": 18.4720,
        "longitude": 73.8180,
        "vulnerability_score": 55.0,
        "population_density": "Medium-High (Mutha riverbank residential corridor)",
        "baseline_temp": 35.0,
        "wbgt_offset": 0.9,
    },
    "pune_ward_9": {
        "name": "Ward 9: Bibvewadi - APMC Market Yard",
        "ward_code": "PMC-9",
        "district": "Pune South-Central",
        "latitude": 18.4800,
        "longitude": 73.8650,
        "vulnerability_score": 65.0,
        "population_density": "High (Gultekdi APMC loading docks & workers)",
        "baseline_temp": 36.1,
        "wbgt_offset": 1.3,
    },
    "pune_ward_10": {
        "name": "Ward 10: Yerawada - Kalas - Dhanori",
        "ward_code": "PMC-10",
        "district": "Pune North",
        "latitude": 18.5529,
        "longitude": 73.8796,
        "vulnerability_score": 72.0,
        "population_density": "High (Informal settlements & Vishrantwadi)",
        "baseline_temp": 36.3,
        "wbgt_offset": 1.5,
    },
    "pune_ward_11": {
        "name": "Ward 11: Kondhwa - Yewalewadi",
        "ward_code": "PMC-11",
        "district": "Pune South-East",
        "latitude": 18.4630,
        "longitude": 73.8940,
        "vulnerability_score": 66.0,
        "population_density": "High (Kondhwa Khurd & NIBM open markets)",
        "baseline_temp": 35.6,
        "wbgt_offset": 1.1,
    },
    "pune_ward_12": {
        "name": "Ward 12: Warje - Karvenagar",
        "ward_code": "PMC-12",
        "district": "Pune West Suburbs",
        "latitude": 18.4870,
        "longitude": 73.8050,
        "vulnerability_score": 48.0,
        "population_density": "Medium Residential (Cummins area & Malwadi)",
        "baseline_temp": 34.8,
        "wbgt_offset": 0.8,
    },
    "pune_ward_13": {
        "name": "Ward 13: Bhawani Peth - Timber Market",
        "ward_code": "PMC-13",
        "district": "Pune Commercial Core",
        "latitude": 18.5100,
        "longitude": 73.8680,
        "vulnerability_score": 76.0,
        "population_density": "Very High (Wholesale timber & hardware trade)",
        "baseline_temp": 36.5,
        "wbgt_offset": 1.6,
    },
    "pune_ward_14": {
        "name": "Ward 14: Dhole Patil Road - Koregaon Park",
        "ward_code": "PMC-14",
        "district": "Pune Inner East",
        "latitude": 18.5362,
        "longitude": 73.8938,
        "vulnerability_score": 54.0,
        "population_density": "High (Railway station hub & Koregaon Park)",
        "baseline_temp": 35.8,
        "wbgt_offset": 1.1,
    },
    "pune_ward_15": {
        "name": "Ward 15: Wanowrie - Ramtekdi",
        "ward_code": "PMC-15",
        "district": "Pune Cantonment Fringe",
        "latitude": 18.4980,
        "longitude": 73.8980,
        "vulnerability_score": 57.0,
        "population_density": "Medium Industrial-Residential (Fatima Nagar & Ramtekdi)",
        "baseline_temp": 35.3,
        "wbgt_offset": 1.0,
    },
    "pune_ward_16": {
        "name": "Ward 16: Hinjewadi IT Park",
        "ward_code": "PMC-16",
        "district": "Pune West IT Belt",
        "latitude": 18.5913,
        "longitude": 73.7389,
        "vulnerability_score": 46.0,
        "population_density": "High Tech (SEZ tech campuses & asphalt)",
        "baseline_temp": 35.9,
        "wbgt_offset": 1.2,
    },
    "pune_ward_17": {
        "name": "Ward 17: Wakad - Pimple Saudagar",
        "ward_code": "PMC-17",
        "district": "PMRDA North-West",
        "latitude": 18.5987,
        "longitude": 73.7788,
        "vulnerability_score": 50.0,
        "population_density": "High Residential (Dange Chowk & multi-storey societies)",
        "baseline_temp": 35.5,
        "wbgt_offset": 1.1,
    },
    "pune_ward_18": {
        "name": "Ward 18: Pimpri - Chinchwad Central",
        "ward_code": "PMC-18",
        "district": "PCMC Industrial Axis",
        "latitude": 18.6298,
        "longitude": 73.7997,
        "vulnerability_score": 69.0,
        "population_density": "High (Automobile manufacturing & engineering sheds)",
        "baseline_temp": 36.3,
        "wbgt_offset": 1.5,
    },
    "pune_ward_19": {
        "name": "Ward 19: Bhosari - MIDC Industrial Belt",
        "ward_code": "PMC-19",
        "district": "PCMC Heavy Industrial",
        "latitude": 18.6412,
        "longitude": 73.8456,
        "vulnerability_score": 74.0,
        "population_density": "Very High Industrial (Factory roofs & heavy emissions)",
        "baseline_temp": 36.7,
        "wbgt_offset": 1.7,
    },
    "pune_ward_20": {
        "name": "Ward 20: Kharadi - EON IT Park Corridor",
        "ward_code": "PMC-20",
        "district": "Pune Far East",
        "latitude": 18.5515,
        "longitude": 73.9525,
        "vulnerability_score": 52.0,
        "population_density": "High (EON Free Zone & construction dust corridor)",
        "baseline_temp": 36.0,
        "wbgt_offset": 1.2,
    },
}

MUNICIPAL_WARD_ALIASES: Dict[str, str] = {
    "ward_f_s": "ward_f_south",
    "ward_f_n": "ward_f_north",
    "ward_g_s": "ward_g_south",
    "ward_g_n": "ward_g_north",
    "ward_h_w": "ward_h_west",
    "ward_h_e": "ward_h_east",
    "ward_k_w": "ward_k_west",
    "ward_k_e": "ward_k_east",
    "ward_p_s": "ward_p_south",
    "ward_p_n": "ward_p_north",
    "ward_r_s": "ward_r_south",
    "ward_r_c": "ward_r_central",
    "ward_r_n": "ward_r_north",
    "ward_m_e": "ward_m_east",
    "ward_m_w": "ward_m_west",
    # JMC Aliases
    **{f"jmc_{i}": f"jmc_ward_{i}" for i in range(1, 19)},
    **{f"jmc-0{i}": f"jmc_ward_{i}" for i in range(1, 10)},
    **{f"jmc-{i}": f"jmc_ward_{i}" for i in range(10, 19)},
    **{f"jaipur_ward_{i}": f"jmc_ward_{i}" for i in range(1, 19)},
    # PMC Aliases
    **{f"pmc_{i}": f"pune_ward_{i}" for i in range(1, 21)},
    **{f"pmc-0{i}": f"pune_ward_{i}" for i in range(1, 10)},
    **{f"pmc-{i}": f"pune_ward_{i}" for i in range(10, 21)},
    **{f"pune_ward_{i}": f"pune_ward_{i}" for i in range(1, 21)},
    # BBMP Bengaluru Aliases
    **{f"bbmp_{i}": f"bbmp_ward_{i}" for i in range(1, 17)},
    **{f"bbmp-0{i}": f"bbmp_ward_{i}" for i in range(1, 10)},
    **{f"bbmp-{i}": f"bbmp_ward_{i}" for i in range(10, 17)},
    # GHMC Hyderabad Aliases
    **{f"ghmc_{i}": f"ghmc_ward_{i}" for i in range(1, 17)},
    **{f"ghmc-0{i}": f"ghmc_ward_{i}" for i in range(1, 10)},
    **{f"ghmc-{i}": f"ghmc_ward_{i}" for i in range(10, 17)},
    # LMC Lucknow Aliases
    **{f"lmc_{i}": f"lmc_ward_{i}" for i in range(1, 13)},
    **{f"lmc-0{i}": f"lmc_ward_{i}" for i in range(1, 10)},
    **{f"lmc-{i}": f"lmc_ward_{i}" for i in range(10, 13)},
    # SMC Surat Aliases
    **{f"smc_{i}": f"smc_ward_{i}" for i in range(1, 13)},
    **{f"smc-0{i}": f"smc_ward_{i}" for i in range(1, 10)},
    **{f"smc-{i}": f"smc_ward_{i}" for i in range(10, 13)},
}

BENGALURU_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    f"bbmp_ward_{i}": {
        "name": f"BBMP Ward {i}",
        "ward_code": f"BBMP-{i:02d}",
        "district": "Bruhat Bengaluru Division",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "vulnerability_score": 55.0 + (i % 5) * 5.0,
        "population_density": "High Urban Residential & IT corridor",
        "baseline_temp": 33.5,
        "wbgt_offset": 1.2,
    }
    for i in range(1, 17)
}

HYDERABAD_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    f"ghmc_ward_{i}": {
        "name": f"GHMC Circle {i}",
        "ward_code": f"GHMC-{i:02d}",
        "district": "Greater Hyderabad Division",
        "latitude": 17.3850,
        "longitude": 78.4867,
        "vulnerability_score": 58.0 + (i % 5) * 5.0,
        "population_density": "High Commercial & Heritage Core",
        "baseline_temp": 35.5,
        "wbgt_offset": 1.4,
    }
    for i in range(1, 17)
}

LUCKNOW_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    f"lmc_ward_{i}": {
        "name": f"LMC Ward {i}",
        "ward_code": f"LMC-{i:02d}",
        "district": "Lucknow Municipal Division",
        "latitude": 26.8467,
        "longitude": 80.9462,
        "vulnerability_score": 62.0 + (i % 4) * 5.0,
        "population_density": "High Gangetic Plain Density",
        "baseline_temp": 36.2,
        "wbgt_offset": 1.6,
    }
    for i in range(1, 13)
}

SURAT_WARD_REGISTRY: Dict[str, Dict[str, Any]] = {
    f"smc_ward_{i}": {
        "name": f"SMC Ward {i}",
        "ward_code": f"SMC-{i:02d}",
        "district": "Surat Municipal Division",
        "latitude": 21.1702,
        "longitude": 72.8311,
        "vulnerability_score": 60.0 + (i % 4) * 5.0,
        "population_density": "Very High Textile & Diamond Belt",
        "baseline_temp": 35.8,
        "wbgt_offset": 1.5,
    }
    for i in range(1, 13)
}


def get_ward_profile(ward_id: str) -> Optional[Dict[str, Any]]:
    """
    Resolves a municipal administrative ward profile by canonical ID or alias.
    """
    clean = (ward_id or "").strip().lower()
    for reg in (
        MUNICIPAL_WARD_REGISTRY,
        JAIPUR_WARD_REGISTRY,
        PUNE_WARD_REGISTRY,
        BENGALURU_WARD_REGISTRY,
        HYDERABAD_WARD_REGISTRY,
        LUCKNOW_WARD_REGISTRY,
        SURAT_WARD_REGISTRY,
    ):
        if clean in reg:
            return reg[clean]

    alias = MUNICIPAL_WARD_ALIASES.get(clean)
    if alias:
        for reg in (
            MUNICIPAL_WARD_REGISTRY,
            JAIPUR_WARD_REGISTRY,
            PUNE_WARD_REGISTRY,
            BENGALURU_WARD_REGISTRY,
            HYDERABAD_WARD_REGISTRY,
            LUCKNOW_WARD_REGISTRY,
            SURAT_WARD_REGISTRY,
        ):
            if alias in reg:
                return reg[alias]

    # Dynamic fallback for unlisted city wards or custom sectors
    if "_ward_" in clean or clean.startswith("ward_") or any(char.isdigit() for char in clean):
        parts = clean.split("_")
        num = parts[-1] if parts[-1].isdigit() else "1"
        clean_city = parts[0].replace("_", " ").title() if len(parts) > 1 else "Municipal"
        return {
            "name": f"{clean_city} Ward {num}",
            "ward_code": f"W-{num.zfill(2)}",
            "district": f"{clean_city} Administrative Division",
            "latitude": 20.0,
            "longitude": 75.0,
            "vulnerability_score": 60.0,
            "population_density": "Urban Administrative Division",
            "baseline_temp": 34.5,
            "wbgt_offset": 1.2,
        }

    return None


def evaluate_heat_action_plan(
    area_id: str,
    area_name: Optional[str] = None,
    temperature_c: float = 34.0,
    humidity_pct: float = 65.0,
    wbgt_c: Optional[float] = None,
    heat_index_c: Optional[float] = None,
    solar_radiation: Optional[float] = None,
    wind_speed: Optional[float] = None,
    vulnerability_score: Optional[float] = None,
    risk_level: Optional[str] = None,
    risk_score: Optional[float] = None,
    forecast_max_risk: Optional[str] = None,
    forecast_trend: Optional[str] = "STEADY",
    forecast_lead_time_hours: Optional[int] = None,
    alert_state: Optional[str] = None,
) -> HeatActionPlanResult:
    """
    Evaluates current and upcoming thermal strain to produce machine-readable,
    rule-transparent Heat Action Plan recommendations for civic disaster managers.
    """
    clean_area_id = (area_id or "general_area").strip().lower()
    reg_entry = get_ward_profile(clean_area_id) or {}

    effective_name = area_name or reg_entry.get("name") or clean_area_id.replace("_", " ").title()
    effective_vuln = (
        vulnerability_score
        if vulnerability_score is not None
        else float(reg_entry.get("vulnerability_score", 50.0))
    )

    # Calculate WBGT if not passed
    effective_wbgt = wbgt_c
    if effective_wbgt is None:
        effective_wbgt = round(temperature_c * 0.7 + (humidity_pct / 100.0) * 10.0 + 4.0, 1)

    effective_heat_index = heat_index_c
    if effective_heat_index is None:
        effective_heat_index = round(temperature_c + 0.55 * (1 - (humidity_pct / 100)) * (temperature_c - 14.5), 1)

    # Determine risk level & score if missing
    if risk_score is None:
        raw_score = (effective_wbgt - 25.0) * 8.0 + (effective_vuln * 0.4)
        risk_score = max(5.0, min(99.0, raw_score))

    norm_risk = (risk_level or ("EXTREME" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "MODERATE" if risk_score >= 30 else "LOW")).upper().strip()
    norm_fc_risk = (forecast_max_risk or norm_risk).upper().strip()

    # -------------------------------------------------------------
    # 1. TRIGGER STATE DETERMINATION (Rule-Based & Scientifically Grounded)
    # -------------------------------------------------------------
    trigger_reasons: List[str] = []
    trigger_state = TRIGGER_BASELINE

    is_severe_now = norm_risk in ["HIGH", "EXTREME"] or effective_wbgt >= 30.0 or effective_heat_index >= 41.0
    is_severe_24h = norm_fc_risk in ["HIGH", "EXTREME"] and (forecast_lead_time_hours is not None and forecast_lead_time_hours <= 24)
    is_severe_3d = norm_fc_risk in ["HIGH", "EXTREME"] and (forecast_lead_time_hours is not None and 24 < forecast_lead_time_hours <= 72)

    if is_severe_now:
        trigger_state = TRIGGER_ACTION_NOW
        if effective_wbgt >= 30.0:
            trigger_reasons.append(f"Derived Wet-Bulb Globe Temp ({effective_wbgt:.1f}°C) exceeds critical civic safety threshold (30.0°C).")
        if norm_risk == "EXTREME":
            trigger_reasons.append("Current biometeorological risk level has reached EXTREME thermal stress.")
        elif norm_risk == "HIGH":
            trigger_reasons.append("Elevated afternoon thermal stress warrants immediate proactive civic controls.")
        if effective_vuln >= 70.0:
            trigger_reasons.append(f"High local socio-demographic vulnerability score ({effective_vuln:.0f}/100) intensifies community exposure.")
    elif is_severe_24h:
        trigger_state = TRIGGER_PREPARE_24H
        trigger_reasons.append(f"Forecast models indicate {norm_fc_risk} heat conditions will emerge within {forecast_lead_time_hours} hours.")
        trigger_reasons.append("Municipal teams must pre-stage cooling shelters and hydration infrastructure before peak solar radiation.")
    elif is_severe_3d:
        trigger_state = TRIGGER_PREPARE_3D
        trigger_reasons.append(f"Early-warning forecast models project rising thermal stress reaching {norm_fc_risk} within 48 to 72 hours.")
        trigger_reasons.append("City departments should initiate inter-agency coordination and review power grid reserves.")
    else:
        trigger_state = TRIGGER_BASELINE
        trigger_reasons.append("Current and 72-hour forecast conditions remain within manageable seasonal baseline limits.")
        trigger_reasons.append("Routine civic monitoring and public health observation remain active.")

    # -------------------------------------------------------------
    # 2. GENERATE RECOMMENDED ACTIONS ACROSS 5 OFFICIAL CATEGORIES
    # -------------------------------------------------------------
    actions: List[HeatActionItem] = []

    # Category 1: COOLING
    if trigger_state == TRIGGER_ACTION_NOW:
        priority = "CRITICAL" if norm_risk == "EXTREME" else "HIGH"
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="review_cooling_center_readiness",
            title="Review Cooling-Center & Respite Hall Readiness",
            description="Verify immediate operational readiness of designated municipal air-cooled shelters, community halls, and primary health centers. Ensure extended operational hours during peak sunlight.",
            priority=priority,
            justification=f"Triggered because current risk is {norm_risk} (WBGT: {effective_wbgt:.1f}°C). Vulnerable urban residents require air-conditioned respite to arrest core temperature buildup."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="review_shaded_recovery_access",
            title="Review Shaded Recovery & Transit Canopy Access",
            description="Erect temporary shaded awnings and misting fans at crowded bus terminuses, railway concourses, and outdoor vegetable market clusters.",
            priority="HIGH",
            justification=f"Solar radiation load ({solar_radiation or 550:.0f} W/m²) combined with high ambient heat creates acute surface thermal islanding in open pedestrian zones."
        ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="review_cooling_center_readiness",
            title="Pre-Stage Municipal Cooling Centers",
            description="Inspect ventilation, water chilling capacity, and emergency staffing at designated municipal respite facilities ahead of the forecast surge.",
            priority="MEDIUM",
            justification=f"Forecast risk projects {norm_fc_risk} conditions approaching within {forecast_lead_time_hours or 48} hours. Proactive facility checks prevent day-of bottlenecks."
        ))

    # Category 2: OUTDOOR WORK
    if trigger_state == TRIGGER_ACTION_NOW:
        priority = "CRITICAL" if (norm_risk == "EXTREME" or effective_wbgt >= 31.0) else "HIGH"
        actions.append(HeatActionItem(
            category=CATEGORY_OUTDOOR_WORK,
            action="review_work_restrictions",
            title="Enforce Mandatory Work-Rest Cycles",
            description="Issue municipal labor directive halting unshaded heavy manual labor (construction, road resurfacing, cart-pulling) between 12:00 PM and 3:00 PM. Mandate 15-45 minute hourly rest rotations.",
            priority=priority,
            justification=f"High wet-bulb globe temperature ({effective_wbgt:.1f}°C) severely impairs physiological evaporative cooling during strenuous exertion, drastically elevating exertional heatstroke hazard."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_OUTDOOR_WORK,
            action="review_schedule_shifts",
            title="Shift Civic Worker Shift Schedules",
            description="Reschedule municipal sanitation workers, sweepers, and delivery fleets to split shifts (early morning 06:00–10:30 and evening 17:00–20:30).",
            priority="HIGH",
            justification="Mitigates occupational heat morbidity without disrupting critical civic municipal hygiene services."
        ))
    elif trigger_state == TRIGGER_PREPARE_24H:
        actions.append(HeatActionItem(
            category=CATEGORY_OUTDOOR_WORK,
            action="review_work_restrictions",
            title="Issue Advance Contractor & Employer Advisory",
            description="Notify local construction contractors and informal labor employers of upcoming mandatory afternoon work pauses for tomorrow.",
            priority="HIGH",
            justification="Gives commercial and public works supervisors operational lead time to re-plan concrete pours and shift allocations."
        ))

    # Category 3: HYDRATION
    if trigger_state == TRIGGER_ACTION_NOW:
        actions.append(HeatActionItem(
            category=CATEGORY_HYDRATION,
            action="review_hydration_station_deployment",
            title="Deploy Mobile Hydration Tankers & ORS Kiosks",
            description="Dispatch civic water tankers equipped with clean drinking water and oral rehydration solution (ORS) packets to major transit bottlenecks, traffic signals, and market yards.",
            priority="CRITICAL" if norm_risk == "EXTREME" else "HIGH",
            justification=f"Thermal index indicates rapid dehydration rate (>1.0 L/hour fluid loss for outdoor individuals). Accessible public hydration prevents hypovolemic heat collapse."
        ))
        if effective_vuln >= 60.0:
            actions.append(HeatActionItem(
                category=CATEGORY_HYDRATION,
                action="review_water_distribution_support",
                title="Prioritize Potable Water Supply in High-Density Tenements",
                description="Coordinate with municipal hydraulic engineers to maintain continuous pipeline pressure and tanker frequency in informal settlement clusters.",
                priority="HIGH",
                justification=f"High vulnerability sector ({effective_vuln:.0f}/100) exhibits limited indoor piped storage. Uninterrupted community water access is vital for home cooling and hydration."
            ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_HYDRATION,
            action="review_hydration_station_deployment",
            title="Inventory ORS Supplies & Tanker Readiness",
            description="Audit municipal tanker fleets and ensure adequate buffer stock of WHO-formula ORS sachets at civic ward offices.",
            priority="MEDIUM",
            justification=f"Precautionary logistics preparation in advance of {norm_fc_risk} forecast."
        ))

    # Category 4: HEALTH PREPAREDNESS
    if trigger_state == TRIGGER_ACTION_NOW:
        priority = "CRITICAL" if norm_risk == "EXTREME" else "HIGH"
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="review_health_facility_readiness",
            title="Activate Hospital & Clinic Heatstroke Protocols",
            description="Ensure primary healthcare dispensaries have designated ice-bath immersion tubs, IV fluids, and dedicated heatstroke stabilization beds staffed by trained paramedics.",
            priority=priority,
            justification=f"Emergency department thermal surge probability is elevated under {norm_risk} conditions. Rapid immersion cooling within 30 minutes is the clinical gold standard for exertional heatstroke survival."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="review_vulnerable_population_outreach",
            title="Mobilize Community Health Workers (ASHA/Civic Teams)",
            description="Deploy field health workers to conduct door-to-door welfare checks on isolated elderly residents, chronically ill citizens, and pregnant mothers.",
            priority="HIGH",
            justification=f"Socio-demographic vulnerability analysis indicates heightened risk of unobserved domestic heat stress among homebound elderly and young children."
        ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="review_health_facility_readiness",
            title="Alert Hospital Surge Teams & Emergency Services",
            description="Issue preliminary health advisory to 108 emergency ambulance services and municipal medical superintendents to anticipate heat-related call volumes.",
            priority="MEDIUM",
            justification="Ensures paramedic staffing aligns with the forecast diurnal thermal peak."
        ))

    # Category 5: INFRASTRUCTURE
    if trigger_state == TRIGGER_ACTION_NOW:
        actions.append(HeatActionItem(
            category=CATEGORY_INFRASTRUCTURE,
            action="review_peak_electricity_demand_preparedness",
            title="Review Peak Electricity Grid & Substation Capacity",
            description="Coordinate with regional power distribution utilities (Discoms) to monitor distribution transformer loads and prevent brownouts caused by surging refrigeration/AC demand.",
            priority="HIGH",
            justification="Grid transformer overtemperature failures during severe heatwaves compound civilian mortality by disabling domestic fans and refrigeration."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_INFRASTRUCTURE,
            action="review_critical_cooling_infrastructure",
            title="Secure Backup Power for Healthcare & Pumping Stations",
            description="Verify fuel supplies and automatic transfer switches for diesel backup generators at civic hospitals, blood banks, and municipal water pumping stations.",
            priority="HIGH",
            justification="Guarantees uninterrupted patient cooling and municipal water delivery even under grid strain."
        ))
    elif trigger_state in [TRIGGER_PREPARE_24H, TRIGGER_PREPARE_3D]:
        actions.append(HeatActionItem(
            category=CATEGORY_INFRASTRUCTURE,
            action="review_peak_electricity_demand_preparedness",
            title="Review Grid Reserves Ahead of Heatwave Influx",
            description="Request transmission load balancing and defer scheduled maintenance on critical 33kV urban feeders until the forecast heat spell subsides.",
            priority="MEDIUM",
            justification="Preemptive grid scheduling prevents transmission bottlenecks during forecast extreme demand windows."
        ))

    # Fallback for normal baseline
    if not actions:
        actions.append(HeatActionItem(
            category=CATEGORY_COOLING,
            action="routine_facility_inspection",
            title="Maintain Routine Facility Readiness",
            description="Conduct standard seasonal audits of cooling assets and public water dispensers.",
            priority="LOW",
            justification="Current conditions are within baseline thresholds. Routine preparedness ensures long-term operational resilience."
        ))
        actions.append(HeatActionItem(
            category=CATEGORY_HEALTH,
            action="routine_public_health_surveillance",
            title="Maintain Public Health Surveillance",
            description="Track baseline syndromic notifications and monitor weather forecasts for upcoming shifts.",
            priority="LOW",
            justification="Standard civic health vigilance during seasonal weather conditions."
        ))

    return HeatActionPlanResult(
        area_id=clean_area_id,
        area_name=effective_name,
        risk_level=norm_risk,
        risk_score=risk_score,
        trigger_state=trigger_state,
        trigger_reasons=trigger_reasons,
        recommended_actions=actions,
        evaluated_telemetry={
            "temperature_c": temperature_c,
            "humidity_pct": humidity_pct,
            "wbgt_c": effective_wbgt,
            "heat_index_c": effective_heat_index,
            "vulnerability_score": effective_vuln,
            "forecast_trend": forecast_trend or "STEADY",
            "forecast_lead_time_hours": forecast_lead_time_hours,
        }
    )


def get_all_wards_heat_action_overview() -> List[Dict[str, Any]]:
    """
    Returns pre-computed Heat Action Plan trigger statuses across all 24 Mumbai administrative ward references
    for municipal command dashboards and GIS overview layers.
    Ward coordinates are representative coordinates derived from the current administrative ward geometry dataset.
    """
    results = []
    for ward_id, profile in MUNICIPAL_WARD_REGISTRY.items():
        base_t = profile.get("baseline_temp", 34.0)
        wbgt_off = profile.get("wbgt_offset", 0.0)
        vuln = profile.get("vulnerability_score", 50.0)

        # Realistic diurnal thermal profile
        calc_wbgt = round(28.0 + wbgt_off + (vuln / 100.0) * 3.0, 1)
        raw_score = (calc_wbgt - 25.0) * 8.0 + (vuln * 0.4)
        r_score = max(10.0, min(95.0, raw_score))
        r_level = "EXTREME" if r_score >= 75 else "HIGH" if r_score >= 50 else "MODERATE" if r_score >= 30 else "LOW"

        plan = evaluate_heat_action_plan(
            area_id=ward_id,
            area_name=profile["name"],
            temperature_c=base_t,
            humidity_pct=68.0,
            wbgt_c=calc_wbgt,
            vulnerability_score=vuln,
            risk_level=r_level,
            risk_score=r_score,
            forecast_max_risk=r_level,
            forecast_lead_time_hours=12 if r_level in ["HIGH", "EXTREME"] else 48,
        )
        results.append(plan.to_dict())

    return results
