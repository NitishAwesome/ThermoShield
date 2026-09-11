import os
import re
import json
import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import httpx

logger = logging.getLogger(__name__)

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

    def _build_context_summary(
        self,
        location: Optional[str],
        temp: Optional[float],
        humidity: Optional[float],
        risk_level: Optional[str],
        risk_score: Optional[float],
        role: Optional[str]
    ) -> str:
        ctx_parts = []
        if location:
            ctx_parts.append(f"Location: {location}")
        if temp is not None:
            ctx_parts.append(f"Ambient Temperature: {temp:.1f}°C")
        if humidity is not None:
            ctx_parts.append(f"Humidity: {humidity:.0f}%")
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
            "for the ThermoShield Early Warning System (SIH26083). Ground your responses in IMD, NDMA, and WHO biometeorological guidelines.\n\n"
            f"Active Environmental Context: {system_context}\n\n"
            "Style Guidelines:\n"
            "1. Address the user's specific question directly with clear, engaging, conversational language.\n"
            "2. Use structured markdown: bold headings, bullet points, and exact numbers (e.g. mL of water, minutes of rest, specific temperature thresholds).\n"
            "3. If severe heat illness or heat stroke is suspected (temp > 40°C, delirium, stopped sweating), prioritize emergency cooling and dialing 108/112 immediately.\n"
            "4. Keep answers concise, highly practical, and easy to read on mobile devices."
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

        # Try 2.0-flash first, then 1.5-flash
        models_to_try = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]

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
        role: Optional[str]
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

        # 1. Heat Emergency / Heat Stroke
        if any(w in q for w in ["stroke", "exhaustion", "emergency", "faint", "unconscious", "first aid", "cramps", "sick", "vomit", "collapse"]):
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
                "model_used": "biomet-expert-engine"
            }

        # 2. Hydration & Fluids
        if any(w in q for w in ["water", "drink", "hydration", "dehydration", "ors", "electrolyte", "thirst", "cold water"]):
            fluid_amount = "500 mL every 20-25 minutes" if current_temp >= 38 else "250-300 mL every 30 minutes"
            daily_target = "3.5 to 4.5 Liters" if current_temp >= 38 else "3.0 Liters"
            return {
                "reply": (
                    f"💧 **Personalized Hydration Advisory for {current_loc}**\n\n"
                    f"Current environmental load: **{current_temp:.1f}°C** with **{current_rh:.0f}% humidity** (Heat Index: **{hi_str}**).\n\n"
                    f"1. **Active Intake Rate:** Consume **{fluid_amount}** while active or working outdoors.\n"
                    f"2. **Daily Baseline Volume:** Target at least **{daily_target}** of fluids across the day, drinking ahead of thirst cues.\n"
                    f"3. **Electrolyte Strategy:** Sweat depletes sodium and potassium. Mix 1 sachet of **Oral Rehydration Salts (ORS)** in 1L of water, or drink coconut water / lemon water with rock salt.\n"
                    f"4. **Temperature Check:** Drink cool (15–20°C) water rather than freezing ice water to maximize gastrointestinal absorption and avoid vascular shock.\n"
                    f"5. **Avoid:** Dark teas, strong coffee, carbonated sugary sodas, and alcohol, as they trigger diuresis and deplete intracellular volume."
                ),
                "suggested_questions": [
                    "Can I drink cold water immediately after coming from outside?",
                    "What work-rest cycle should outdoor workers follow?",
                    "How to keep infants and children hydrated?"
                ],
                "safety_tier": current_risk,
                "model_used": "biomet-expert-engine"
            }

        # 3. Vulnerable Populations (Elderly, Kids, Pregnant)
        if any(w in q for w in ["child", "kid", "baby", "infant", "elderly", "senior", "pregnant", "vulnerable", "old"]):
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
                "model_used": "biomet-expert-engine"
            }

        # 4. Occupational & Labor Safety (WBGT Work-Rest Cycles)
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

        # 5. Municipal & Administrative Action Plans
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

        # 6. General / Fallback Synthesis
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
        1. Checks for Gemini API key (from request payload, GEMINI_API_KEY, or GOOGLE_API_KEY).
        2. If key exists, attempts frontier LLM generation (gemini-2.0-flash / 1.5-flash).
        3. Falls back gracefully to dynamic biometeorological synthesis engine.
        """
        system_context = self._build_context_summary(
            location=location,
            temp=temperature_c,
            humidity=humidity,
            risk_level=risk_level,
            risk_score=risk_score,
            role=user_role
        )

        # 1. Attempt Gemini Frontier LLM
        gemini_result = await self._call_gemini_api(
            prompt=query,
            system_context=system_context,
            conversation_history=conversation_history,
            custom_key=api_key
        )

        if gemini_result and gemini_result.get("reply"):
            return {
                "reply": gemini_result["reply"],
                "suggested_questions": [
                    "What hydration rate matches my activity level?",
                    "What are warning signs of heat exhaustion?",
                    "What work-rest break schedule should I follow?"
                ],
                "safety_tier": (risk_level or "MODERATE").upper(),
                "model_used": gemini_result.get("model", "gemini-2.0-flash"),
                "is_gemini": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # 2. Dynamic Domain Expert Synthesis Engine
        expert_res = self._expert_rule_engine(
            query=query,
            location=location,
            temp=temperature_c,
            humidity=humidity,
            risk_level=risk_level,
            risk_score=risk_score,
            role=user_role
        )
        expert_res["is_gemini"] = False
        expert_res["timestamp"] = datetime.now(timezone.utc).isoformat()
        return expert_res


# Global singleton instance
copilot_engine = ThermoShieldCopilot()
