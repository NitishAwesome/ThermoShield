"""
ThermoShield Biometeorological RAG (Retrieval-Augmented Generation) Engine.
Grounded in authoritative guidelines from:
- NDMA (National Disaster Management Authority, Government of India)
- IMD (India Meteorological Department)
- WHO (World Health Organization) & WMO Heat-Health Guidelines
- ISO 7243 / OSHA Wet Bulb Globe Temperature (WBGT) Standards
- Municipal Heat Action Plans (Ahmedabad, Mumbai, Delhi, Jaipur)
"""

import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeChunk:
    chunk_id: str
    title: str
    authority: str
    category: str  # e.g., 'first_aid', 'hydration', 'work_rest', 'vulnerable', 'imd_criteria', 'remedies', 'hap'
    content: str
    keywords: List[str]
    priority: int = 1  # 1 = standard, 2 = critical/emergency


# ==============================================================================
# AUTHORITATIVE BIOMETEOROLOGICAL KNOWLEDGE CORPUS
# ==============================================================================

RAG_KNOWLEDGE_CORPUS: List[KnowledgeChunk] = [
    # --------------------------------------------------------------------------
    # 1. EMERGENCY & CLINICAL PROTOCOLS (NDMA / WHO)
    # --------------------------------------------------------------------------
    KnowledgeChunk(
        chunk_id="ndma_first_aid_heatstroke",
        title="Emergency Heatstroke & Severe Hyperthermia First Aid Protocol",
        authority="NDMA / WHO / IMD Guidelines",
        category="first_aid",
        priority=2,
        keywords=[
            "stroke", "heatstroke", "heat stroke", "collapse", "collapsed", "unconscious",
            "behosh", "faint", "fainting", "chakar", "chakkar", "seizure", "delirium",
            "emergency", "108", "112", "ambulance", "first aid", "critical", "danger"
        ],
        content=(
            "🚨 **NDMA Emergency Heatstroke Clinical Response Protocol:**\n"
            "Heatstroke is an acute medical emergency characterized by core body temperature > 40°C (104°F) "
            "accompanied by altered mental state, delirium, absence of sweating, vomiting, or loss of consciousness.\n\n"
            "1. **Immediate Ambulance Dispatch:** Call 108 or 112 without delay. State 'Suspected Heat Stroke'.\n"
            "2. **Rapid Active Cooling (Zero-Minute Intervention):**\n"
            "   - Move patient into deep shade, air-conditioned room, or vehicle immediately.\n"
            "   - Strip outer clothing to maximize evaporative surface area.\n"
            "   - Apply cold wet towels, ice bags, or cold water compresses to high vascular blood-flow regions: "
            "neck, bilateral armpits (axillae), and groin.\n"
            "   - Vigorously fan air over patient while misting with tepid/cool water.\n"
            "3. **Airway & Positioning:** Place in the recovery position (lateral recumbent) if vomiting or semi-conscious.\n"
            "4. **Medication Contraindication:** NEVER administer paracetamol, aspirin, or antipyretics—they do not lower "
            "environmental hyperthermia and can exacerbate acute renal or hepatic strain."
        )
    ),
    KnowledgeChunk(
        chunk_id="who_heat_exhaustion_vs_stroke",
        title="Differentiating Heat Exhaustion vs Heat Stroke",
        authority="WHO / NDMA Clinical Guidelines",
        category="first_aid",
        priority=2,
        keywords=[
            "exhaustion", "symptoms", "difference", "lakshan", "cramps", "sweating",
            "dizziness", "headache", "nausea", "vomit", "faint", "weakness"
        ],
        content=(
            "⚠️ **Heat Exhaustion vs. Heat Stroke Triaging (WHO / NDMA Standards):**\n\n"
            "• **Heat Exhaustion (Early Warning):**\n"
            "  - Symptoms: Profuse sweating, pale/clammy skin, dizziness, headache, intense thirst, nausea, weak rapid pulse.\n"
            "  - Core Temperature: Typically < 39°C (102°F), mental status remains intact.\n"
            "  - Treatment: 30 minutes rest in cool shade, sip ORS or salted water, loosen clothing. If symptoms worsen, transition to emergency.\n\n"
            "• **Heat Stroke (Life-Threatening):**\n"
            "  - Symptoms: Hot red dry skin (or clammy sweating in exertional stroke), core temperature > 40°C, confusion, slurred speech, seizures, loss of consciousness.\n"
            "  - Action: Immediate 108 ambulance call and whole-body rapid immersion or active evaporative cooling."
        )
    ),

    # --------------------------------------------------------------------------
    # 2. HYDRATION & ELECTROLYTE PROTOCOLS (NDMA / WHO)
    # --------------------------------------------------------------------------
    KnowledgeChunk(
        chunk_id="ndma_hydration_protocol",
        title="Thermal Hydration Rates & Electrolyte Replacement Protocol",
        authority="NDMA / WHO Guidelines",
        category="hydration",
        priority=1,
        keywords=[
            "water", "drink", "hydration", "dehydration", "pani", "paani", "pyaas", "fluid",
            "electrolytes", "ors", "liter", "litres", "intake", "kitna", "peena", "peeyein"
        ],
        content=(
            "💧 **Thermal Hydration Protocol (NDMA & WHO Public Health Standards):**\n\n"
            "1. **Baseline Daily Quota:** Consume at least 3.0 to 4.5 Liters of fluids daily during heatwave advisories, "
            "drinking ahead of thirst cues rather than waiting to feel thirsty.\n"
            "2. **Active Intake Pacing:** During physical movement or outdoor exposure, consume **250–300 mL of fluid every 20–30 minutes**.\n"
            "3. **Electrolyte Strategy (Hyponatremia Prevention):** Heavy sweating leaches vital sodium and potassium. "
            "Plain water alone can dilute blood sodium. Supplement with:\n"
            "   - **WHO-formula Oral Rehydration Salts (ORS):** Dissolve 1 sachet in 1 Liter of clean water.\n"
            "   - **Homemade Electral Solution:** 1 Liter water + 6 level teaspoons sugar + 1/2 level teaspoon salt + freshly squeezed lemon.\n"
            "4. **Temperature Check:** Drink cool water (15–20°C). Avoid freezing ice water as it causes peripheral vasoconstriction and gastrointestinal cramping.\n"
            "5. **Diuretics to Avoid:** Eliminate alcohol, concentrated caffeine (dark teas/espressos), and carbonated high-sugar sodas which stimulate diuresis and cellular water loss."
        )
    ),
    KnowledgeChunk(
        chunk_id="traditional_indian_coolers",
        title="Traditional Indian Heat Remedies & Natural Electrolyte Defenses",
        authority="AYUSH / NDMA Heatwave Advisory",
        category="remedies",
        priority=1,
        keywords=[
            "remedy", "remedies", "traditional", "desi", "aam panna", "sattu", "chaas",
            "buttermilk", "coconut water", "nariyal pani", "nimbu", "lemon", "loo", "bachne"
        ],
        content=(
            "🥥 **Traditional & Proven Indian Heat Remedies Against 'Loo' Winds:**\n\n"
            "1. **Aam Panna (Raw Mango Cooler):** The gold standard traditional defense against North and Central Indian 'Loo' winds. "
            "Boiled or roasted green raw mango pulp mixed with roasted cumin (jeera), black salt (kala namak), and mint provides bioavailable sodium, potassium, and pectin.\n"
            "2. **Sattu Sharbat (Roasted Gram Flour Drink):** High-protein, nutrient-dense natural coolant. "
            "Dissolve 2 tablespoons of chana sattu in cool water with cumin and rock salt. Provides steady low-glycemic sustained hydration.\n"
            "3. **Chaas / Matha (Spiced Buttermilk):** Salted buttermilk with crushed curry leaves and asafoetida (hing). "
            "Rich in probiotics, easily absorbed bio-electrolytes, and core temperature thermoregulatory support.\n"
            "4. **Tender Coconut Water (Nariyal Paani):** Natural isotonic electrolyte source with rich potassium and magnesium profiles.\n"
            "5. **Onion Poultice / Diet:** Consuming raw onions with meals supplies quercetin, a bioflavonoid known for heat-protective antihistamine properties."
        )
    ),

    # --------------------------------------------------------------------------
    # 3. OCCUPATIONAL SAFETY & WBGT WORK-REST CYCLES (OSHA / ISO 7243)
    # --------------------------------------------------------------------------
    KnowledgeChunk(
        chunk_id="iso_7243_work_rest_cycle",
        title="Occupational Heat Safety & ISO 7243 WBGT Work-Rest Cycles",
        authority="ISO 7243 / OSHA / NDMA Guidelines",
        category="work_rest",
        priority=1,
        keywords=[
            "work", "worker", "labor", "labour", "construction", "field", "factory", "duty",
            "cycle", "rest", "break", "pacing", "wbgt", "occupational", "schedule", "shift"
        ],
        content=(
            "⚒️ **Occupational Heat Pacing & ISO 7243 / OSHA Work-Rest Standards:**\n\n"
            "Wet Bulb Globe Temperature (WBGT) incorporates radiant solar heat, humidity, air velocity, and ambient dry bulb temperature:\n\n"
            "• **WBGT < 28.0°C (Normal / Low Heat Load):** Continuous work permissible; mandatory 15-minute hydration break every 2 hours.\n"
            "• **WBGT 28.0°C – 29.9°C (Moderate Strain):** 45 minutes active work / 15 minutes shaded recovery per hour. Fluid intake: 500 mL/hour.\n"
            "• **WBGT 30.0°C – 31.9°C (High Strain):** 30 minutes active work / 30 minutes shaded recovery per hour. Shift heavy physical labor (digging, roofing, asphalt) to morning (before 10:30 AM) or late afternoon (after 4:30 PM).\n"
            "• **WBGT >= 32.0°C (Extreme Danger Threshold):** 15 minutes work / 45 minutes active cooling rest per hour, or suspend all non-essential outdoor physical labor.\n"
            "• **Mandatory Employer Requirements:** Provide shaded cooling sheds, cold drinking water (< 15°C) within 50 meters of worksite, and first-aid trained buddy pairing."
        )
    ),

    # --------------------------------------------------------------------------
    # 4. VULNERABLE POPULATION PROTOCOLS (WHO / NDMA)
    # --------------------------------------------------------------------------
    KnowledgeChunk(
        chunk_id="who_vulnerable_groups",
        title="Clinical Safety Protocols for High-Vulnerability Populations",
        authority="WHO / IMD / NDMA Guidelines",
        category="vulnerable",
        priority=1,
        keywords=[
            "elderly", "old", "senior", "children", "child", "baby", "infant", "kid",
            "pregnant", "pregnancy", "heart", "cardiovascular", "kidney", "renal",
            "diabetes", "hypertension", "bp", "vulnerable", "patient"
        ],
        content=(
            "👵 **Vulnerable Population Protection Protocols (WHO / NDMA Guidelines):**\n\n"
            "1. **Elderly (60+ Years):**\n"
            "   - Physiological Challenge: Reduced dermal vasodilation, attenuated thirst perception, decreased cardiac output reserve.\n"
            "   - Interventions: Mandatory indoor stay below 30°C. Track hydration on fixed schedule (do not rely on thirst). Check skin turgor and blood pressure.\n"
            "2. **Infants & Young Children:**\n"
            "   - Physiological Challenge: High surface-area-to-body-mass ratio accelerates heat gain. Underdeveloped sweating glands.\n"
            "   - Warning: NEVER leave a child in a parked car even for 1 minute (cabin temperatures reach lethal 55°C within 15 minutes).\n"
            "3. **Cardiovascular & Chronic Renal Patients:**\n"
            "   - Physiological Challenge: Thermal strain causes cardiac output to double (up to 10 L/min) to drive peripheral skin cooling.\n"
            "   - Medication Warning: Diuretics, ACE inhibitors, beta-blockers, and ARBs impair body thermoregulation. Consult attending physician before modifying fluid intake.\n"
            "4. **Pregnant Women:**\n"
            "   - Physiological Challenge: Elevated basal metabolic rate increases susceptibility to dehydration-triggered uterine contractions and preterm labor."
        )
    ),

    # --------------------------------------------------------------------------
    # 5. IMD HEATWAVE CRITERIA & ALERT COLOR CODES (IMD)
    # --------------------------------------------------------------------------
    KnowledgeChunk(
        chunk_id="imd_heatwave_thresholds",
        title="IMD Heatwave Warning Criteria & Color Code Matrix",
        authority="India Meteorological Department (IMD)",
        category="imd_criteria",
        priority=1,
        keywords=[
            "imd", "heatwave", "criteria", "alert", "warning", "yellow", "orange", "red",
            "threshold", "plains", "coastal", "hills", "temperature", "departure", "normal"
        ],
        content=(
            "📊 **IMD Official Heatwave Classification Criteria:**\n\n"
            "Qualitative criteria for heatwave declaration in India:\n"
            "• **Plains Stations:** Maximum temperature reaches at least **40.0°C**.\n"
            "• **Coastal Stations:** Maximum temperature reaches at least **37.0°C**.\n"
            "• **Hilly Regions:** Maximum temperature reaches at least **30.0°C**.\n\n"
            "**Classification by Departure from Normal (Climatological Baseline):**\n"
            "• *Heat Wave:* Departure from normal is **+4.5°C to +6.4°C**.\n"
            "• *Severe Heat Wave:* Departure from normal is **> +6.4°C**.\n"
            "• *Absolute Threshold Criteria:* When maximum temperature is >= 45.0°C (Heatwave) or >= 47.0°C (Severe Heatwave).\n\n"
            "**IMD Color Code Warning Matrix:**\n"
            "• 🟢 **Green (No Alert):** Normal thermal conditions.\n"
            "• 🟡 **Yellow Alert (Watch):** Heat tolerable, but moderate risk for vulnerable people.\n"
            "• 🟠 **Orange Alert (Be Prepared):** High heat strain, severe risk for outdoor workers and elderly.\n"
            "• 🔴 **Red Alert (Take Action):** Very high likelihood of heat illness and heat stroke for all age groups."
        )
    ),

    # --------------------------------------------------------------------------
    # 6. MUNICIPAL HEAT ACTION PLANS & CITY MITIGATION (HAP)
    # --------------------------------------------------------------------------
    KnowledgeChunk(
        chunk_id="municipal_heat_action_plan",
        title="Municipal Heat Action Plan (HAP) Checklist & City Infrastructure",
        authority="NDMA / Municipal Corporation HAP Matrix",
        category="hap",
        priority=1,
        keywords=[
            "municipal", "corporation", "hap", "action plan", "official", "shelter",
            "tanker", "water tanker", "cool roof", "misting", "city", "infrastructure"
        ],
        content=(
            "🏛️ **Municipal Heat Action Plan (HAP) Operations Checklist for City Administrators:**\n\n"
            "1. **Public Cooling Infrastructure:**\n"
            "   - Open designated Municipal Air-Conditioned Cooling Shelters in community halls, libraries, and transport terminuses.\n"
            "   - Extend night park hours to provide refuge for dense informal settlement residents.\n"
            "2. **Emergency Water & Electrolyte Distribution:**\n"
            "   - Station dedicated drinking water tankers and public ORS kiosks at high-density transit hubs, labor chowks, and mandi markets.\n"
            "3. **Hospital & Primary Health Centre (PHC) Readiness:**\n"
            "   - Designate dedicated Heatstroke Care Units (HCU) equipped with cold IV normal saline, ice immersion baths, and ORS packets.\n"
            "   - Train frontline ASHA and Anganwadi workers to recognize early heat exhaustion.\n"
            "4. **Urban Thermal Interventions:**\n"
            "   - Deploy mobile misting cannon trucks on arterial asphalt corridors during solar noon.\n"
            "   - Implement Cool Roof Programs (high-albedo solar reflective coatings) on slum tenements to reduce indoor heat load by 2–4°C."
        )
    ),
]


