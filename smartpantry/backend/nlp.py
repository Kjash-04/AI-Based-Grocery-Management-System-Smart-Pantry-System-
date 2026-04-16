import re
from typing import Dict

# Simple "Quick Add" parser:
# Examples:
# "add 2 liters of milk"
# "I just added 500 g rice"
# "add 3 eggs"
UNIT_MAP = {
    "l": "L", "liter": "L", "liters": "L",
    "ml": "ml",
    "kg": "kg", "kilo": "kg",
    "g": "g", "gram": "g", "grams": "g",
    "pcs": "pcs", "pc": "pcs", "piece": "pcs", "pieces": "pcs",
    "egg": "pcs", "eggs": "pcs"
}

def parse_quick_add(text: str) -> Dict:
    t = text.lower().strip()
    t = re.sub(r"[^a-z0-9\.\s]", " ", t)
    t = re.sub(r"\s+", " ", t)

    # Try: quantity + unit + item
    m = re.search(r"(?:add|added|put|bought)?\s*(\d+(\.\d+)?)\s*([a-z]+)?\s*(?:of\s+)?(.+)$", t)
    if not m:
        return {"ok": False, "reason": "Could not parse"}

    qty = float(m.group(1))
    unit_raw = (m.group(3) or "pcs").strip()
    item = (m.group(4) or "").strip()

    # Clean item
    item = re.sub(r"^(a|an|the)\s+", "", item).strip()

    unit = UNIT_MAP.get(unit_raw, unit_raw)

    # Handle "eggs" like: "add 3 eggs" => unit pcs, item eggs->egg
    if item in ["egg", "eggs"]:
        unit = "pcs"
        item = "egg"

    if not item:
        return {"ok": False, "reason": "Missing item name"}

    return {"ok": True, "name": item.title(), "quantity": qty, "unit": unit}