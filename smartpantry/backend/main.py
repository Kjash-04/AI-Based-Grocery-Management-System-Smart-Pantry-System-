import os
import re
import logging
from datetime import datetime, date, timedelta
from typing import List, Optional
from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests

from db import users, inventory, recipes as recipes_col, shopping_list
from models import (
    UserCreate, UserLogin, UserPublic, UpdateProfile,
    ItemCreate, ItemUpdate, ItemPublic,
    QuickAddVoice, BarcodeLookup, OCRResult,
    ShoppingListCreate, ShoppingListUpdate, ShoppingListPublic,
    ShoppingListWriteResult, AdminDashboardSummary,
    AdminRoleUpdate, AdminUserSummary
)
from auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
    require_admin,
)
from gemini_ai import (
    clean_ocr_text_with_gemini,
    parse_quick_add_with_gemini,
    recommend_recipes_with_gemini,
)
from nlp import parse_quick_add
from ocr import try_tesseract, parse_receipt_text
from recipes import load_sample_recipes

load_dotenv()

app = FastAPI(
    title="Smart Pantry API",
    version="1.0",
)

logger = logging.getLogger("smartpantry")

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Smart Pantry API",
        version="1.0",
        description="Smart Pantry API with JWT Auth",
        routes=app.routes,
    )

    openapi_schema.setdefault("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# --- Helpers ---
def get_admin_emails() -> set[str]:
    configured = os.getenv("ADMIN_EMAILS", "")
    return {email.strip().lower() for email in configured.split(",") if email.strip()}


def resolve_signup_role(email: str) -> str:
    normalized_email = email.strip().lower()
    if normalized_email in get_admin_emails():
        return "admin"
    if users.count_documents({}) == 0:
        return "admin"
    return "user"


def serialize_user_public(user: dict) -> dict:
    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "mobile": user["mobile"],
        "dob": user["dob"].date() if isinstance(user["dob"], datetime) else user["dob"],
        "about": user.get("about", {}),
        "role": user.get("role", "user"),
    }


def build_admin_user_summary(user: dict) -> dict:
    user_id = str(user["_id"])
    created_at = user.get("created_at")
    return {
        "id": user_id,
        "full_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "created_at": created_at.date() if isinstance(created_at, datetime) else created_at,
        "inventory_count": inventory.count_documents({"user_id": user_id}),
        "shopping_list_count": shopping_list.count_documents({"user_id": user_id}),
    }


def detect_category(name: str, category: Optional[str] = None) -> str:
    if category and category != "Other":
        return category

    lowered_name = name.lower()
    if "milk" in lowered_name:
        return "Dairy"
    if "maggi" in lowered_name:
        return "Instant"
    return category or "Other"

def estimate_expiry_date(name: str, expiry_date=None):
    if expiry_date is not None:
        return expiry_date

    lowered_name = name.lower().strip()
    if lowered_name == "milk":
        return datetime.now() + timedelta(days=2)
    return None

def normalize_item_doc(doc: dict) -> dict:
    doc["category"] = detect_category(doc["name"], doc.get("category"))
    doc["expiry_date"] = estimate_expiry_date(doc["name"], doc.get("expiry_date"))
    return doc

def normalize_name(s: str) -> str:
    return s.strip().lower()

def days_to_expiry(expiry_date) -> Optional[int]:
    if not expiry_date:
        return None
    if isinstance(expiry_date, str):
        try:
            expiry_date = datetime.fromisoformat(expiry_date).date()
        except Exception:
            return None
    if isinstance(expiry_date, datetime):
        expiry_date = expiry_date.date()
    if isinstance(expiry_date, date):
        return (expiry_date - datetime.now().date()).days
    return None

def get_ingredient_name(ingredient) -> str:
    if isinstance(ingredient, dict):
        return normalize_name(ingredient.get("name", ""))
    return normalize_name(str(ingredient))

