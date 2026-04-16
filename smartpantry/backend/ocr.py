import io
import os
import re
from typing import List, Optional


IGNORED_LINE_KEYWORDS = {
    "total",
    "subtotal",
    "tax",
    "cgst",
    "sgst",
    "igst",
    "roundoff",
    "discount",
    "amount",
    "cash",
    "change",
    "balance",
    "invoice",
    "receipt",
    "bill",
    "thank",
    "phone",
    "gstin",
    "fssai",
    "date",
    "time",
    "item",
    "qty",
    "rate",
    "mrp",
}

UNIT_ALIASES = {
    "kg": "kg",
    "g": "g",
    "gm": "g",
    "gm.": "g",
    "gram": "g",
    "grams": "g",
    "l": "L",
    "lt": "L",
    "ltr": "L",
    "litre": "L",
    "liter": "L",
    "liters": "L",
    "litres": "L",
    "ml": "ml",
    "pcs": "pcs",
    "pc": "pcs",
    "piece": "pcs",
    "pieces": "pcs",
    "pkt": "pack",
    "pack": "pack",
    "packs": "pack",
    "dozen": "dozen",
}


def _import_ocr_deps():
    try:
        import pytesseract
        from PIL import Image, ImageFilter, ImageOps
    except ImportError as exc:
        raise RuntimeError(
            "OCR dependencies are missing. Install `pytesseract` and `Pillow`."
        ) from exc
    return pytesseract, Image, ImageFilter, ImageOps


def _normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _preprocess_image(image, image_ops, image_filter):
    gray = image_ops.grayscale(image)
    boosted = image_ops.autocontrast(gray)
    denoised = boosted.filter(image_filter.MedianFilter(size=3))

    # Binarize lightly to improve receipt OCR while keeping faint text.
    threshold = denoised.point(lambda px: 255 if px > 170 else 0)
    return [boosted, denoised, threshold]


def _score_ocr_text(text: str) -> int:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return sum(len(re.findall(r"[A-Za-z0-9]", line)) for line in lines)


def try_tesseract(image_bytes: bytes) -> str:
    pytesseract, Image, ImageFilter, ImageOps = _import_ocr_deps()

    tesseract_cmd = os.getenv("TESSERACT_CMD")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise RuntimeError("Uploaded file is not a valid image.") from exc

    variants = _preprocess_image(image, ImageOps, ImageFilter)
    configs = [
        "--oem 3 --psm 6",
        "--oem 3 --psm 11",
    ]

    best_text = ""
    best_score = -1
    errors: List[str] = []

    for variant in variants:
        for config in configs:
            try:
                text = pytesseract.image_to_string(variant, config=config)
            except Exception as exc:
                errors.append(str(exc))
                continue

            score = _score_ocr_text(text)
            if score > best_score:
                best_text = text
                best_score = score

    if not best_text.strip():
        details = errors[0] if errors else "No readable text found."
        raise RuntimeError(
            "Tesseract could not extract text. "
            "Make sure Tesseract OCR is installed on your PC and reachable."
            f" {details}"
        )

    return best_text


def _looks_like_summary_line(line: str) -> bool:
    lowered = line.lower()
    return any(keyword in lowered for keyword in IGNORED_LINE_KEYWORDS)


def _extract_unit(token: str) -> Optional[str]:
    return UNIT_ALIASES.get(token.lower().strip("."))


def _parse_receipt_line(line: str):
    cleaned = _normalize_spaces(line)
    if not cleaned or _looks_like_summary_line(cleaned):
        return None

    cleaned = cleaned.replace(" x ", " ").replace(" X ", " ")
    cleaned = re.sub(r"\brs\.?\s*", "", cleaned, flags=re.IGNORECASE)

    tokens = cleaned.split(" ")
    if len(tokens) < 2:
        return None

    price_idx = None
    price = None
    for idx in range(len(tokens) - 1, -1, -1):
        token = tokens[idx].replace(",", "")
        if re.fullmatch(r"\d+(?:\.\d{1,2})?", token):
            value = float(token)
            if value > 0:
                price_idx = idx
                price = value
                break

    if price_idx is None:
        return None

    quantity = 1.0
    unit = "pcs"

    if price_idx > 0:
        qty_token = tokens[price_idx - 1].replace(",", "").lower()
        if re.fullmatch(r"\d+(?:\.\d+)?", qty_token):
            quantity = float(qty_token)
            if price_idx > 1:
                detected_unit = _extract_unit(tokens[price_idx - 2])
                if detected_unit:
                    unit = detected_unit
        else:
            match = re.fullmatch(r"(\d+(?:\.\d+)?)([A-Za-z]+)", qty_token)
            if match:
                quantity = float(match.group(1))
                unit = _extract_unit(match.group(2)) or unit
            else:
                detected_unit = _extract_unit(qty_token)
                if detected_unit and price_idx > 1:
                    unit = detected_unit
                    prev_qty = tokens[price_idx - 2].replace(",", "")
                    if re.fullmatch(r"\d+(?:\.\d+)?", prev_qty):
                        quantity = float(prev_qty)

    name_tokens = tokens[:price_idx]

    if price_idx > 1 and quantity == 1.0:
        # Handles common receipt pattern: ITEM 2 30 60
        maybe_unit_price = tokens[price_idx - 1].replace(",", "")
        maybe_qty = tokens[price_idx - 2].replace(",", "")
        if (
            re.fullmatch(r"\d+(?:\.\d+)?", maybe_unit_price)
            and re.fullmatch(r"\d+(?:\.\d+)?", maybe_qty)
        ):
            qty_value = float(maybe_qty)
            unit_price_value = float(maybe_unit_price)
            if qty_value > 0 and abs((qty_value * unit_price_value) - price) <= max(2.0, price * 0.15):
                quantity = qty_value
                name_tokens = tokens[: price_idx - 2]

    if quantity != 1.0 and name_tokens:
        last = name_tokens[-1].lower().replace(",", "")
        if re.fullmatch(r"\d+(?:\.\d+)?", last) or _extract_unit(last):
            name_tokens = name_tokens[:-1]
        elif re.fullmatch(r"(\d+(?:\.\d+)?)([A-Za-z]+)", last):
            name_tokens = name_tokens[:-1]

    name = " ".join(tok for tok in name_tokens if re.search(r"[A-Za-z]", tok))
    name = re.sub(r"[^A-Za-z0-9 &()/+-]", "", name).strip(" -")
    if len(name) < 2 or re.fullmatch(r"[a-zA-Z]", name):
        return None

    return {
        "name": name.title(),
        "quantity": quantity,
        "unit": unit,
        "price": price,
    }


def parse_receipt_text(raw: str):
    items = []
    seen = set()

    for line in raw.splitlines():
        parsed = _parse_receipt_line(line)
        if not parsed:
            continue

        key = (
            parsed["name"].lower(),
            parsed["quantity"],
            parsed["unit"],
            parsed["price"],
        )
        if key in seen:
            continue
        seen.add(key)
        items.append(parsed)

    return items
