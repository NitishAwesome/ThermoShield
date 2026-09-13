import os
import re
import json
import time
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import httpx

from app.services.location import search_location
from app.services.weather import get_weather

logger = logging.getLogger(__name__)

# ==============================================================================
# DYNAMIC GEOGRAPHIC LOCATION RESOLVER & CACHE
# Dynamically resolves any city, town, or district worldwide via Open-Meteo API
# ==============================================================================

_GEOCODING_CACHE: Dict[str, Tuple[str, float, float]] = {
    "mumbai": ("Mumbai, Maharashtra, India", 19.0760, 72.8777),
    "delhi": ("Delhi, India", 28.6139, 77.2090),
}

NON_PLACE_WORDS = {
    "garmi", "heat", "summer", "water", "body", "morning", "evening", "today", "tomorrow",
    "now", "here", "night", "room", "sun", "sunlight", "hours", "cycle", "stroke", "illness",
    "protocol", "first", "aid", "worker", "labor", "child", "elderly", "ors", "pani", "paani", "drink",
    "food", "doctor", "hospital", "patient", "weather", "temp", "temperature", "forecast", "prediction",
    "climate", "dhoop", "chakar", "chakkar", "behosh", "safe", "danger", "index", "wbgt", "level", "tier",
    "this", "that", "these", "those", "there", "where", "what", "which", "who", "whom", "whose", "when",
    "why", "how", "my", "your", "his", "her", "their", "our", "its", "the", "a", "an", "any", "some",
    "all", "degree", "degrees", "celsius", "fahrenheit", "hot", "cold", "such", "each", "every",
    "area", "zone", "place", "city", "town", "state", "country", "home", "house", "work", "school",
    "college", "road", "street", "car", "bus", "train", "office", "high", "low", "extreme", "moderate",
    "someone", "anyone", "person", "man", "woman", "baby", "kid", "people", "worker", "family",
    "much", "many", "should", "could", "would", "shall", "will", "can", "tell", "show", "give",
    "help", "need", "want", "take", "feel", "feeling", "have", "with", "from", "about", "suggest",
    "guide", "advice", "advise", "please", "kya", "kaise", "batao", "bataiye", "kitna", "kitni"
}

# ==============================================================================
# BIOMETEOROLOGICAL KNOWLEDGE BASE & STANDARDS
# Grounded in NDMA (National Disaster Management Authority), IMD, and WHO guidelines.
# ==============================================================================

HEAT_FIRST_AID_GUIDE = (
    "🚨 **Heat Emergency First-Aid Protocol (NDMA/WHO Standards):**\n\n"
    "1. **Recognize Heat Stroke Signs:** Body temp > 40°C (104°F), confusion, altered mental state, slurred speech, rapid pulse, hot dry skin or profuse sweating, seizures or loss of consciousness.\n"
    "2. **Immediate Action:** Call **108** or **112** for emergency ambulance.\n"
    "3. **Aggressive Cooling:**\n"
    "   - Move the person to an air-conditioned room or dense shade immediately.\n"
    "   - Remove excess outer clothing.\n"
    "   - Apply cold wet cloths, ice packs, or cold water to neck, armpits, groin, and ankles (high blood-flow zones).\n"
    "   - Fan air vigorously while misting with cool water.\n"
    "4. **Hydration Warning:** Do NOT force-feed liquids if the person is semi-conscious, vomiting, or disoriented."
)

HYDRATION_RULES = (
    "💧 **Hydration Protocol based on Thermal Load:**\n\n"
    "• **Mild Heat (< 32°C):** Minimum 2.5–3 Liters of clean drinking water daily.\n"
    "• **Moderate Heat (32°C – 37°C):** Drink 250–300 mL of water every 30 minutes, even without feeling thirsty.\n"
    "• **Severe/Extreme Heat (> 38°C):** Consume 500 mL of fluid every 20–30 minutes during physical exertion.\n"
    "• **Electrolyte Balance:** Plain water is not enough during heavy sweating. Supplement with Oral Rehydration Salts (ORS), coconut water, salted lassi, or lemon water to prevent hyponatremia.\n"
    "• **Avoid:** Caffeine, alcohol, and carbonated high-sugar sodas as they accelerate cellular dehydration."
)

