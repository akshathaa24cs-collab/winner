"""
Crop grading service — heuristic analyser using Pillow.

Analyses colour channel ratios (freshness/spoilage indicator) and
brightness (lighting quality) to produce a transparent grade.

    A+ / A  → food-grade marketplace  (fresh, good colour)
    B+ / B  → waste / resource marketplace (borderline, dark, overripe)

Replace assess_crop() with YOLO inference when model weights are placed
under models/ for production-grade, crop-specific assessment.
"""

from __future__ import annotations

from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True)
class CropAssessment:
    grade: str
    confidence: float
    market: str
    reason: str


# ── helpers ──────────────────────────────────────────────────────────────────

def _mean_rgb(image: Image.Image) -> tuple[float, float, float]:
    """Return mean R, G, B from a small thumbnail (fast, representative)."""
    tiny = image.convert("RGB").resize((32, 32))
    pixels = list(tiny.getdata())
    n = len(pixels) or 1
    r = sum(p[0] for p in pixels) / n
    g = sum(p[1] for p in pixels) / n
    b = sum(p[2] for p in pixels) / n
    return r, g, b


def _brightness(r: float, g: float, b: float) -> float:
    """Perceived luminance — ITU-R BT.601."""
    return 0.299 * r + 0.587 * g + 0.114 * b


# ── main grader ──────────────────────────────────────────────────────────────

def assess_crop(image: Image.Image) -> CropAssessment:
    """
    Heuristic crop quality assessment using colour analysis.

    Scoring criteria
    ────────────────
    1. Size        — minimum 200 × 200 px (smaller → unreliable assessment)
    2. Brightness  — < 40 too dark, > 220 over-exposed (reject both)
    3. Green ratio — ≥ 0.37 → very fresh (A+), ≥ 0.31 → food-grade (A)
    4. Red ratio   — high red + low green → overripe / spoiled (B)
    5. Fallback    — borderline colour → B+ (resource marketplace)

    To use YOLO for production grading: install ultralytics, place .pt
    weights under models/, and replace the body of this function.
    """
    w, h = image.size

    # ── 1. Size check ──────────────────────────────────────────────────────
    if w < 200 or h < 200:
        return CropAssessment(
            grade="B",
            confidence=0.70,
            market="waste",
            reason="Image resolution too low — minimum 200 × 200 px required.",
        )

    r, g, b = _mean_rgb(image)
    lum = _brightness(r, g, b)

    # ── 2. Brightness check ────────────────────────────────────────────────
    if lum < 40:
        return CropAssessment(
            grade="B",
            confidence=0.68,
            market="waste",
            reason="Image too dark — photograph in natural daylight for accurate grading.",
        )
    if lum > 220:
        return CropAssessment(
            grade="B+",
            confidence=0.65,
            market="waste",
            reason="Image over-exposed — move crop away from direct flash or bright sunlight.",
        )

    # ── 3 & 4. Colour channel analysis ────────────────────────────────────
    total = r + g + b or 1.0
    green_ratio = g / total
    red_ratio   = r / total

    # Strong green dominance → fresh leafy / vegetable produce
    if green_ratio >= 0.37:
        confidence = min(0.62 + (green_ratio - 0.37) * 2.0, 0.95)
        return CropAssessment(
            grade="A+",
            confidence=round(confidence, 2),
            market="food",
            reason="High green-channel ratio — fresh, food-grade produce detected.",
        )

    # Moderate green with balanced channels → healthy produce
    if green_ratio >= 0.31 and red_ratio < 0.44:
        confidence = 0.72 + (green_ratio - 0.31) * 1.5
        return CropAssessment(
            grade="A",
            confidence=round(min(confidence, 0.90), 2),
            market="food",
            reason="Good colour balance — produce meets food-market quality standards.",
        )

    # High red with low green → possibly overripe or damaged
    if red_ratio > 0.47 and green_ratio < 0.28:
        return CropAssessment(
            grade="B",
            confidence=0.74,
            market="waste",
            reason="Elevated red-channel ratio indicates overripeness or surface damage.",
        )

    # ── 5. Borderline / default ────────────────────────────────────────────
    return CropAssessment(
        grade="B+",
        confidence=0.70,
        market="waste",
        reason="Colour profile borderline — redirected to resource marketplace for value recovery.",
    )