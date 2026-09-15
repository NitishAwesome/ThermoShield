import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.copilot_service import copilot_engine
from app.services.rag_service import rag_engine

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
    latitude: Optional[float] = Field(None, description="Optional client coordinates latitude")
    longitude: Optional[float] = Field(None, description="Optional client coordinates longitude")


class CopilotChatResponse(BaseModel):
    reply: str
    suggested_questions: List[str] = []
    safety_tier: str
    timestamp: str
    model_used: Optional[str] = "gemini-2.0-flash"
    is_gemini: Optional[bool] = False
    emergency_call: Optional[bool] = False
    resolved_location: Optional[str] = None
    resolved_telemetry: Optional[Dict[str, Any]] = None
    rag_sources: Optional[List[str]] = Field(default=[], description="Authoritative RAG documents and standards utilized")
    grounded_authority: Optional[str] = Field(default="NDMA / IMD / WHO Guidelines", description="Primary regulatory standard")


class TrainKnowledgeRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, description="Title of the guidance / document")
    authority: str = Field("Municipal Heat Action Plan", min_length=2, max_length=200, description="Authoritative source or organization")
    category: str = Field("general", description="Category: hydration, work_rest, vulnerable, first_aid, remedies, hap, imd_criteria, general")
    content: str = Field(..., min_length=15, description="Full markdown or text advisory content")
    keywords: Optional[List[str]] = Field(default=[], description="Search keywords / synonyms")
    priority: Optional[int] = Field(1, ge=1, le=3, description="Priority weight (1=normal, 2=high, 3=emergency)")


class TrainKnowledgeResponse(BaseModel):
    status: str
    message: str
    chunk_id: str
    total_corpus_chunks: int
    authority: str
    category: str


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
            api_key=payload.api_key,
            latitude=payload.latitude,
            longitude=payload.longitude
        )
        return CopilotChatResponse(**response_data)
    except Exception as exc:
        logger.error(f"Error in copilot chat handling: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating AI Copilot advisory."
        )


@router.post("/train", response_model=TrainKnowledgeResponse)
def train_knowledge_corpus(payload: TrainKnowledgeRequest):
    """
    Train and ingest new domain knowledge into Dr. ThermoShield's active RAG knowledge base.
    Persists data to disk so new municipal guidelines, heat action plans, or local advisories
    are immediately retrievable.
    """
    try:
        chunk = rag_engine.train_from_text(
            title=payload.title,
            authority=payload.authority,
            category=payload.category,
            content=payload.content,
            keywords=payload.keywords,
            priority=payload.priority or 1
        )
        return TrainKnowledgeResponse(
            status="success",
            message=f"Successfully ingested and indexed: {chunk.title}",
            chunk_id=chunk.chunk_id,
            total_corpus_chunks=len(rag_engine.corpus),
            authority=chunk.authority,
            category=chunk.category
        )
    except Exception as e:
        logger.error(f"Failed to train knowledge chunk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest knowledge: {str(e)}"
        )


@router.get("/knowledge")
def list_knowledge_corpus():
    """Returns summary metadata of all ingested knowledge chunks."""
    chunks = rag_engine.get_all_chunks()
    return {
        "total_chunks": len(chunks),
        "chunks": chunks
    }


@router.delete("/knowledge/{chunk_id}")
def delete_knowledge_chunk(chunk_id: str):
    """Deletes a custom trained knowledge chunk."""
    success = rag_engine.delete_knowledge_chunk(chunk_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Custom chunk '{chunk_id}' not found or is a protected core chunk."
        )
    return {
        "status": "success",
        "message": f"Chunk '{chunk_id}' deleted successfully.",
        "remaining_chunks": len(rag_engine.corpus)
    }


@router.get("/health")
def copilot_health():
    """Health check for Copilot service."""
    copilot_engine._refresh_keys()
    return {
        "status": "healthy",
        "llm_enabled": bool(copilot_engine.gemini_key or copilot_engine.openai_key),
        "rag_enabled": True,
        "default_model": "gemini-2.0-flash",
        "total_rag_chunks": len(rag_engine.corpus),
        "engine": "ThermoShield-Gemini-RAG-Biometeorological-Copilot-v3"
    }
