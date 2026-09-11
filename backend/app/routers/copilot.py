import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.copilot_service import copilot_engine

logger = logging.getLogger(__name__)

router = APIRouter()

class CopilotChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1500, description="Natural language user question or query")
    location: Optional[str] = Field(None, description="Current monitored location or ward")
    temperature_c: Optional[float] = Field(None, description="Current ambient temperature in Celsius")
    humidity: Optional[float] = Field(None, description="Current relative humidity percentage")
    risk_level: Optional[str] = Field(None, description="Current calculated risk tier (LOW, MODERATE, HIGH, EXTREME)")
    risk_score: Optional[float] = Field(None, description="Current calculated risk score (0-100)")
    user_role: Optional[str] = Field("citizen", description="User persona (citizen, official, responder, analyst)")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=[], description="Previous conversation turns [{'role': 'user'|'model', 'text': '...'}]")
    api_key: Optional[str] = Field(None, description="Optional Google Gemini API key passed from client")


class CopilotChatResponse(BaseModel):
    reply: str
    suggested_questions: List[str] = []
    safety_tier: str
    timestamp: str
    model_used: Optional[str] = "gemini-2.0-flash"
    is_gemini: Optional[bool] = False


@router.post("/chat", response_model=CopilotChatResponse)
async def chat_with_copilot(payload: CopilotChatRequest):
    """
    Interact with Dr. ThermoShield AI Copilot.
    Provides context-aware biometeorological guidance, hydration schedules, work-rest cycles,
    vulnerable demographic protocols, and emergency heat illness first aid.
    """
    clean_msg = payload.message.strip()
    if not clean_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    try:
        response_data = await copilot_engine.get_copilot_response(
            query=clean_msg,
            location=payload.location,
            temperature_c=payload.temperature_c,
            humidity=payload.humidity,
            risk_level=payload.risk_level,
            risk_score=payload.risk_score,
            user_role=payload.user_role,
            conversation_history=payload.conversation_history,
            api_key=payload.api_key
        )
        return CopilotChatResponse(**response_data)
    except Exception as exc:
        logger.error(f"Error in copilot chat handling: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating AI Copilot advisory."
        )


@router.get("/health")
def copilot_health():
    """Health check for Copilot service."""
    copilot_engine._refresh_keys()
    return {
        "status": "healthy",
        "llm_enabled": bool(copilot_engine.gemini_key or copilot_engine.openai_key),
        "default_model": "gemini-2.0-flash",
        "engine": "ThermoShield-Gemini-Biometeorological-Copilot-v2"
    }
