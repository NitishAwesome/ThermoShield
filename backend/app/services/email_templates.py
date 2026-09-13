"""
ThermoShield Action-First HTML Email Advisory Templates
Structured RFC 5322 compliant templates answering:
1. WHAT IS HAPPENING?
2. WHY DOES IT MATTER?
3. WHAT SHOULD I DO RIGHT NOW?
"""

from typing import List, Optional
from datetime import datetime

def generate_action_first_alert_html(
    location_name: str,
    risk_level: str,
    risk_score: float,
    temperature_c: float,
    wbgt_c: Optional[float] = None,
    heat_index_c: Optional[float] = None,
    transition_type: Optional[str] = None,
    recommended_actions: Optional[List[str]] = None,
    recipient_email: Optional[str] = None,
    custom_note: Optional[str] = None,
) -> str:
    level = (risk_level or "HIGH").upper().strip()
    is_extreme = level == "EXTREME"

    # Dynamic badge & border colors
    primary_color = "#ef4444" if is_extreme else "#f97316"
    bg_tint = "rgba(239, 68, 68, 0.12)" if is_extreme else "rgba(249, 115, 22, 0.10)"
    border_color = "#ef4444" if is_extreme else "#f97316"

    # Default actions tailored to WBGT & physiological heat balance
    if not recommended_actions:
        if is_extreme:
            recommended_actions = [
                "Mandatory Work-Rest: Rest 45 minutes for every 15 minutes of light outdoor activity.",
                "Hydration: Drink 250mL (1 glass) of water or ORS electrolyte solution every 15-20 minutes.",
                "Shelter: Seek designated civic cooling centers or air-conditioned public spaces immediately.",
                "Vulnerable Vigilance: Check immediately on children, older adults, and outdoor workers."
            ]
        else:
            recommended_actions = [
                "Work-Rest Advisory: Take 15-minute shaded cooling breaks every 45 minutes of exertion.",
                "Hydration: Maintain continuous hydration (at least 500mL per hour); avoid caffeine and sugary drinks.",
                "Sun Avoidance: Minimize direct solar exposure between 12:00 PM and 3:30 PM.",
                "Ventilation: Wear loose-fitting, light-colored cotton clothing and wide-brimmed protection."
            ]

    actions_html = "".join([
        f"""<li style="margin-bottom: 10px; color: #f1f5f9; font-size: 14px; line-height: 1.5;">
            <strong style="color: #38bdf8;">•</strong> {action}
        </li>"""
        for action in recommended_actions
    ])

    transition_badge = ""
    if transition_type:
        transition_badge = f"""
        <div style="display: inline-block; background-color: {primary_color}; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.5px; margin-bottom: 10px;">
            ⚠️ {transition_type}
        </div>
        """

    wbgt_pill = ""
    if wbgt_c is not None:
        wbgt_pill = f"""<span style="background: #1e293b; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #e2e8f0;">
            🌐 WBGT: <strong style="color: {primary_color};">{wbgt_c:.1f}°C</strong>
        </span>"""

    heat_index_pill = ""
    if heat_index_c is not None:
        heat_index_pill = f"""<span style="background: #1e293b; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #e2e8f0;">
            🔥 Heat Index: <strong style="color: #f59e0b;">{heat_index_c:.1f}°C</strong>
        </span>"""

    now_str = datetime.utcnow().strftime("%d %b %Y • %H:%M UTC")

    why_it_matters_text = (
        "Human thermoregulation is critically impaired. At this combination of high heat and moisture, "
        "sweat cannot evaporate effectively from skin, leading rapidly to heat exhaustion, muscle cramping, or fatal heatstroke."
        if is_extreme else
        "Prolonged physical activity or unshaded exposure creates high cardiovascular and thermal strain. "
        "Dehydration occurs rapidly, increasing the incidence of acute heat stress."
    )

    custom_note_block = ""
    if custom_note:
        custom_note_block = f"""
        <div style="background: #1e293b; border-left: 3px solid #38bdf8; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #cbd5e1;">
            <strong>Civic Dispatch Note:</strong> {custom_note}
        </div>
        """

    recipient_footer = f"Dispatched to registered citizen: <strong style='color: #cbd5e1;'>{recipient_email}</strong> • " if recipient_email else ""

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ThermoShield Early Warning Advisory</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,0.6);">
    
    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 22px 24px; border-bottom: 1px solid #334155;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #f97316; letter-spacing: -0.5px;">
            🛡️ ThermoShield Early Warning
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
            Automated Biometeorological Citizen Heat Defense Network
          </p>
        </div>
      </div>
    </div>

    <!-- MAIN BODY -->
    <div style="padding: 24px;">
      
      <!-- 1. WHAT IS HAPPENING -->
      <div style="background-color: {bg_tint}; border-left: 4px solid {border_color}; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
        {transition_badge}
        <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #f8fafc;">
          {level} Thermal Hazard Triggered for {location_name}
        </h2>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #cbd5e1;">
          Issued at {now_str} based on real-time biometeorological telemetry.
        </p>

        <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
          <span style="background: #1e293b; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #e2e8f0;">
            🌡️ Air Temp: <strong>{temperature_c:.1f}°C</strong>
          </span>
          {wbgt_pill}
          {heat_index_pill}
          <span style="background: #1e293b; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: #e2e8f0;">
            ⚡ Threat Index: <strong style="color: {primary_color};">{risk_score:.0f}/100</strong>
          </span>
        </div>
      </div>

      <!-- 2. WHY DOES IT MATTER -->
      <div style="background-color: #1e293b; border-radius: 10px; padding: 16px; margin-bottom: 20px; border: 1px solid #334155;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px;">
          ⚠️ Why This Matters (Physiological Impact)
        </h3>
        <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
          {why_it_matters_text}
        </p>
      </div>

      <!-- 3. WHAT SHOULD I DO NOW -->
      <div style="background-color: #1e293b; border-radius: 10px; padding: 18px; margin-bottom: 20px; border: 1px solid #334155;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #38bdf8;">
          📋 Mandatory Safety Actions & Work-Rest Cycles
        </h3>
        <ul style="margin: 0; padding-left: 18px;">
          {actions_html}
        </ul>
      </div>

      {custom_note_block}

      <!-- EMERGENCY CONTACTS -->
      <div style="background: rgba(56, 189, 248, 0.08); border: 1px dashed #0284c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; color: #7dd3fc;">
          🚨 <strong>Emergency Assistance:</strong> In case of dizziness, cessation of sweating, or confusion, call National Emergency <strong>108 / 112</strong> immediately and move the person into shade.
        </p>
      </div>

      <!-- FOOTER NOTE -->
      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 14px;">
        {recipient_footer}
        You are receiving this automated alert because your area is monitored under the ThermoShield Civic Defense Network.
      </p>
    </div>

    <!-- SUB-FOOTER -->
    <div style="background-color: #0b1120; padding: 12px 24px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #475569;">
      © 2026 ThermoShield • AI-Powered Human Thermal Stress & Heatwave Early Warning System
    </div>
  </div>
</body>
</html>"""
