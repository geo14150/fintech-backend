# main.py
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os
import datetime
from dotenv import load_dotenv


load_dotenv()


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



PLAID_CLIENT_ID = "6a32723ac8748b000db3710f"
PLAID_SECRET = "755ed9e8f72a02ce46f410ada464a4"

configuration = Configuration(
    host="https://sandbox.plaid.com",
)


api_client = ApiClient(configuration)
api_client.default_headers['PLAID-CLIENT-ID'] = PLAID_CLIENT_ID
api_client.default_headers['PLAID-SECRET'] = PLAID_SECRET

client = plaid_api.PlaidApi(api_client)


plaid_access_token = None


app = FastAPI(title="Fintech Zero-Latency API")


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Σύνδεση στη Redis Cache
r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)




@app.post("/api/create_link_token")
def create_link_token():
    try:
        request = LinkTokenCreateRequest(
            products=[Products("transactions")],
            client_name="Fintech Smart Dashboard",
            country_codes=[CountryCode("US")], 
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id="user_patras_123")
        )
        response = client.link_token_create(request)
        return {"link_token": response['link_token']}
    except Exception as e:
        
        print(r"❌ [Plaid Error]:", str(e))
        return {"link_token": None, "error": str(e)}


@app.post("/api/set_access_token")
def set_access_token(payload: dict = Body(...)):
    global plaid_access_token
    public_token = payload.get("public_token")
    
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    
    plaid_access_token = response['access_token']
    return {"status": "success", "message": "Bank Connected Successfully!"}




@app.get("/api/expenses")
def get_expenses():
    global plaid_access_token
    
   
    if plaid_access_token:
        r.set("plaid_access_token", plaid_access_token)
    else:
        return {"success": True, "totalSpent": 0, "transactions": [], "live_incomes": [], "message": "No bank connected"}
        
    
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
    
    
    forecast_result = analytics.calculate_monthly_forecast(month, year, transactions)
    return forecast_result