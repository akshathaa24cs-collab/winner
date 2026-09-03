from dataclasses import dataclass


@dataclass(frozen=True)
class MarketplaceRoute:
    market: str
    destination: str
    buyer_types: list[str]
    reason: str


def choose_market(grade: str, confidence: float) -> MarketplaceRoute:
    if grade.upper() == "A" and confidence >= 0.6:
        return MarketplaceRoute(
            "food",
            "Food marketplace",
            ["Retailers", "Wholesalers", "Consumers"],
            "Food-grade produce matched to buyers for the highest value recovery.",
        )
    return MarketplaceRoute(
        "waste",
        "Waste marketplace",
        ["Composters", "Biogas plants", "Recyclers"],
        "Below-grade produce redirected to a resource buyer instead of being discarded.",
    )