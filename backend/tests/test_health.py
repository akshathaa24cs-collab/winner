from fastapi.testclient import TestClient
from io import BytesIO
from PIL import Image

from app.main import app


def test_health_check() -> None:
    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["ai_mode"] == "cloud-or-fallback"


def test_grade_crop_returns_assessment() -> None:
    image = Image.new("RGB", (512, 512), color=(90, 150, 70))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    response = TestClient(app).post(
        "/api/grade", files={"image": ("tomato.png", buffer.getvalue(), "image/png")}
    )

    assert response.status_code == 200
    assert response.json()["grade"] == "A"
    assert response.json()["market"] == "food"
    assert response.json()["destination"] == "Food marketplace"


def test_voice_assistant_returns_next_action() -> None:
    response = TestClient(app).post("/api/voice", json={"message": "What should I sell?"})

    assert response.status_code == 200
    assert response.json()["next_action"] == "Upload a crop photo for assessment"
    assert response.json()["status"] in {"local-fallback", "ollama", "cloud-ai"}


def test_route_crop_uses_waste_market_for_below_grade_produce() -> None:
    response = TestClient(app).post("/api/route", json={"grade": "B", "confidence": 0.72})

    assert response.status_code == 200
    assert response.json()["market"] == "waste"
    assert "Composters" in response.json()["buyer_types"]