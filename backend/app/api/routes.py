from io import BytesIO

from fastapi import APIRouter, File, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from app.services.grading import assess_crop
from app.services.assistant import generate_reply
from app.core.config import settings
from app.services.marketplace import choose_market

router = APIRouter(prefix="/api", tags=["agrisahayak"])


class VoiceRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    language: str = Field(default="Hindi", max_length=30)


class RouteRequest(BaseModel):
    grade: str = Field(min_length=1, max_length=2)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "agrisahayak-api", "ai_mode": "cloud-or-fallback"}


@router.post("/grade")
async def grade_crop(image: UploadFile = File(...)) -> dict[str, object]:
    try:
        crop_image = Image.open(BytesIO(await image.read()))
        assessment = assess_crop(crop_image)
    except (UnidentifiedImageError, OSError) as error:
        return {"error": f"The uploaded file is not a valid image: {error}"}

    route = choose_market(assessment.grade, assessment.confidence)
    return {
        "filename": image.filename or "crop-image",
        **assessment.__dict__,
        "destination": route.destination,
        "buyer_types": route.buyer_types,
    }


@router.post("/voice")
def voice_assistant(request: VoiceRequest) -> dict[str, str]:
    reply, provider = generate_reply(
        request.message,
        request.language,
        settings.ai_api_url,
        settings.ai_api_key,
        settings.ai_model,
        settings.ollama_url,
        settings.ollama_model,
    )
    return {
        "language": request.language,
        "reply": reply,
        "next_action": "Upload a crop photo for assessment",
        "status": provider,
    }


@router.post("/route")
def route_crop(request: RouteRequest) -> dict[str, str | float | list[str]]:
    route = choose_market(request.grade, request.confidence)
    return {
        "market": route.market,
        "destination": route.destination,
        "buyer_types": route.buyer_types,
        "reason": route.reason,
    }