WORK_REST_CYCLE_GUIDE = (
    "⚒️ **Occupational Heat Safety & Work-Rest Cycles (ISO 7243 / OSHA / NDMA):**\n\n"
    "• **WBGT < 28°C (Normal):** Continuous heavy work permissible with standard 15-min break every 2 hours.\n"
    "• **WBGT 28°C – 30°C (Moderate Strain):** 45 mins work / 15 mins shaded rest per hour. Increase fluid intake to 750 mL/hour.\n"
    "• **WBGT 30°C – 32°C (High Strain):** 30 mins work / 30 mins shaded rest per hour. Shift heavy physical labor to morning (before 11 AM) or evening (after 4 PM).\n"
    "• **WBGT > 32°C (Extreme Danger):** 15 mins work / 45 mins active cooling rest per hour, or suspend non-essential outdoor physical labor."
)

VULNERABLE_GROUPS_GUIDE = (
    "👵 **Protection for High-Vulnerability Populations:**\n\n"
    "1. **Elderly (60+ yrs):** Decreased thirst perception and reduced sweating efficiency. Keep in cool rooms below 30°C. Monitor blood pressure and hydration.\n"
    "2. **Children & Infants:** Higher surface-area-to-body-mass ratio means they absorb environmental heat faster. Never leave a child in a parked vehicle even with windows cracked.\n"
    "3. **Chronic Patients (Hypertension, Diabetes, Kidney Disease):** Antihypertensives, diuretics, and beta-blockers impair thermoregulation. Consult doctor before changing fluid limits.\n"
    "4. **Pregnant Women:** Elevated metabolic rate increases susceptibility to heat exhaustion and dehydration-triggered early contractions."
)

MUNICIPAL_INTERVENTIONS_GUIDE = (
    "🏛️ **Municipal Heat Action Plan (HAP) Checklist for Officials:**\n\n"
    "1. **Cooling Infrastructure:** Activate designated municipal cooling shelters with functional air conditioning and backup power.\n"
    "2. **Water Availability:** Deploy mobile drinking water tankers and public ORS kiosks at transport hubs, construction clusters, and markets.\n"
    "3. **Healthcare Preparedness:** Set up dedicated Heatstroke Care Units (HCU) with ice baths, cold IV saline, and ORS supplies in primary health centers.\n"
    "4. **Urban Cooling:** Deploy misting cannons on high-traffic corridors and encourage cool-roof coatings (high solar reflectance) on low-income settlements."
)


