from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True)
class CropAssessment:
    grade: str
    confidence: float
    market: str
    reason: str


def assess_crop(image: Image.Image) -> CropAssessment:
    """Return a transparent baseline assessment until a crop model is installed."""
    width, height = image.size
    if width < 256 or height < 256:
        return CropAssessment("B", 0.72, "waste", "Image is too small for reliable food-grade assessment.")

    brightness = sum(sum(pixel) for pixel in image.convert("RGB").resize((1, 1)).getdata()) / 3
    if brightness < 45:
        return CropAssessment("B", 0.68, "waste", "Image is too dark to verify crop quality reliably.")
    return CropAssessment("A", 0.76, "food", "Crop image passed the baseline size and visibility checks.")