import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not found in environment.")

    try:
        from google import genai
    except ImportError as exc:
        raise RuntimeError(
            "google-genai is not installed. Run `pip install google-genai`."
        ) from exc

    return genai.Client(api_key=api_key)


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if match:
        return json.loads(match.group(0))

    raise ValueError("Could not parse JSON from Gemini response.")


def _generate_json(prompt: str) -> Dict[str, Any]:
    client = _get_client()
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )
    if not getattr(response, "text", None):
        raise ValueError("Gemini response did not include text.")
    return _extract_json(response.text)


def parse_quick_add_with_gemini(user_text: str) -> Dict[str, Any]:
    prompt = f"""
Convert the grocery sentence into strict JSON only.

Return format:
{{
  "items": [
    {{
      "name": "Milk",
      "quantity": 2,
      "unit": "L",
      "category": "Dairy",
      "expiry_days": 2
    }}
  ]
}}

Input:
{user_text}
""".strip()

    data = _generate_json(prompt)
    if "items" not in data or not isinstance(data["items"], list):
        raise ValueError("Gemini response missing items list.")
    return data


def clean_ocr_text_with_gemini(raw_ocr_text: str) -> Dict[str, Any]:
    prompt = f"""
Extract grocery items from this OCR text.
Return strict JSON only.

Format:
{{
  "items": [
    {{
      "name": "Milk",
      "quantity": 2,
      "unit": "L",
      "price": 60
    }}
  ]
}}

OCR:
{raw_ocr_text}
""".strip()

    data = _generate_json(prompt)
    if "items" not in data or not isinstance(data["items"], list):
        raise ValueError("Gemini response missing items list.")
    return data


def recommend_recipes_with_gemini(
    inventory_items: List[Dict[str, Any]],
    dietary_preferences: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None,
) -> Dict[str, Any]:
    prompt = f"""
You are a Smart Pantry recipe assistant.

Your job:
- Generate practical recipes using ONLY or MOSTLY the available pantry items
- Prioritize items marked at_risk = true
- Respect dietary preferences
- Avoid allergies
- If ingredients are limited, still suggest simple household recipes
- Prefer recipes that reduce food waste
- You may create recipes dynamically instead of using fixed database recipes

Available pantry items:
{json.dumps(inventory_items, indent=2)}

Dietary preferences:
{json.dumps(dietary_preferences or [], indent=2)}

Allergies:
{json.dumps(allergies or [], indent=2)}

Return STRICT JSON only in this format:
{{
  "at_risk_items": [
    {{
      "name": "Milk",
      "days_to_expiry": 1
    }}
  ],
  "recipes": [
    {{
      "title": "Creamy Veg Maggi",
      "reason": "Uses available maggi, milk and vegetables while reducing food waste",
      "ingredients_used": ["Maggi", "Milk", "Broccoli", "Carrots"],
      "steps": [
        "Boil water in a pan",
        "Add maggi noodles",
        "Add chopped broccoli and carrots",
        "Pour a small amount of milk for creaminess",
        "Cook until soft and serve hot"
      ]
    }}
  ]
}}
""".strip()

    data = _generate_json(prompt)
    if "recipes" not in data:
        raise ValueError("Gemini response missing recipes.")
    return data