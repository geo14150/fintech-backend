# main.py
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os
import datetime
from dotenv import load_dotenv

# Φόρτωση περιβάλλοντος ΠΡΩΤΑ από όλα για να είναι διαθέσιμο το REDIS_URL
load_dotenv()

# 🔥 Κάνουμε import το analytics αρχείο
import analytics 

from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

# 1. Ρύθμιση του Plaid Client για το Sandbox

PLAID_CLIENT_ID = "6a32723ac8748b000db3710f"
PLAID_SECRET = "755ed9e8f72a02ce46f410ada464a4"

configuration = Configuration(
    host="https://sandbox.plaid.com",
)

# 🔥 Προσθέτουμε ρητά τα Keys στα ApiClient headers για να μην είναι ποτέ missing!
api_client = ApiClient(configuration)
api_client.default_headers['PLAID-CLIENT-ID'] = PLAID_CLIENT_ID
api_client.default_headers['PLAID-SECRET'] = PLAID_SECRET

client = plaid_api.PlaidApi(api_client)

# Κρατάμε το access_token στη μνήμη για το Sandbox
plaid_access_token = None

# Δημιουργία του FastAPI App (ΜΙΑ ΦΟΡΑ)
app = FastAPI(title="Fintech Zero-Latency API")

# Ρύθμιση CORS Middleware
# Ορίζουμε ρητά ποια origins επιτρέπονται
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # <-- Βάζουμε τη λίστα μας εδώ αντί για ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Σύνδεση στη Redis Cache
r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)

# ==========================================
# 🏦 PLAID ENDPOINTS
# ==========================================

# 2. Endpoint για τη δημιουργία Link Token (Το ζητάει η React)
# 2. Endpoint για τη δημιουργία Link Token (Το ζητάει η React)
@app.post("/api/create_link_token")
def create_link_token():
    try:
        request = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="Fintech Smart Dashboard",
            country_codes=[CountryCode("US")], # Κρατάμε US για το Sandbox test
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id="user_patras_123")
        )
        response = client.link_token_create(request)
        return {"link_token": response['link_token']}
    except Exception as e:
        # 🔥 Αυτό θα σου τυπώσει το ΠΡΑΓΜΑΤΙΚΟ σφάλμα στο τερματικό της Python!
        print(r"❌ [Plaid Error]:", str(e))
        return {"link_token": None, "error": str(e)}

# 3. Endpoint για την ανταλλαγή του Public Token
@app.post("/api/set_access_token")
def set_access_token(payload: dict = Body(...)):
    global plaid_access_token
    public_token = payload.get("public_token")
    
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    
    plaid_access_token = response['access_token']
    return {"status": "success", "message": "Bank Connected Successfully!"}

# ==========================================
# 📊 TRANSACTIONS & ANALYTICS ENDPOINTS
# ==========================================

@app.get("/api/expenses")
def get_expenses():
    global plaid_access_token
    
    # Αποθηκεύουμε το token στη Redis για να μπορεί να το διαβάσει ο Worker
    if plaid_access_token:
        r.set("plaid_access_token", plaid_access_token)
    else:
        return {"success": True, "totalSpent": 0, "transactions": [], "live_incomes": [], "message": "No bank connected"}
        
    # ⚡ CACHE-FIRST: Διαβάζουμε ακαριαία από τη Redis
    cached_data = r.get("user_expenses")
    
    if cached_data:
        data = json.loads(cached_data)
        expenses_only = [tx for tx in data["transactions"] if tx.get("type") == "expense"]
        incomes_only = [tx for tx in data["transactions"] if tx.get("type") == "income"]
        
        return {
            "success": True,
            "totalSpent": sum(tx["amount"] for tx in expenses_only),
            "transactions": expenses_only,
            "live_incomes": incomes_only,
            "cached": True
        }
        
    # Αν η Cache έχει λήξει, σπρώχνουμε ακαριαία task στον Worker (Fire & Forget)
    print("📢 [API] Η Cache έληξε. Στέλνουμε task συγχρονισμού στον Worker...")
    r.lpush("bank_sync_queue", "sync_event")
    
    return {
        "success": True,
        "totalSpent": 0,
        "transactions": [],
        "live_incomes": [],
        "message": "Syncing in progress in the background..."
    }

@app.get("/api/forecast/{month}")
def get_monthly_forecast(month: int, year: int = 2026): # default έτος το 2026
    cached_data = r.get("user_expenses")
    transactions = json.loads(cached_data)["transactions"] if cached_data else []
    
    # Περνάμε και το year στη συνάρτηση των Pandas
    forecast_result = analytics.calculate_monthly_forecast(month, year, transactions)
    return forecast_result