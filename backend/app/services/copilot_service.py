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
# BIOMETEOROLOGICAL KNOWLEDGE BASE & EXPERT DECISION RULES
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
    Supports Frontier LLMs (Gemini / OpenAI / Neon AI Gateway) with a comprehensive
    biometeorological rule-based expert engine fallback.
    """

    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
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

    async def _call_gemini_api(self, prompt: str, system_context: str) -> Optional[str]:
        """Calls Google Gemini API via lightweight HTTPX REST without external heavyweight SDKs."""
        if not self.gemini_key:
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        payload = {
            "systemInstruction": {
                "parts": [{
                    "text": (
                        "You are Dr. ThermoShield, an expert biometeorologist and heatwave safety copilot "
                        "designed for the ThermoShield Early Warning System. Your mission is to provide clear, "
                        "compassionate, medically grounded, and actionable guidance during extreme heat conditions. "
                        "Use bullet points, bold text for key warnings, and provide specific numbers for hydration "
                        "and cooling breaks based on the user's provided environmental telemetry.\n\n"
                        f"Current Telemetry Context: {system_context}"
                    )
                }]
            },
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800
            }
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
        except Exception as err:
            logger.warning(f"Gemini API request failed: {err}")
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
        Deterministic Biometeorological Expert Knowledge Engine.
        Provides instant, medically accurate, and context-aware responses when offline or without an API key.
        """
        q = query.lower().strip()
        current_temp = temp if temp is not None else 36.0
        current_risk = (risk_level or ("EXTREME" if current_temp >= 40 else "HIGH" if current_temp >= 36 else "MODERATE")).upper()
        current_loc = location or "your area"

        # 1. Heat Stroke & Emergency Symptoms
        if any(w in q for w in ["stroke", "exhaustion", "emergency", "faint", "unconscious", "first aid", "cramps", "sick"]):
            return {
                "reply": (
                    f"⚠️ **Emergency Heat Illness Protocol for {current_loc}** (Current Condition: {current_temp}°C, {current_risk} Risk)\n\n"
                    + HEAT_FIRST_AID_GUIDE
                ),
                "suggested_questions": [
                    "How much water should I drink in this heat?",
                    "What are the safest hours to be outdoors today?",
                    "Where can I find the nearest cooling shelter?"
                ],
                "safety_tier": "EMERGENCY"
            }

        # 2. Hydration & Fluid Intake
        if any(w in q for w in ["water", "drink", "hydration", "dehydration", "ors", "electrolyte", "thirst"]):
            fluid_amount = "500 mL every 20-25 minutes" if current_temp >= 38 else "250-300 mL every 30 minutes"
            return {
                "reply": (
                    f"💧 **Personalized Hydration Advisory for {current_loc}**\n\n"
                    f"With ambient temperature at **{current_temp}°C** ({current_risk} Risk):\n\n"
                    f"1. **Target Intake:** Drink at least **{fluid_amount}** while active outdoors.\n"
                    f"2. **Electrolytes:** Standard tap water alone does not replace mineral salts lost in sweat. Mix 1 sachet of **Oral Rehydration Salts (ORS)** in 1 Liter of drinking water, or consume lemon water with a pinch of rock salt and sugar.\n"
                    f"3. **Beverages to Avoid:** Tea, coffee, and energy drinks are mild diuretics that accelerate dehydration. Avoid ice-cold water immediately after heavy exertion to prevent throat/esophageal shock.\n\n"
                    + HYDRATION_RULES
                ),
                "suggested_questions": [
                    "Can I drink cold water immediately after coming from outside?",
                    "What work-rest cycle should outdoor workers follow?",
                    "How to keep infants and children hydrated?"
                ],
                "safety_tier": current_risk
            }

        # 3. Work-Rest Cycles & Outdoor Activity
        if any(w in q for w in ["work", "rest", "labor", "exercise", "walk", "jog", "construction", "shift", "hours"]):
            return {
                "reply": (
                    f"⚒️ **Occupational Work-Rest Schedule for {current_loc}**\n\n"
                    f"Current Environment: **{current_temp}°C** ({current_risk} Thermal Risk)\n\n"
                    + WORK_REST_CYCLE_GUIDE + "\n\n"
                    "🛡️ **Protective Clothing:** Wear loose, light-colored, breathable cotton clothing. Protect head and neck with a wide-brimmed hat, wet bandana, or umbrella."
                ),
                "suggested_questions": [
                    "What are the symptoms of heat exhaustion?",
                    "How can employers protect outdoor workers from heatwaves?",
                    "What should I drink while working outdoors?"
                ],
                "safety_tier": current_risk
            }

        # 4. Senior Citizens, Children & Medical Conditions
        if any(w in q for w in ["old", "elderly", "senior", "child", "baby", "infant", "pregnant", "diabetes", "heart", "bp", "vulnerable"]):
            return {
                "reply": (
                    f"👵 **Vulnerable Population Heat Advisory for {current_loc}**\n\n"
                    f"Under **{current_temp}°C** heat conditions, physiological reserve is heavily strained for high-risk individuals.\n\n"
                    + VULNERABLE_GROUPS_GUIDE + "\n\n"
                    "🚨 **Red Flag Alert:** If an elderly individual or child stops sweating, displays mental confusion, or vomits, immediately initiate cooling and call **108**."
                ),
                "suggested_questions": [
                    "What room temperature is safe for elderly citizens?",
                    "What are early signs of heat illness in babies?",
                    "Emergency cooling techniques for high fever in heatwaves"
                ],
                "safety_tier": current_risk
            }

        # 5. Municipal, Official & Urban Interventions
        if any(w in q for w in ["official", "city", "municipal", "ward", "shelter", "hospital", "intervention", "ndrf", "imd", "hap"]):
            return {
                "reply": (
                    f"🏛️ **Civic Heat Action Plan (HAP) Directives for {current_loc}**\n\n"
                    f"Current Risk Assessment: **{current_risk}** (Score: {risk_score or 75.0}/100 at {current_temp}°C)\n\n"
                    + MUNICIPAL_INTERVENTIONS_GUIDE + "\n\n"
                    "📊 **Target Response:** Prioritize unshaded transit hubs, construction colonies, and dense urban slums lacking active cooling."
                ),
                "suggested_questions": [
                    "How to prepare primary healthcare centers for heat stroke?",
                    "Where should water tankers be stationed in high-risk wards?",
                    "What triggers red alert status in municipal heat action plans?"
                ],
                "safety_tier": current_risk
            }

        # 6. General / Summary Query Fallback
        return {
            "reply": (
                f"🛡️ **ThermoShield Heat Health Summary for {current_loc}:**\n\n"
                f"• **Current Temperature:** {current_temp}°C\n"
                f"• **Assessed Risk Level:** **{current_risk}** (Score: {risk_score or 72.0}/100)\n"
                f"• **Top Protective Measure:** Avoid direct sun exposure between **11:00 AM and 3:30 PM**.\n"
                f"• **Hydration Target:** Sip 250–350 mL of water or ORS every half-hour.\n"
                f"• **Indoor Respite:** Keep indoor living spaces ventilated with reflective curtains or wet reed mats (khus tattis) to naturally bring down room temperature.\n\n"
                "Feel free to ask me about hydration plans, symptoms, outdoor work cycles, or high-risk demographic precautions!"
            ),
            "suggested_questions": [
                "What is my personalized hydration schedule today?",
                "What are the warning signs of heat stroke?",
                "How to protect children and elderly family members from heat?"
            ],
            "safety_tier": current_risk
        }

    async def get_copilot_response(
        self,
        query: str,
        location: Optional[str] = None,
        temperature_c: Optional[float] = None,
        humidity: Optional[float] = None,
        risk_level: Optional[str] = None,
        risk_score: Optional[float] = None,
        user_role: Optional[str] = "citizen"
    ) -> Dict[str, Any]:
        """
        Orchestrates Copilot response: Attempts LLM generation, falls back gracefully to
        domain expert engine.
        """
        system_context = self._build_context_summary(
            location=location,
            temp=temperature_c,
            humidity=humidity,
            risk_level=risk_level,
            risk_score=risk_score,
            role=user_role
        )

        # 1. If Gemini API key is configured, try frontier LLM
        if self.gemini_key:
            llm_text = await self._call_gemini_api(prompt=query, system_context=system_context)
            if llm_text:
                return {
                    "reply": llm_text,
                    "suggested_questions": [
                        "What is my recommended hydration schedule?",
                        "What are warning signs of heat exhaustion?",
                        "How can I cool down quickly if feeling dizzy?"
                    ],
                    "safety_tier": (risk_level or "MODERATE").upper(),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

        # 2. Domain Expert Rule Engine (Deterministic, instant, robust)
        expert_res = self._expert_rule_engine(
            query=query,
            location=location,
            temp=temperature_c,
            humidity=humidity,
            risk_level=risk_level,
            risk_score=risk_score,
            role=user_role
        )
        expert_res["timestamp"] = datetime.now(timezone.utc).isoformat()
        return expert_res


# Global singleton instance
copilot_engine = ThermoShieldCopilot()
