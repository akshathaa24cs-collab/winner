from dataclasses import dataclass


@dataclass(frozen=True)
class MarketplaceRoute:
    market: str
    destination: str
    buyer_types: list[str]
    reason: str


def choose_market(grade: str, confidence: float) -> MarketplaceRoute:
    """
    Route produce to food or waste/resource marketplace.

    Food-grade:  A+, A  (with confidence ≥ 0.60)
    Waste-grade: B+, B  (below-threshold — value-recovery routing)
    """
    food_grades = {"A+", "A"}
    if grade.upper() in food_grades and confidence >= 0.60:
        return MarketplaceRoute(
            market="food",
            destination="Food Marketplace",
            buyer_types=["Retailers", "Wholesalers", "Consumers"],
            reason="Food-grade produce matched to buyers for highest value recovery.",
        )
    return MarketplaceRoute(
        market="waste",
        destination="Waste / Resource Marketplace",
        buyer_types=["Composters", "Biogas plants", "Recyclers"],
        reason="Below-threshold produce redirected to resource buyers instead of being discarded.",
    )