class ThermoShieldCopilot:
    """
    Intelligent AI Copilot for ThermoShield Heatwave Decision Support.
    Supports Google Gemini (2.0-flash / 1.5-flash) with dynamic biometeorological synthesis fallback.
    """

    def __init__(self):
        self._refresh_keys()

    def _refresh_keys(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.neon_gateway_key = os.getenv("NEON_AI_GATEWAY_KEY")

    async def _detect_location_from_query(self, query: str) -> Optional[Tuple[str, float, float]]:
        """
        Intelligently detects whether the user query asks about a specific city or region.
        1. Fast scan against in-memory geocoding cache.
        2. Pattern extractor for 'in <city>', '<city> me/mein', '<city> ka/ki/ke', '<city> weather'.
        3. Dynamic fallback to Open-Meteo geocoding search_location API (0 hardcoded lists).
        """
        q = query.lower()

        # 1. Quick check against cached cities (longest first)
        for cached_key, info in sorted(_GEOCODING_CACHE.items(), key=lambda x: -len(x[0])):
            if re.search(rf"\b{re.escape(cached_key)}\b", q):
                return info

        # 2. Pattern candidates (e.g. 'in Lucknow', 'Kolkata me', 'Jaipur ka weather', 'Delhi weather')
        patterns = [
            r"\b(?:in|at|for|near|around)\s+([a-zA-Z]{3,25}(?:\s+[a-zA-Z]{3,25})?)\b",
            r"\b([a-zA-Z]{3,25}(?:\s+[a-zA-Z]{3,25})?)\s+(?:me|mein|mai|ka|ki|ke)\b",
            r"\b(?:weather|temp|temperature|mausam|forecast|garmi|heat)\s+(?:of|in|for)\s+([a-zA-Z]{3,25}(?:\s+[a-zA-Z]{3,25})?)\b",
            r"\b([a-zA-Z]{3,25})\s+(?:weather|temp|temperature|forecast|mausam)\b"
        ]
        for pat in patterns:
            match = re.search(pat, query, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                cand_lower = candidate.lower()
                if re.search(r'[\d,?.!]', candidate):
                    continue
                cand_words = set(cand_lower.split())
                if cand_words.intersection(NON_PLACE_WORDS) or len(cand_lower) < 3:
                    continue
                if cand_lower in _GEOCODING_CACHE:
                    return _GEOCODING_CACHE[cand_lower]
                try:
                    results = await search_location(candidate)
                    if results:
                        top = results[0]
                        res_tuple = (top["name"], float(top["latitude"]), float(top["longitude"]))
                        _GEOCODING_CACHE[cand_lower] = res_tuple
                        return res_tuple
                except Exception as err:
                    logger.warning(f"Failed to geocode query candidate '{candidate}': {err}")

        # 3. If the entire query is a concise 1-2 word query (e.g. 'Jaipur' or 'New Delhi')
        clean_query = re.sub(r'[?!.,;:]', '', query).strip()
        tokens = clean_query.split()
        if 1 <= len(tokens) <= 2 and not any(t.lower() in NON_PLACE_WORDS for t in tokens):
            q_cand = clean_query.lower()
            if q_cand in _GEOCODING_CACHE:
                return _GEOCODING_CACHE[q_cand]
            try:
                results = await search_location(clean_query)
                if results:
                    top = results[0]
                    res_tuple = (top["name"], float(top["latitude"]), float(top["longitude"]))
                    _GEOCODING_CACHE[q_cand] = res_tuple
                    return res_tuple
            except Exception:
                pass

        return None

    async def _resolve_telemetry(
        self,
        query: str,
        passed_location: Optional[str],
        passed_temp: Optional[float],
        passed_humidity: Optional[float],
        passed_risk: Optional[str]
    ) -> Tuple[str, float, float, str, Dict[str, Any], bool]:
        """
        Resolves the true target location and live real-time weather telemetry.
        If the user asks about ANY city (e.g. Delhi, Jaipur, Lucknow, Kolkata):
        - Resolves city coordinates via dynamic search
        - Fetches real-time weather from Open-Meteo
        - Sets live ambient temperature, humidity, apparent temp, and forecast!
        Returns:
        (resolved_location, temp, humidity, risk_level, extra_weather, is_city_detected_from_query)
        """
        # 1. First priority: City mentioned directly in user query
        detected = await self._detect_location_from_query(query)
        if detected:
            loc_name, lat, lon = detected
            try:
                weather_data = await get_weather(lat, lon)
                w_curr = weather_data.get("weather", {})
                t = float(w_curr.get("temperature", 35.0))
                h = float(w_curr.get("humidity", 50.0))
                app_t = float(w_curr.get("apparent_temperature", t))
                desc = str(w_curr.get("weather_description", "Clear Sky"))
                forecast = weather_data.get("forecast", {})
                risk = "EXTREME" if t >= 40 else "HIGH" if t >= 36 else "MODERATE" if t >= 32 else "LOW"
                extra = {
                    "apparent_temperature": app_t,
                    "description": desc,
                    "forecast": forecast,
                    "latitude": lat,
                    "longitude": lon,
                }
                return loc_name, t, h, risk, extra, True
            except Exception as e:
                logger.warning(f"Could not fetch live weather for detected city {loc_name}: {e}")
                risk = "HIGH"
                return loc_name, 36.0, 50.0, risk, {}, True

        # 2. Second priority: Passed location from dashboard/client
        if passed_location:
            clean_loc = passed_location.strip()
            # If valid temperature was passed from client, use it
            if passed_temp is not None and passed_humidity is not None:
                risk = passed_risk.upper() if passed_risk else ("EXTREME" if passed_temp >= 40 else "HIGH" if passed_temp >= 36 else "MODERATE")
                return clean_loc, passed_temp, passed_humidity, risk, {}, False

            # If temperature was not provided, attempt to resolve location coordinates & live weather dynamically
            loc_key = clean_loc.lower().split(",")[0].strip()
            loc_coords = None
            if loc_key in _GEOCODING_CACHE:
                loc_coords = _GEOCODING_CACHE[loc_key]
            else:
                try:
                    results = await search_location(loc_key)
                    if results:
                        top = results[0]
                        loc_coords = (top["name"], float(top["latitude"]), float(top["longitude"]))
                        _GEOCODING_CACHE[loc_key] = loc_coords
                except Exception as err:
                    logger.warning(f"Dynamic search location failed for {clean_loc}: {err}")

            if loc_coords:
                full_name, lat, lon = loc_coords
                try:
                    w_data = await get_weather(lat, lon)
                    w_curr = w_data.get("weather", {})
                    t = float(w_curr.get("temperature", 36.0))
                    h = float(w_curr.get("humidity", 50.0))
                    app_t = float(w_curr.get("apparent_temperature", t))
                    desc = str(w_curr.get("weather_description", "Clear Sky"))
                    forecast = w_data.get("forecast", {})
                    risk = "EXTREME" if t >= 40 else "HIGH" if t >= 36 else "MODERATE" if t >= 32 else "LOW"
                    return full_name, t, h, risk, {
                        "apparent_temperature": app_t,
                        "description": desc,
                        "forecast": forecast,
                        "latitude": lat,
                        "longitude": lon
                    }, False
                except Exception as err:
                    logger.warning(f"Weather lookup failed for passed location {clean_loc}: {err}")

            return clean_loc, passed_temp or 36.0, passed_humidity or 50.0, (passed_risk or "HIGH").upper(), {}, False

        # 3. Default fallback
        return "your monitored area", passed_temp or 36.0, passed_humidity or 50.0, (passed_risk or "HIGH").upper(), {}, False

    def _build_context_summary(
        self,
        location: Optional[str],
        temp: Optional[float],
        humidity: Optional[float],
        risk_level: Optional[str],
        risk_score: Optional[float],
        role: Optional[str],
        weather_desc: Optional[str] = None
    ) -> str:
        ctx_parts = []
        if location:
            ctx_parts.append(f"Location: {location}")
        if temp is not None:
            ctx_parts.append(f"Ambient Temperature: {temp:.1f}°C")
        if humidity is not None:
            ctx_parts.append(f"Humidity: {humidity:.0f}%")
        if weather_desc:
            ctx_parts.append(f"Sky Condition: {weather_desc}")
        if risk_level:
            ctx_parts.append(f"Heat Risk Tier: {risk_level.upper()}")
        if risk_score is not None:
            ctx_parts.append(f"Risk Score: {risk_score:.1f}/100")
        if role:
            ctx_parts.append(f"User Persona: {role.title()}")
        return " | ".join(ctx_parts) if ctx_parts else "Location: General Monitored Region"

    async def _call_gemini_api(
        self,
        prompt: str,
        system_context: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        custom_key: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """
        Calls Google Gemini API (gemini-2.0-flash or gemini-1.5-flash) via lightweight HTTPX REST.
        Supports multi-turn history and custom API keys.
        """
        self._refresh_keys()
        api_key = (custom_key or "").strip() or self.gemini_key
        if not api_key:
            return None

        # Format conversation contents for Gemini REST API
        contents = []
        if conversation_history:
            for turn in conversation_history[-6:]:
                role = "model" if turn.get("role") in ["model", "assistant", "copilot"] else "user"
                text = turn.get("text") or turn.get("content") or ""
                if text.strip():
                    contents.append({"role": role, "parts": [{"text": text.strip()}]})

        # Append current user prompt
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        system_instruction = (
            "You are Dr. ThermoShield, an empathetic, highly knowledgeable AI biometeorologist and heatwave health advisor "
            "for the ThermoShield Early Warning Decision Support System (SIH26083). Ground your responses in IMD, NDMA, and WHO biometeorological guidelines.\n\n"
            f"Active Environmental Telemetry Context: {system_context}\n\n"
            "Style Guidelines:\n"
            "1. Multilingual Agility: Fluently understand and respond in the language used by the citizen (English, Hindi, Hinglish, or regional Indian languages). "
            "If asked in Hindi/Hinglish (e.g. 'pani kitna pina chahiye', 'loo se kaise bache'), provide warm, natural, and medically accurate advice in that language.\n"
            "2. Address the user's specific question directly with clear, engaging, conversational language.\n"
            "3. Use structured markdown: bold headings, bullet points, and exact numbers (e.g. mL of water, minutes of rest, specific temperature thresholds).\n"
            "4. Recommend traditional, scientifically proven Indian heat remedies alongside modern electrolytes: ORS, Aam Panna (raw mango cooler), Sattu sharbat, Chaas (salted buttermilk), and fresh coconut water.\n"
            "5. Emergency Protocol: If severe heat illness or heat stroke is suspected (temp > 40°C, delirium, stopped sweating, vomiting, confusion), urgently advise calling 108/112 ambulance and starting aggressive cooling immediately.\n"
            "6. Keep answers concise, actionable, and easy to read on mobile devices."
        )

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": contents,
            "generation_config": {
                "temperature": 0.4,
                "max_output_tokens": 1000
            }
        }

        # Try gemini-3.6-flash, gemini-flash-latest, and gemini-3.5-flash for rate-limit failover
        models_to_try = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash"]

        async with httpx.AsyncClient(timeout=14.0) as client:
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                try:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                generated_text = parts[0].get("text", "").strip()
                                logger.info(f"Successfully generated response with Gemini model: {model_name}")
                                return {
                                    "reply": generated_text,
                                    "model": model_name
                                }
                    else:
                        logger.warning(f"Gemini API returned status {res.status_code} for {model_name}: {res.text[:200]}")
                except Exception as err:
                    logger.warning(f"Gemini API call failed for {model_name}: {err}")

        return None

    def _expert_rule_engine(
        self,
        query: str,
        location: Optional[str],
        temp: Optional[float],
        humidity: Optional[float],
        risk_level: Optional[str],
        risk_score: Optional[float],
        role: Optional[str],
        extra_weather: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Dynamic Biometeorological Expert Synthesis Engine.
        Synthesizes tailored, question-specific advice when no external LLM API key is connected.
        """
        q = query.lower().strip()
        current_temp = temp if temp is not None else 36.0
        current_rh = humidity if humidity is not None else 50.0
        current_risk = (risk_level or ("EXTREME" if current_temp >= 40 else "HIGH" if current_temp >= 36 else "MODERATE")).upper()
        current_loc = location or "your area"

        # Calculate estimated heat index
        heat_index_c = current_temp + 0.5555 * ((6.11 * (10 ** (7.5 * current_temp / (237.3 + current_temp))) * (current_rh / 100)) - 10)
        hi_str = f"{heat_index_c:.1f}°C" if heat_index_c > current_temp else f"{current_temp:.1f}°C"

        # 1. Heat Emergency / Heat Stroke (Top Critical Safety Priority)
        if any(w in q for w in ["stroke", "exhaustion", "emergency", "faint", "unconscious", "first aid", "cramps", "sick", "vomit", "collapse", "behosh", "chakar", "chakkar", "108"]):
            return {
                "reply": (
                    f"⚠️ **Emergency Heat Illness Protocol for {current_loc}**\n\n"
                    f"Ambient telemetry indicates **{current_temp:.1f}°C** (Feels like **{hi_str}**, {current_risk} Risk Tier).\n\n"
                    + HEAT_FIRST_AID_GUIDE
                    + "\n\n💡 *Dr. ThermoShield Medical Note:* Never give antipyretics like paracetamol or aspirin for environmental heatstroke — they do not reduce elevated core body temperature and can worsen renal strain."
                ),
                "suggested_questions": [
                    "How much water should I drink in this heat?",
                    "What are the safest hours to be outdoors today?",
                    "Where can I find the nearest cooling shelter?"
                ],
                "safety_tier": "EMERGENCY",
                "emergency_call": True,
                "model_used": "biomet-expert-engine"
            }

        # 2. Real-Time Weather, Temperature & Forecast Queries
        if any(w in q for w in ["weather", "temperature", "temp", "mausam", "forecast", "prediction", "garmi", "climate", "barish", "rain", "dhoop", "heatwave"]):
            extra = extra_weather or {}
            weather_desc = extra.get("description", "Clear Sky & Sunshine")
            app_temp = extra.get("apparent_temperature", current_temp)
            forecast = extra.get("forecast", {})
            f_max = forecast.get("temperature_max", [])
            f_min = forecast.get("temperature_min", [])

            forecast_lines = []
            if len(f_max) > 1 and len(f_min) > 1:
                forecast_lines.append(f"• **Tomorrow:** High **{f_max[1]:.1f}°C** | Low **{f_min[1]:.1f}°C**")
            if len(f_max) > 2 and len(f_min) > 2:
                forecast_lines.append(f"• **Day After:** High **{f_max[2]:.1f}°C** | Low **{f_min[2]:.1f}°C**")
            if len(f_max) > 3 and len(f_min) > 3:
                forecast_lines.append(f"• **Day 3:** High **{f_max[3]:.1f}°C** | Low **{f_min[3]:.1f}°C**")

            forecast_section = "\n".join(forecast_lines) if forecast_lines else "• Forecast models indicate sustained elevated thermal loads over the next 48–72 hours."

            # Dynamic thermal stress guideline
            if current_temp >= 40.0:
                stress_note = "🔴 **Severe Heatwave Conditions:** High danger of heat hyperthermia. Cease all non-essential outdoor movements between 11:30 AM and 04:30 PM."
            elif current_temp >= 36.0:
                stress_note = "🟠 **High Heat Strain:** Thermal index is significantly elevated. Drink at least 350 mL of water or electrolytes every 30 minutes while outdoors."
            elif current_temp >= 32.0:
                stress_note = "🟡 **Moderate Heat Load:** Warm thermal conditions. Stay adequately hydrated and seek shaded or ventilated transit."
            else:
                stress_note = "🟢 **Mild Conditions:** Thermal stress levels are currently within safe baseline physiological limits."

            return {
                "reply": (
                    f"🌤️ **Real-Time Weather & Heat Assessment for {current_loc}**\n\n"
                    f"• **Current Temperature:** **{current_temp:.1f}°C** (Feels like **{app_temp:.1f}°C** / Heat Index **{hi_str}**)\n"
                    f"• **Relative Humidity:** **{current_rh:.0f}%**\n"
                    f"• **Atmospheric Condition:** **{weather_desc}**\n"
                    f"• **Heat Stress Risk Tier:** **{current_risk}**\n\n"
                    f"📅 **Upcoming Forecast for {current_loc}:**\n"
                    f"{forecast_section}\n\n"
                    f"💡 **Biometeorological Advisory:**\n"
                    f"{stress_note}\n\n"
                    f"Protect against high radiant heat by carrying water mixed with ORS or lemon-salt, wearing loose cotton clothing, and staying out of direct solar noon exposure."
                ),
                "suggested_questions": [
                    f"How much water should I drink in {current_loc} today?",
                    "What work-rest break schedule should outdoor laborers follow?",
                    "What are the early warning signs of heat exhaustion?"
                ],
                "safety_tier": current_risk,
                "emergency_call": False,
                "model_used": "biomet-expert-engine"
            }

        # 3. Hydration & Fluids
        if any(w in q for w in ["water", "drink", "hydration", "dehydration", "ors", "electrolyte", "thirst", "cold water", "pani", "paani", "pyaas", "nimbu", "sattu", "panna", "chaas", "loo"]):
            fluid_amount = "500 mL every 20-25 minutes" if current_temp >= 38 else "250-300 mL every 30 minutes"
            daily_target = "3.5 to 4.5 Liters" if current_temp >= 38 else "3.0 Liters"
            return {
                "reply": (
                    f"💧 **Personalized Hydration Advisory for {current_loc}**\n\n"
                    f"Current environmental load: **{current_temp:.1f}°C** with **{current_rh:.0f}% humidity** (Heat Index: **{hi_str}**).\n\n"
                    f"1. **Active Intake Rate:** Consume **{fluid_amount}** while active or working outdoors.\n"
                    f"2. **Daily Baseline Volume:** Target at least **{daily_target}** of fluids across the day, drinking ahead of thirst cues.\n"
                    f"3. **Electrolyte Strategy:** Sweat depletes sodium and potassium. Mix 1 sachet of **Oral Rehydration Salts (ORS)** in 1L of water, or drink coconut water / lemon water with rock salt.\n"
                    f"4. **Traditional Cooling Drinks:** Natural coolers like **Aam Panna** (raw mango drink with roasted cumin), **Sattu sharbat** (roasted gram drink), and **Chaas** (salted buttermilk) help maintain core electrolyte balance and defend against 'Loo' winds.\n"
                    f"5. **Temperature Check:** Drink cool (15–20°C) water rather than freezing ice water to maximize gastrointestinal absorption and avoid vascular shock.\n"
                    f"6. **Avoid:** Dark teas, strong coffee, carbonated sugary sodas, and alcohol, as they trigger diuresis and accelerate dehydration."
                ),
                "suggested_questions": [
                    "Can I drink cold water immediately after coming from outside?",
                    "What work-rest cycle should outdoor workers follow?",
                    "How to keep infants and children hydrated?"
                ],
                "safety_tier": current_risk,
                "emergency_call": False,
                "model_used": "biomet-expert-engine"
            }

        # 4. Vulnerable Populations (Elderly, Kids, Pregnant)
        if any(w in q for w in ["child", "kid", "baby", "infant", "elderly", "senior", "pregnant", "vulnerable", "old", "bacha", "bache", "bujurg", "dadaji", "nanaji", "maa"]):
            return {
                "reply": (
                    f"👵 **Vulnerable Demographic Heat Defense for {current_loc}**\n\n"
                    f"Conditions in {current_loc} are currently **{current_temp:.1f}°C** ({current_risk} Risk). High-risk individuals experience rapid thermoregulatory failure under these temperatures.\n\n"
                    "👶 **Children & Infants:**\n"
                    "• Never leave children unattended in parked vehicles even for a minute (cabin temperature climbs by 1°C per minute).\n"
                    "• Dress infants in light, breathable cotton; offer breastmilk or water more frequently.\n"
                    "• Avoid outdoor playground activities between 11:00 AM and 4:30 PM.\n\n"
                    "👵 **Elderly Citizens (60+):**\n"
                    "• Sensation of thirst diminishes with age; remind elderly family members to drink water every 45 minutes.\n"
                    "• Monitor blood pressure closely if taking diuretics, ACE inhibitors, or beta-blockers.\n"
                    "• Keep indoor living spaces cool using damp curtains, cross-ventilation, or cooling centers.\n\n"
                    "🤰 **Pregnant Women:**\n"
                    "• High ambient heat increases risk of dehydration-triggered contractions and heat exhaustion.\n"
                    "• Rest in air-cooled or shaded environments and elevate legs to reduce heat-induced peripheral edema."
                ),
                "suggested_questions": [
                    "What room temperature is safe for elderly citizens?",
                    "What are early signs of heat illness in babies?",
                    "Emergency cooling techniques for high fever in heatwaves"
                ],
                "safety_tier": current_risk,
                "emergency_call": False,
                "model_used": "biomet-expert-engine"
            }

        # 5. Occupational & Labor Safety (WBGT Work-Rest Cycles)
        if any(w in q for w in ["work", "rest", "labor", "worker", "shift", "construction", "outdoor", "wbgt", "job"]):
            cycle_text = (
                "15 minutes work / 45 minutes active shaded rest per hour"
                if current_temp >= 39
                else "30 minutes work / 30 minutes shaded rest per hour"
                if current_temp >= 36
                else "45 minutes work / 15 minutes rest per hour"
            )
            return {
                "reply": (
                    f"⚒️ **Occupational Heat Safety Schedule for {current_loc} (ISO 7243 WBGT Standards)**\n\n"
                    f"Current thermal conditions: **{current_temp:.1f}°C** (Estimated WBGT: **{max(24.0, current_temp - 5.0):.1f}°C**, {current_risk} Heat Risk).\n\n"
                    f"1. **Prescribed WBGT Work-Rest Ratio:** Follow **{cycle_text}** for moderate-to-heavy physical labor.\n"
                    f"2. **Mandatory Shaded Break Areas:** Provide rest stations shielded from direct solar radiation with active airflow or misting fans.\n"
                    f"3. **Hydration Deployment:** Keep potable drinking water mixed with electrolytes within 50 meters of active workstations.\n"
                    f"4. **Shift Re-scheduling:** Stagger heavy tasks to cooler hours (06:00 AM - 10:30 AM and after 04:30 PM).\n"
                    f"5. **Buddy Monitoring:** Workers must watch partners for sluggish movement, uncoordinated motor skills, or cessation of sweating."
                ),
                "suggested_questions": [
                    "What are OSHA and NDMA work-rest requirements?",
                    "How to prepare emergency ORS stations at job sites?",
                    "What to do if a laborer feels faint on duty?"
                ],
                "safety_tier": current_risk,
                "model_used": "biomet-expert-engine"
            }

        # 6. Municipal & Administrative Action Plans
        if any(w in q for w in ["municipal", "government", "action plan", "official", "city", "shelter", "cooling center", "ward", "hap"]):
            return {
                "reply": (
                    f"🏛️ **Municipal Heat Action Directive for {current_loc}**\n\n"
                    f"Active Risk Classification: **{current_risk}** (Ambient: **{current_temp:.1f}°C**)\n\n"
                    + MUNICIPAL_INTERVENTIONS_GUIDE
                    + "\n\n📋 *Coordination Notice:* Ensure emergency power backup for critical hospital cooling units and distribute public advisories across local FM radio, WhatsApp citizen channels, and transit display boards."
                ),
                "suggested_questions": [
                    "How to set up emergency cooling shelters?",
                    "Standard protocol for hospital Heatstroke Units",
                    "Criteria for issuing Red Alert heatwave notifications"
                ],
                "safety_tier": current_risk,
                "model_used": "biomet-expert-engine"
            }

        # 7. General / Fallback Synthesis
        return {
            "reply": (
                f"🌡️ **Dr. ThermoShield Biometeorological Assessment for {current_loc}**\n\n"
                f"Conditions are currently at **{current_temp:.1f}°C** with **{current_rh:.0f}% relative humidity**, generating a thermal strain index of **{hi_str}** ({current_risk} Risk).\n\n"
                f"• **Key Safety Directive:** Limit direct sunlight exposure between 11:30 AM and 04:00 PM when solar ultraviolet and thermal loads peak.\n"
                f"• **Personal Hydration:** Drink at least 250–300 mL of water every 30 minutes, supplemented with electrolytes or natural citrus fluids.\n"
                f"• **Clothing Advice:** Wear loose-fitting, light-colored, breathable cotton clothing and a wide-brimmed hat or UV-blocking umbrella.\n"
                f"• **Vigilance:** Watch for early heat exhaustion indicators: excessive sweating, dizziness, nausea, headache, or fast heartbeat."
            ),
            "suggested_questions": [
                "How much water should I drink today?",
                "What are heat exhaustion warning signs?",
                "What work-rest cycle is safe right now?"
            ],
            "safety_tier": current_risk,
            "model_used": "biomet-expert-engine"
        }

    async def get_copilot_response(
        self,
        query: str,
        location: Optional[str] = None,
        temperature_c: Optional[float] = None,
        humidity: Optional[float] = None,
        risk_level: Optional[str] = None,
        risk_score: Optional[float] = None,
        user_role: Optional[str] = "citizen",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates Copilot response:
        1. Intelligently resolves location: checks if user query asks about a specific city
           (Delhi, Jaipur, Lucknow, Kolkata, etc.). If so, fetches real-time Open-Meteo telemetry!
        2. Checks for Gemini API key (from request payload, GEMINI_API_KEY, or GOOGLE_API_KEY).
        3. If key exists, attempts frontier LLM generation (gemini-2.0-flash / 1.5-flash).
        4. Falls back gracefully to dynamic biometeorological synthesis engine.
        """
        # 1. Resolve true target location & live weather telemetry
        resolved_loc, res_temp, res_rh, res_risk, extra_w, is_query_loc = await self._resolve_telemetry(
            query=query,
            passed_location=location,
            passed_temp=temperature_c,
            passed_humidity=humidity,
            passed_risk=risk_level
        )

        weather_desc = extra_w.get("description")
        forecast_hint = None
        f_max = extra_w.get("forecast", {}).get("temperature_max", [])
        if len(f_max) > 1:
            forecast_hint = f"Tomorrow forecast max: {f_max[1]:.1f}°C"

        system_context = self._build_context_summary(
            location=resolved_loc,
            temp=res_temp,
            humidity=res_rh,
            risk_level=res_risk,
            risk_score=risk_score,
            role=user_role,
            weather_desc=weather_desc
        )
        if forecast_hint:
            system_context += f" | {forecast_hint}"

        resolved_telemetry_dict = {
            "temp": res_temp,
            "humidity": res_rh,
            "apparent_temperature": extra_w.get("apparent_temperature", res_temp),
            "weather_description": weather_desc or "Clear Sky",
            "risk_level": res_risk,
            "latitude": extra_w.get("latitude"),
            "longitude": extra_w.get("longitude"),
            "is_query_location": is_query_loc
        }

        # 2. Attempt Gemini Frontier LLM
        gemini_result = await self._call_gemini_api(
            prompt=query,
            system_context=system_context,
            conversation_history=conversation_history,
            custom_key=api_key
        )

        if gemini_result and gemini_result.get("reply"):
            reply_text = gemini_result["reply"]
            is_emergency = any(
                w in query.lower() or w in reply_text.lower()
                for w in ["heat stroke", "stroke", "unconscious", "collapse", "collapsed", "emergency ambulance", "call 108", "call 112", "faint", "behosh", "seizure"]
            )
            return {
                "reply": reply_text,
                "suggested_questions": [
                    f"What hydration rate matches my activity in {resolved_loc.split(',')[0]}?",
                    "What are warning signs of heat exhaustion?",
                    "What work-rest break schedule should I follow?"
                ],
                "safety_tier": "EMERGENCY" if is_emergency else res_risk,
                "emergency_call": is_emergency,
                "model_used": gemini_result.get("model", "gemini-3.6-flash"),
                "is_gemini": True,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved_location": resolved_loc,
                "resolved_telemetry": resolved_telemetry_dict
            }

        # 3. Dynamic Domain Expert Synthesis Engine
        expert_res = self._expert_rule_engine(
            query=query,
            location=resolved_loc,
            temp=res_temp,
            humidity=res_rh,
            risk_level=res_risk,
            risk_score=risk_score,
            role=user_role,
            extra_weather=extra_w
        )
        expert_res["is_gemini"] = False
        expert_res["timestamp"] = datetime.now(timezone.utc).isoformat()
        expert_res["resolved_location"] = resolved_loc
        expert_res["resolved_telemetry"] = resolved_telemetry_dict
        return expert_res


# Global singleton instance
copilot_engine = ThermoShieldCopilot()