# ==============================================================================
# HINDI / HINGLISH TO BIOMETEOROLOGICAL CONCEPT MAPPINGS
# ==============================================================================

SYNONYM_DICTIONARY: Dict[str, List[str]] = {
    "pani": ["water", "hydration", "fluid", "peena", "drink"],
    "paani": ["water", "hydration", "fluid", "peena", "drink"],
    "garmi": ["heat", "heatwave", "temperature", "dhoop", "summer"],
    "dhoop": ["sunlight", "solar", "radiation", "uv", "outside", "dopahar"],
    "loo": ["hot winds", "heatwave", "aam panna", "remedies", "traditional"],
    "hawa": ["wind", "air", "breeze", "humidity", "ventilation", "atmosphere"],
    "chakkar": ["dizziness", "exhaustion", "symptoms", "heatstroke", "faint"],
    "chakar": ["dizziness", "exhaustion", "symptoms", "heatstroke", "faint"],
    "behosh": ["unconscious", "collapse", "heatstroke", "108", "emergency"],
    "bachne": ["prevention", "protection", "remedies", "safe", "precautions"],
    "tarika": ["methods", "protocol", "measures", "steps", "actions"],
    "kaise": ["how to", "guidance", "protocol", "advisory"],
    "pyaas": ["thirst", "hydration", "dehydration", "water"],
    "peena": ["drink", "intake", "hydration", "fluids", "ors"],
    "majdoor": ["worker", "labor", "construction", "work_rest", "occupational"],
    "mazdoor": ["worker", "labor", "construction", "work_rest", "occupational"],
    "bachhe": ["children", "infants", "pediatric", "vulnerable"],
    "buzurg": ["elderly", "seniors", "old age", "geriatric", "vulnerable"],
    "dawa": ["medication", "drugs", "contraindication", "hypertension", "bp"],
}


