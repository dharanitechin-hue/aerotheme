from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.gemini_copilot import ask_copilot

router = APIRouter(prefix="/api/ai", tags=["ai-copilot"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    AeroTwin-X AI Copilot chat endpoint.

    Combines the engineer's question with the CURRENT live engine state
    (the existing simulation/digital-twin controller is the single source
    of truth — no separate simulation is created here) and forwards it to
    Gemini through the secure backend layer. The Gemini API key never
    leaves the backend.
    """
    from app.main import controller
    reply = await ask_copilot(req.message, controller.latest_state)
    return ChatResponse(response=reply)