def score_recipe(recipe: dict, pantry_map: dict, at_risk_set: set) -> int:
    score = 0
    for ing in recipe.get("ingredients", []):
        name = get_ingredient_name(ing)
        if name in pantry_map:
            score += 1
            if name in at_risk_set:
                score += 5
    return score

def to_item_public(doc, user_id: str) -> dict:
    exp = doc.get("expiry_date")
    days_to_exp = days_to_expiry(exp)
    at_risk = days_to_exp is not None and days_to_exp <= 2
    return {
        "id": str(doc["_id"]),
        "user_id": user_id,
        "name": doc["name"],
        "category": doc.get("category", "Other"),
        "quantity": float(doc.get("quantity", 1)),
        "unit": doc.get("unit", "pcs"),
        "price": float(doc.get("price", 0)),
        "expiry_date": exp.date() if isinstance(exp, datetime) else exp,
        "days_to_expiry": days_to_exp,
        "at_risk": at_risk,
    }

def to_shopping_list_public(doc, user_id: str) -> dict:
    return {
        "id": str(doc["_id"]),
        "user_id": user_id,
        "name": doc.get("name", ""),
        "quantity": float(doc.get("quantity", 1)),
        "unit": doc.get("unit", "pcs"),
        "notes": doc.get("notes", ""),
        "bought": bool(doc.get("bought", False)),
    }

def normalize_ocr_items(items: List[dict]) -> List[dict]:
    normalized = []
    seen = set()

    for item in items or []:
        name = str(item.get("name", "")).strip()
        if not name:
            continue

        try:
            quantity = float(item.get("quantity", 1) or 1)
        except Exception:
            quantity = 1.0

        unit = str(item.get("unit", "pcs") or "pcs").strip() or "pcs"

        try:
            price = float(item.get("price", 0) or 0)
        except Exception:
            price = 0.0

        clean_item = {
            "name": name.title(),
            "quantity": quantity,
            "unit": unit,
            "price": price,
        }

        key = (
            clean_item["name"].lower(),
            clean_item["quantity"],
            clean_item["unit"].lower(),
            clean_item["price"],
        )
        if key in seen:
            continue
        seen.add(key)
        normalized.append(clean_item)

    return normalized

def should_try_gemini_ocr_cleanup(raw_text: str, items: List[dict]) -> bool:
    useful_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    return len(items) < 2 and len(useful_lines) >= 2

def split_quick_add_text(text: str) -> List[str]:
    parts = re.split(r"\s*(?:,| and | & )\s*", text.strip(), flags=re.IGNORECASE)
    return [part.strip() for part in parts if part.strip()]

def parse_quick_add_locally(text: str) -> dict:
    items = []
    for chunk in split_quick_add_text(text):
        parsed = parse_quick_add(chunk)
        if not parsed.get("ok"):
            continue
        items.append({
            "name": parsed["name"],
            "quantity": float(parsed.get("quantity", 1)),
            "unit": parsed.get("unit", "pcs"),
            "category": detect_category(parsed["name"]),
            "expiry_days": None,
        })
    return {"items": items}

def recipe_matches_user(recipe: dict, dietary_preferences: list, allergies: list) -> bool:
    lowered_text = " ".join(
        [
            str(recipe.get("title", "")),
            str(recipe.get("name", "")),
            " ".join(str(ing) for ing in recipe.get("ingredients", [])),
        ]
    ).lower()

    allergy_terms = {normalize_name(item) for item in allergies if item}
    if allergy_terms and any(term and term in lowered_text for term in allergy_terms):
        return False

    prefs = {normalize_name(item) for item in dietary_preferences if item}
    if "vegan" in prefs:
        blocked = {"milk", "curd", "paneer", "cheese", "egg", "chicken", "meat", "fish"}
        if any(term in lowered_text for term in blocked):
            return False
    if "vegetarian" in prefs:
        blocked = {"chicken", "meat", "fish", "egg"}
        if any(term in lowered_text for term in blocked):
            return False

    return True