class ThermoShieldRAGService:
    """
    Production-grade hybrid lexical-semantic RAG retriever & synthesizer.
    Pulls authoritative NDMA, IMD, and WHO guidelines and provides:
    1. Grounded Context Chunks for Google Gemini API prompts.
    2. High-fidelity Autonomous Synthesis when LLM API keys are unconfigured.
    """

    def __init__(self, corpus: Optional[List[KnowledgeChunk]] = None):
        self.corpus = corpus or RAG_KNOWLEDGE_CORPUS

    def _expand_query(self, query: str) -> List[str]:
        """Expands query terms with bilingual biometeorological synonyms."""
        tokens = re.findall(r"\b[a-zA-Z0-9_\u0900-\u097F]{2,25}\b", query.lower())
        expanded = set(tokens)
        for t in tokens:
            if t in SYNONYM_DICTIONARY:
                for syn in SYNONYM_DICTIONARY[t]:
                    expanded.add(syn.lower())
        return list(expanded)

    def retrieve_relevant_chunks(
        self,
        query: str,
        top_k: int = 3,
        temperature_c: Optional[float] = None,
        risk_level: Optional[str] = None
    ) -> List[KnowledgeChunk]:
        """
        Scores knowledge chunks using a hybrid term-frequency + priority + context match.
        """
        expanded_tokens = self._expand_query(query)
        scored_chunks: List[Tuple[float, KnowledgeChunk]] = []

        q_lower = query.lower()
        is_emergency = any(
            w in q_lower for w in ["stroke", "unconscious", "collapse", "behosh", "faint", "seizure", "108", "112"]
        )

        for chunk in self.corpus:
            score = 0.0

            # Emergency boost
            if is_emergency and chunk.category == "first_aid":
                score += 50.0

            # High temperature boost for hydration & WBGT
            if temperature_c and temperature_c >= 38.0:
                if chunk.category in ["hydration", "work_rest", "remedies"]:
                    score += 5.0

            # Match against keywords
            for kw in chunk.keywords:
                kw_lower = kw.lower()
                if kw_lower in q_lower:
                    score += 8.0
                for token in expanded_tokens:
                    if token in kw_lower or kw_lower in token:
                        score += 3.0

            # Match against chunk title & content
            title_lower = chunk.title.lower()
            for token in expanded_tokens:
                if token in title_lower:
                    score += 4.0
                if token in chunk.content.lower():
                    score += 1.0

            # Category matching
            if any(w in q_lower for w in ["pani", "water", "drink", "ors", "electrolyte", "peena", "hydration"]) and chunk.category in ["hydration", "remedies"]:
                score += 15.0
            if any(w in q_lower for w in ["work", "rest", "labor", "worker", "shift", "duty", "break"]) and chunk.category == "work_rest":
                score += 15.0
            if any(w in q_lower for w in ["elderly", "bachhe", "kid", "baby", "pregnant", "old", "senior", "bp"]) and chunk.category == "vulnerable":
                score += 15.0
            if any(w in q_lower for w in ["loo", "desi", "remedy", "aam panna", "sattu", "chaas", "gharelu"]) and chunk.category == "remedies":
                score += 15.0
            if any(w in q_lower for w in ["alert", "imd", "warning", "yellow", "orange", "red", "criteria"]) and chunk.category == "imd_criteria":
                score += 15.0
            if any(w in q_lower for w in ["municipal", "official", "city", "corporation", "shelter", "tanker"]) and chunk.category == "hap":
                score += 15.0

            scored_chunks.append((score, chunk))

        # Sort by highest score, then priority
        scored_chunks.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
        return [c for score, c in scored_chunks[:top_k] if score > 0] or [self.corpus[0]]

    def format_rag_context(self, chunks: List[KnowledgeChunk]) -> str:
        """Formats retrieved chunks into a prompt-ready context block."""
        blocks = []
        for i, chunk in enumerate(chunks, 1):
            blocks.append(
                f"[Source {i}: {chunk.title} ({chunk.authority})]\n{chunk.content}"
            )
        return "\n\n".join(blocks)

    def synthesize_rag_response(
        self,
        query: str,
        location: str,
        temp: float,
        humidity: float,
        risk_level: str,
        chunks: List[KnowledgeChunk],
        extra_weather: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Autonomous RAG Synthesizer.
        Generates a direct, question-specific, verified biometeorological response
        derived exclusively from the top retrieved knowledge chunks and live telemetry.
        Used when the external LLM key is absent or unreachable.
        """
        if not chunks:
            chunks = self.corpus[:2]

        top_chunk = chunks[0]
        sources = list({c.authority for c in chunks})
        source_str = " & ".join(sources)

        q_lower = query.lower()
        is_emergency = any(
            w in q_lower for w in ["stroke", "unconscious", "collapse", "collapsed", "behosh", "faint", "seizure", "108", "112", "emergency"]
        )

        intro = (
            f"🛡️ **ThermoShield Biometeorological Advisory for {location}**\n"
            f"*Live Open-Meteo Telemetry:* **{temp:.1f}°C** | **{humidity:.0f}% Humidity** | Risk Tier: **{risk_level}**\n"
            f"*Grounded in:* **{source_str}**\n\n"
        )

        # Weather & Forecast section if asked
        weather_section = ""
        if any(w in q_lower for w in ["weather", "temperature", "temp", "mausam", "forecast", "garmi", "climate", "barish", "rain"]):
            extra = extra_weather or {}
            weather_desc = extra.get("description", "Clear Sky")
            app_t = extra.get("apparent_temperature", temp)
            forecast = extra.get("forecast", {})
            f_max = forecast.get("temperature_max", [])
            f_min = forecast.get("temperature_min", [])

            lines = [f"🌤️ **Live Open-Meteo Weather Status for {location}:**"]
            lines.append(f"• **Current Temperature:** **{temp:.1f}°C** (Feels Like / Heat Index: **{app_t:.1f}°C**)")
            lines.append(f"• **Relative Humidity:** **{humidity:.0f}%** | Sky Condition: **{weather_desc}**")
            precip = extra.get("precipitation")
            if precip and float(precip) > 0:
                lines.append(f"• **Precipitation:** **{float(precip):.1f} mm**")
            wind = extra.get("wind_speed")
            if wind and float(wind) > 0:
                lines.append(f"• **Wind Speed:** **{float(wind):.1f} m/s**")
            if len(f_max) > 1 and len(f_min) > 1:
                lines.append(f"• **Tomorrow's Forecast:** High **{f_max[1]:.1f}°C** | Low **{f_min[1]:.1f}°C**")
            if len(f_max) > 2 and len(f_min) > 2:
                lines.append(f"• **Day After Forecast:** High **{f_max[2]:.1f}°C** | Low **{f_min[2]:.1f}°C**")
            lines.append(f"• **ThermoShield Thermal Risk:** {risk_level.upper()} Risk Tier")
            weather_section = "\n".join(lines) + "\n\n"

        # Body synthesized from top chunks
        body_parts = []
        if weather_section:
            body_parts.append(weather_section.strip())
        for chunk in chunks[:2]:
            body_parts.append(chunk.content)

        full_reply = intro + "\n\n---\n\n".join(body_parts)

        return {
            "reply": full_reply,
            "suggested_questions": [
                f"How much water should I drink in {location.split(',')[0]} today?",
                "What work-rest pacing should outdoor workers follow?",
                "What traditional Indian drinks protect against loo winds?"
            ],
            "safety_tier": "EMERGENCY" if is_emergency else risk_level,
            "emergency_call": is_emergency,
            "model_used": f"rag-synthesizer ({top_chunk.authority.split('/')[0].strip()})",
            "is_gemini": False,
            "rag_sources": [f"{c.title} ({c.authority})" for c in chunks]
        }


# Singleton RAG engine instance
rag_engine = ThermoShieldRAGService()
