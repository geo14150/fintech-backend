import redis
import json
import time
import datetime
import os
from dotenv import load_dotenv
from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from plaid.model.transactions_get_request import TransactionsGetRequest

load_dotenv()


r = redis.Redis.from_url(os.getenv("REDIS_URL"), decode_responses=True)


PLAID_CLIENT_ID = "6a32723ac8748b000db3710f"
PLAID_SECRET = "755ed9e8f72a02ce46f410ada464a4"

configuration = Configuration(host="https://sandbox.plaid.com")
api_client = ApiClient(configuration)
api_client.default_headers['PLAID-CLIENT-ID'] = PLAID_CLIENT_ID
api_client.default_headers['PLAID-SECRET'] = PLAID_SECRET
client = plaid_api.PlaidApi(api_client)

print("🏃‍♂️ [Worker] Ο αυτόνομος Background Worker ξεκίνησε και περιμένει tasks...")

while True:
    try:
        
        task = r.brpop("bank_sync_queue", timeout=5)
        
        if task:
            print("🔄 [Worker] Λήφθηκε σήμα συγχρονισμού! Έναρξη επικοινωνίας με Plaid Sandbox...")
            
            
            plaid_access_token = r.get("plaid_access_token")
            
            if not plaid_access_token:
                print("❌ [Worker] Σφάλμα: Δεν βρέθηκε ενεργό access_token στη Redis. Παράκαμψη task.")
                continue
                
            
            time.sleep(3)
            
            
            request = TransactionsGetRequest(
                access_token=plaid_access_token,
                start_date=datetime.date(2026, 1, 1),
                end_date=datetime.date(2026, 7, 6)
            )
            response = client.transactions_get(request)
            plaid_transactions = response['transactions']
            
            clean_transactions = []
            for tx in plaid_transactions:
                if tx['amount'] < 0:
                    tx_type = "income"
                    category = "Salary" if "Payroll" in tx['category'] else "Income"
                else:
                    tx_type = "expense"
                    category = "billing" if "Utilities" in tx['category'] else tx['category'][0]
                    
                clean_transactions.append({
                    "id": tx['transaction_id'],
                    "description": tx['name'],
                    "amount": abs(float(tx['amount'])),
                    "type": tx_type,
                    "category": category,
                    "date": str(tx['date'])
                })
                
            
            r.setex("user_expenses", 60, json.dumps({"transactions": clean_transactions}))
            print("💾 [Worker] Ο συγχρονισμός ολοκληρώθηκε! Η Redis Cache ενημερώθηκε επιτυχώς.")
            
    except (redis.exceptions.RedisError, TimeoutError, ConnectionError, OSError) as e:
        
        continue
    except Exception as e:
        print(f"❌ [Worker Error]: {str(e)}")
        time.sleep(2)