def build_recipe_suggestion(recipe: dict, pantry_map: dict, at_risk_set: set) -> Optional[dict]:
    req = [get_ingredient_name(ing) for ing in recipe.get("ingredients", [])]
    req = [name for name in req if name]
    if not req:
        return None

    available = [name for name in req if name in pantry_map]
    missing = [name for name in req if name not in pantry_map]
    matched_count = len(available)
    coverage = matched_count / len(req)

    if matched_count == 0:
        return None

    if matched_count < 2 and coverage < 0.6:
        return None

    reason = (
        "Uses pantry items that are already available."
        if not missing
        else f"Uses {matched_count} pantry item(s) now and only needs {len(missing)} more."
    )

    return {
        "title": recipe.get("title") or recipe.get("name"),
        "reason": reason,
        "score": score_recipe(recipe, pantry_map, at_risk_set) + int(coverage * 10),
        "ingredients": recipe.get("ingredients", []),
        "ingredients_used": available,
        "missing_ingredients": missing,
        "match_percent": int(round(coverage * 100)),
        "steps": recipe.get("steps") or (
            [recipe.get("instructions")] if recipe.get("instructions") else []
        ),
    }

def build_local_recipe_recommendations(
    user_id: str,
    dietary_preferences: Optional[list] = None,
    allergies: Optional[list] = None,
) -> dict:
    items = list(inventory.find({"user_id": user_id}))
    pantry_map = {normalize_name(i.get("name", "")): i for i in items if i.get("name")}
    dietary_preferences = dietary_preferences or []
    allergies = allergies or []

    at_risk_items = []
    at_risk_set = set()
    for item in items:
        dte = days_to_expiry(item.get("expiry_date"))
        item["days_to_expiry"] = dte
        item["at_risk"] = dte is not None and dte <= 2
        if item["at_risk"]:
            at_risk_items.append(item)
            at_risk_set.add(normalize_name(item.get("name", "")))

    recipes = list(recipes_col.find({}, {"_id": 0}))

    matched = []
    for recipe in recipes:
        if not recipe_matches_user(recipe, dietary_preferences, allergies):
            continue

        suggestion = build_recipe_suggestion(recipe, pantry_map, at_risk_set)
        if suggestion:
            matched.append(suggestion)

    matched.sort(key=lambda x: x.get("score", 0), reverse=True)

    return {
        "source": "local",
        "at_risk_items": [
            {"name": item.get("name"), "days_to_expiry": item.get("days_to_expiry")}
            for item in at_risk_items
        ],
        "recipes": matched[:6],
    }

def ensure_sample_recipes_loaded():
    sample = load_sample_recipes(os.path.join(os.path.dirname(__file__), "sample_recipes.json"))
    if not sample:
        return

    for recipe in sample:
        title = recipe.get("title") or recipe.get("name")
        if not title:
            continue
        recipes_col.update_one(
            {"title": title},
            {"$set": recipe},
            upsert=True,
        )

ensure_sample_recipes_loaded()

# --- AUTH ---
@app.post("/auth/signup")
def signup(payload: UserCreate):
    # Mock OTP check
    if payload.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP (demo: use 123456)")

    if users.find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=409, detail="Email already registered")

    doc = {
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "mobile": payload.mobile,
        "dob": datetime.combine(payload.dob, datetime.min.time()),
        "password_hash": hash_password(payload.password),
        "about": payload.about.model_dump(),
        "role": resolve_signup_role(payload.email),
        "created_at": datetime.utcnow(),
    }
    res = users.insert_one(doc)
    token = create_token(str(res.inserted_id))
    return {"token": token}

@app.post("/auth/login")
def login(payload: UserLogin):
    user = users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_token(str(user["_id"]))
    return {"token": token}

@app.get("/me", response_model=UserPublic)
def me(current=Depends(get_current_user)):
    return serialize_user_public(current)

