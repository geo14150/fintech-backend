### Key Technical Concepts Implemented:
1. **Zero-Latency Caching (Cache-First):** The FastAPI backend queries the Upstash Redis instance first. If data exists, it is served in `< 5ms`, bypassing heavy third-party API calls.
2. **Asynchronous Background Processing (Event-Driven):** When a user triggers a bank synchronization, the request is instantly queued in Redis using `LPUSH` and the API responds immediately. An independent background Python process (`worker.py`) consumes the task using blocking pop (`BRPOP`) to safely communicate with Plaid.
3. **Robust Connection Recovery (Resilience):** The worker implements defensive error-handling (`OSError`, `ConnectionError`, `TimeoutError`) to automatically recover from network drops or silent connection timeouts initiated by cloud-hosted Redis (Upstash) without crashing.
4. **Historical Forecasting Engine (Pandas & NumPy):** Real-world static Plaid sandbox data is enriched with dynamic simulations. Pandas evaluates transaction dataframes, injects structured monthly noise (via NumPy random distribution engines), models purchasing power factors dynamically, and structures a 10-year historical cumulative financial analysis (2016-2026).

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite), TailwindCSS / Inline CSS
* **Backend:** FastAPI (Python 3.13), Uvicorn
* **Data Processing:** Pandas, NumPy
* **Caching & Queue:** Redis (Upstash Cloud-hosted)
* **Open Banking Integration:** Plaid SDK

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+ installed
* Node.js installed
* An active [Upstash](https://upstash.com/) Redis instance (or a local Redis server)
* Plaid Sandbox credentials

### 1. Backend Setup (FastAPI & Worker)
Navigate to your backend directory:
```bash
cd fastapi-backend

Create a .env file and populate your keys:
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
REDIS_URL=your_upstash_redis_url

Install dependencies:
pip install fastapi uvicorn redis plaid-python pandas numpy python-dotenv

Start the FastAPI Application Server:
uvicorn main:app --reload

In a separate terminal, start the Asynchronous Background Worker:
python worker.py

Frontend Setup (React)
Navigate to your frontend directory:
cd fintech-frontend

Install packages and launch the hot-reloading development server:
npm install
npm run dev

Open your browser at http://localhost:5173 to interact with the system.