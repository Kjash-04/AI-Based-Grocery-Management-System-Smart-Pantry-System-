import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "smartpantry")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

users = db["users"]
inventory = db["inventory"]
recipes = db["recipes"]
shopping_list = db["shopping_list"]