@app.put("/me", response_model=UserPublic)
def update_me(payload: UpdateProfile, current=Depends(get_current_user)):
    update = {}
    if payload.full_name is not None:
        update["full_name"] = payload.full_name
    if payload.mobile is not None:
        update["mobile"] = payload.mobile
    if payload.dob is not None:
        update["dob"] = datetime.combine(payload.dob, datetime.min.time())
    if payload.about is not None:
        update["about"] = payload.about.model_dump()

    if update:
        users.update_one({"_id": ObjectId(current["id"])}, {"$set": update})

    user = users.find_one({"_id": ObjectId(current["id"])})
    user["id"] = str(user["_id"])
    user["role"] = user.get("role", "user")
    return serialize_user_public(user)


@app.get("/admin/summary", response_model=AdminDashboardSummary)
def get_admin_summary(current=Depends(require_admin)):
    recent_users = list(users.find().sort("created_at", -1).limit(5))
    return {
        "total_users": users.count_documents({}),
        "total_admins": users.count_documents({"role": "admin"}),
        "total_inventory_items": inventory.count_documents({}),
        "total_shopping_items": shopping_list.count_documents({}),
        "recent_users": [build_admin_user_summary(user) for user in recent_users],
    }


@app.get("/admin/users", response_model=List[AdminUserSummary])
def list_admin_users(current=Depends(require_admin)):
    docs = list(users.find().sort("created_at", -1))
    return [build_admin_user_summary(user) for user in docs]


@app.put("/admin/users/{user_id}/role", response_model=AdminUserSummary)
def update_admin_user_role(
    user_id: str,
    payload: AdminRoleUpdate,
    current=Depends(require_admin),
):
    next_role = payload.role.strip().lower()
    if next_role not in {"admin", "user"}:
        raise HTTPException(status_code=400, detail="Role must be admin or user")

    if user_id == current["id"] and next_role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")

    res = users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": next_role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = users.find_one({"_id": ObjectId(user_id)})
    return build_admin_user_summary(user)

# --- INVENTORY CRUD ---
@app.post("/inventory", response_model=ItemPublic)
def add_item(payload: ItemCreate, current=Depends(get_current_user)):
    doc = payload.model_dump()
    # store expiry as date or None
    if doc.get("expiry_date"):
        doc["expiry_date"] = datetime.combine(doc["expiry_date"], datetime.min.time())
    doc = normalize_item_doc(doc)
    doc["user_id"] = current["id"]
    doc["created_at"] = datetime.utcnow()

    res = inventory.insert_one(doc)
    saved = inventory.find_one({"_id": res.inserted_id})
    return to_item_public(saved, current["id"])

@app.get("/shopping-list", response_model=List[ShoppingListPublic])
def list_shopping_items(current=Depends(get_current_user)):
    docs = list(shopping_list.find({"user_id": current["id"]}).sort("created_at", -1))
    return [to_shopping_list_public(doc, current["id"]) for doc in docs]

