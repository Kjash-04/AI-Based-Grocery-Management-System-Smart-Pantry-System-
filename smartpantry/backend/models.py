from datetime import date
from typing import List, Optional
from pydantic import BaseModel, EmailStr


class AboutYou(BaseModel):
    dietary_preferences: List[str] = []
    allergies: List[str] = []
    household_size: int = 1
    grocery_platforms: List[str] = []


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    mobile: str
    dob: date
    password: str
    otp: str
    about: AboutYou = AboutYou()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    mobile: str
    dob: date
    about: AboutYou
    role: str


class AdminUserSummary(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str
    created_at: Optional[date] = None
    inventory_count: int = 0
    shopping_list_count: int = 0


class AdminDashboardSummary(BaseModel):
    total_users: int
    total_admins: int
    total_inventory_items: int
    total_shopping_items: int
    recent_users: List[AdminUserSummary] = []


class AdminRoleUpdate(BaseModel):
    role: str


class UpdateProfile(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    dob: Optional[date] = None
    about: Optional[AboutYou] = None


class ItemCreate(BaseModel):
    name: str
    category: str = "Other"
    quantity: float = 1
    unit: str = "pcs"
    price: float = 0
    expiry_date: Optional[date] = None


class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    expiry_date: Optional[date] = None


class ItemPublic(BaseModel):
    id: str
    user_id: str
    name: str
    category: str
    quantity: float
    unit: str
    price: float
    expiry_date: Optional[date]
    days_to_expiry: Optional[int]
    at_risk: bool


class QuickAddVoice(BaseModel):
    text: str


class BarcodeLookup(BaseModel):
    barcode: str


class OCRResultItem(BaseModel):
    name: str
    quantity: float
    unit: str
    price: float


class OCRResult(BaseModel):
    raw_text: str
    items: List[OCRResultItem] = []


class ShoppingListCreate(BaseModel):
    name: str
    quantity: float = 1
    unit: str = "pcs"
    notes: str = ""


class ShoppingListUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    bought: Optional[bool] = None


class ShoppingListPublic(BaseModel):
    id: str
    user_id: str
    name: str
    quantity: float
    unit: str
    notes: str
    bought: bool


class ShoppingListWriteResult(ShoppingListPublic):
    action: str