@app.post("/shopping-list", response_model=ShoppingListWriteResult)
def add_shopping_item(payload: ShoppingListCreate, current=Depends(get_current_user)):
    normalized_name = payload.name.strip()
    normalized_key = normalized_name.lower()
    normalized_unit = payload.unit.strip() or "pcs"
    normalized_notes = payload.notes.strip()
    quantity = float(payload.quantity)

    existing = shopping_list.find_one({
        "user_id": current["id"],
        "$or": [
            {"name_key": normalized_key},
            {"name": {"$regex": f"^{re.escape(normalized_name)}$", "$options": "i"}},
        ],
    })

    if existing:
        merged_notes = existing.get("notes", "")
        if normalized_notes and normalized_notes not in merged_notes:
            merged_notes = (
                f"{merged_notes} | {normalized_notes}" if merged_notes else normalized_notes
            )

        shopping_list.update_one(
            {"_id": existing["_id"], "user_id": current["id"]},
            {
                "$set": {
                    "name": normalized_name or existing.get("name", ""),
                    "name_key": normalized_key,
                    "quantity": float(existing.get("quantity", 1)) + quantity,
                    "unit": normalized_unit,
                    "notes": merged_notes,
                    "bought": False,
                }
            },
        )
        saved = shopping_list.find_one({"_id": existing["_id"]})
        return {
            **to_shopping_list_public(saved, current["id"]),
            "action": "merged",
        }

    doc = {
        "user_id": current["id"],
        "name": normalized_name,
        "name_key": normalized_key,
        "quantity": quantity,
        "unit": normalized_unit,
        "notes": normalized_notes,
        "bought": False,
        "created_at": datetime.utcnow(),
    }
    res = shopping_list.insert_one(doc)
    saved = shopping_list.find_one({"_id": res.inserted_id})
    return {
        **to_shopping_list_public(saved, current["id"]),
        "action": "created",
    }

@app.put("/shopping-list/{item_id}", response_model=ShoppingListPublic)
def update_shopping_item(item_id: str, payload: ShoppingListUpdate, current=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "name" in update:
        update["name"] = str(update["name"]).strip()
        update["name_key"] = update["name"].lower()
    if "unit" in update:
        update["unit"] = str(update["unit"]).strip() or "pcs"
    if "notes" in update:
        update["notes"] = str(update["notes"]).strip()
    if "quantity" in update:
        update["quantity"] = float(update["quantity"])

    res = shopping_list.update_one(
        {"_id": ObjectId(item_id), "user_id": current["id"]},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shopping list item not found")

    doc = shopping_list.find_one({"_id": ObjectId(item_id)})
    return to_shopping_list_public(doc, current["id"])

@app.delete("/shopping-list/{item_id}")
def delete_shopping_item(item_id: str, current=Depends(get_current_user)):
    res = shopping_list.delete_one({"_id": ObjectId(item_id), "user_id": current["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shopping list item not found")
    return {"ok": True}

@app.get("/inventory", response_model=List[ItemPublic])
def list_items(current=Depends(get_current_user)):
    docs = list(inventory.find({"user_id": current["id"]}).sort("created_at", -1))
    return [to_item_public(d, current["id"]) for d in docs]

@app.put("/inventory/{item_id}", response_model=ItemPublic)
def update_item(item_id: str, payload: ItemUpdate, current=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "expiry_date" in update and update["expiry_date"] is not None:
        update["expiry_date"] = datetime.combine(update["expiry_date"], datetime.min.time())
    if "name" in update or "category" in update or "expiry_date" in update:
        current_doc = inventory.find_one({"_id": ObjectId(item_id), "user_id": current["id"]})
        if not current_doc:
            raise HTTPException(status_code=404, detail="Item not found")
        merged_doc = {
            "name": update.get("name", current_doc["name"]),
            "category": update.get("category", current_doc.get("category")),
            "expiry_date": update.get("expiry_date", current_doc.get("expiry_date")),
        }
        normalized = normalize_item_doc(merged_doc)
        update["category"] = normalized["category"]
        update["expiry_date"] = normalized["expiry_date"]
    res = inventory.update_one({"_id": ObjectId(item_id), "user_id": current["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    doc = inventory.find_one({"_id": ObjectId(item_id)})
    return to_item_public(doc, current["id"])

@app.delete("/inventory/{item_id}")
def delete_item(item_id: str, current=Depends(get_current_user)):
    res = inventory.delete_one({"_id": ObjectId(item_id), "user_id": current["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}

# --- VOICE QUICK ADD (GEMINI) ---
@app.post("/ai/quick-add")
def ai_quick_add(payload: QuickAddVoice, current=Depends(get_current_user)):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Missing text")

    try:
        parsed = parse_quick_add_with_gemini(text)
    except Exception as e:
        logger.warning("Gemini quick-add failed, using local parser: %s", str(e))
        parsed = parse_quick_add_locally(text)
        if not parsed.get("items"):
            raise HTTPException(status_code=500, detail=f"Gemini parse failed: {str(e)}")

    inserted = []
    for item in parsed["items"]:
        name = (item.get("name") or "Unknown").strip()
        quantity = float(item.get("quantity", 1))
        unit = item.get("unit", "pcs")
        category = item.get("category", "Other")
        expiry_days = item.get("expiry_days")

        expiry_date = None
        if expiry_days is not None:
            try:
                expiry_date = datetime.utcnow() + timedelta(days=int(expiry_days))
            except Exception:
                expiry_date = None

        doc = normalize_item_doc({
            "user_id": current["id"],
            "name": name,
            "category": category,
            "quantity": quantity,
            "unit": unit,
            "price": 0,
            "expiry_date": expiry_date,
            "created_at": datetime.utcnow(),
        })

        res = inventory.insert_one(doc)
        saved = inventory.find_one({"_id": res.inserted_id})
        inserted.append(to_item_public(saved, current["id"]))

    return {"items": inserted}

# --- BARCODE LOOKUP (Open Food Facts) ---
DEFAULT_EXPIRY_DAYS = {
    "dairy": 7,
    "vegetables": 5,
    "fruits": 7,
    "meat": 3,
    "snacks": 180,
    "beverages": 90,
    "spices": 365,
    "other": 30
}

def estimate_expiry_by_category(cat: str) -> date:
    key = (cat or "other").lower()
    days = DEFAULT_EXPIRY_DAYS.get(key, DEFAULT_EXPIRY_DAYS["other"])
    return (date.today()).fromordinal(date.today().toordinal() + days)

@app.post("/ai/barcode-lookup")
def barcode_lookup(payload: BarcodeLookup, current=Depends(get_current_user)):
    barcode = payload.barcode.strip()
    if not barcode:
        raise HTTPException(status_code=400, detail="Missing barcode")

    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    try:
        r = requests.get(url, timeout=10)
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch product info")

    if data.get("status") != 1:
        raise HTTPException(status_code=404, detail="Product not found in Open Food Facts")

    prod = data.get("product", {})
    name = prod.get("product_name") or prod.get("generic_name") or "Unknown Product"
    categories = prod.get("categories_tags", []) or []
    # Choose a simple category bucket
    category_bucket = "Other"
    cat_text = " ".join(categories).lower()
    if "dairy" in cat_text:
        category_bucket = "Dairy"
    elif "vegetable" in cat_text:
        category_bucket = "Vegetables"
    elif "fruit" in cat_text:
        category_bucket = "Fruits"
    elif "meat" in cat_text:
        category_bucket = "Meat"
    elif "snack" in cat_text:
        category_bucket = "Snacks"
    elif "spice" in cat_text:
        category_bucket = "Spices"
    elif "beverage" in cat_text or "drink" in cat_text:
        category_bucket = "Beverages"

    est_exp = estimate_expiry_by_category(category_bucket.lower())
    return {
        "name": name,
        "category": category_bucket,
        "estimated_expiry_date": est_exp.isoformat()
    }

# --- OCR RECEIPT UPLOAD ---
@app.post("/ai/ocr-receipt", response_model=OCRResult)
async def ocr_receipt(file: UploadFile = File(...), current=Depends(get_current_user)):
    img_bytes = await file.read()
    try:
        raw = try_tesseract(img_bytes)
    except Exception as e:
        logger.exception("OCR receipt processing failed")
        raise HTTPException(
            status_code=500,
            detail=f"OCR failed: {str(e)}"
        )

    items = normalize_ocr_items(parse_receipt_text(raw))

    if should_try_gemini_ocr_cleanup(raw, items):
        try:
            gemini_result = clean_ocr_text_with_gemini(raw)
            gemini_items = normalize_ocr_items(gemini_result.get("items", []))
            if len(gemini_items) > len(items):
                items = gemini_items
        except Exception:
            # Keep local OCR results if Gemini is unavailable or quota-limited.
            pass

    return {"raw_text": raw, "items": items}

@app.post("/ai/ocr-clean")
def ai_ocr_clean(payload: dict, current=Depends(get_current_user)):
    raw_text = (payload.get("raw_text") or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Missing raw_text")

    try:
        result = clean_ocr_text_with_gemini(raw_text)
        result["items"] = normalize_ocr_items(result.get("items", []))
        return result
    except Exception as e:
        logger.warning("Gemini OCR cleanup failed, using local OCR parser: %s", str(e))
        return {
            "items": normalize_ocr_items(parse_receipt_text(raw_text)),
            "fallback_reason": f"Gemini OCR cleanup failed: {str(e)}",
        }

@app.post("/ai/ocr-commit")
def ocr_commit(items: List[dict], current=Depends(get_current_user)):
    """
    Commit OCR extracted items to inventory.
    Expect list of {name, quantity, unit, price}
    """
    if not items:
        raise HTTPException(status_code=400, detail="No items to save")

    docs = []
    for it in items:
        name = (it.get("name") or "").strip()
        if not name:
            continue
        docs.append({
            "user_id": current["id"],
            "name": name,
            "category": "Other",
            "quantity": float(it.get("quantity", 1)),
            "unit": it.get("unit", "pcs"),
            "price": float(it.get("price", 0)),
            "expiry_date": None,
            "created_at": datetime.utcnow(),
        })

    if not docs:
        raise HTTPException(status_code=400, detail="No valid items")

    inventory.insert_many([normalize_item_doc(doc) for doc in docs])
    return {"ok": True, "inserted": len(docs)}

# --- RECIPE RECOMMENDATIONS ---
@app.get("/ai/recipes")
def get_recipes(current=Depends(get_current_user)):
    about = current.get("about", {}) or {}
    return build_local_recipe_recommendations(
        current["id"],
        dietary_preferences=about.get("dietary_preferences", []),
        allergies=about.get("allergies", []),
    )

@app.get("/ai/recipes-gemini")
def ai_recipes_gemini(current=Depends(get_current_user)):
    user_id = current["id"]
    items = list(inventory.find({"user_id": user_id}))

    inventory_items = []
    at_risk_items = []
    for item in items:
        dte = days_to_expiry(item.get("expiry_date"))
        at_risk = dte is not None and dte <= 2

        inventory_items.append({
            "name": item.get("name"),
            "category": item.get("category", "Other"),
            "quantity": item.get("quantity", 1),
            "unit": item.get("unit", "pcs"),
            "days_to_expiry": dte,
            "at_risk": at_risk,
        })

        if at_risk:
            at_risk_items.append({
                "name": item.get("name"),
                "days_to_expiry": dte,
            })

    about = current.get("about", {}) or {}
    dietary_preferences = about.get("dietary_preferences", [])
    allergies = about.get("allergies", [])

    try:
        result = recommend_recipes_with_gemini(
            inventory_items=inventory_items,
            dietary_preferences=dietary_preferences,
            allergies=allergies,
        )
    except Exception as e:
        fallback = build_local_recipe_recommendations(
            user_id,
            dietary_preferences=dietary_preferences,
            allergies=allergies,
        )
        fallback["fallback_reason"] = f"Gemini recipe generation failed: {str(e)}"
        fallback["notice"] = (
            "Gemini quota is currently exhausted, so Smart Pantry is showing "
            "local pantry-based recipe matches instead."
        )
        return fallback

    if "at_risk_items" not in result:
        result["at_risk_items"] = at_risk_items

    result["source"] = "gemini"

    return result

@app.get("/")
def root():
    return {"message": "Smart Pantry Backend Running"}
