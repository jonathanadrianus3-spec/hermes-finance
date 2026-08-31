import os
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Query, Body, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from backend.db.database import Database
from backend.parsers.bca_parser import BCAParser
from backend.parsers.categorizer import IndonesianCategorizer
from backend.services.email_listener import EmailListener

app = FastAPI(title="Hermes Finance API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB & Services
db = Database()
email_listener = EmailListener(db)

# Data Schemas
class EmailIngestRequest(BaseModel):
    raw_content: str
    sender: Optional[str] = "myBCA <noreply@bca.co.id>"
    subject: Optional[str] = "Transaksi myBCA Berhasil"

class CopilotQueryRequest(BaseModel):
    query: str

class TransactionCreateRequest(BaseModel):
    reference_no: Optional[str] = None
    transaction_date: str
    amount: float
    currency: Optional[str] = "IDR"
    transaction_type: str
    merchant_name: str
    merchant_location: Optional[str] = ""
    source_of_fund: Optional[str] = "myBCA"
    category: Optional[str] = "General / Others"
    entity: Optional[str] = "Personal"
    notes: Optional[str] = ""

# API Endpoints
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Hermes Finance Engine", "time": datetime.now().isoformat()}

@app.get("/api/transactions")
def get_transactions(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    category: Optional[str] = None,
    entity: Optional[str] = None,
    month: Optional[str] = None
):
    return db.get_transactions(
        limit=limit,
        offset=offset,
        search=search,
        category=category,
        entity=entity,
        month=month
    )

@app.get("/api/analytics/summary")
def get_analytics(month: Optional[str] = None):
    return db.get_analytics_summary(month=month)

@app.get("/api/categories")
def get_categories():
    return IndonesianCategorizer.CATEGORIES

@app.post("/api/ingest/email")
def ingest_email(payload: EmailIngestRequest):
    result = email_listener.process_raw_email(
        raw_content=payload.raw_content,
        sender=payload.sender or "",
        subject=payload.subject or ""
    )
    if not result:
        raise HTTPException(status_code=400, detail="Could not parse BCA transaction details from provided text.")
    return {"success": True, "transaction": result}

@app.post("/api/sync/trigger")
def trigger_sync():
    res = email_listener.fetch_unseen_bca_emails(limit=20)
    return res

@app.get("/api/sync/logs")
def get_sync_logs():
    return db.get_recent_sync_logs(limit=10)

@app.post("/api/transactions/manual")
def create_manual_transaction(tx: TransactionCreateRequest):
    import hashlib
    ref = tx.reference_no or f"MANUAL-{hashlib.md5(f'{tx.transaction_date}_{tx.amount}_{tx.merchant_name}'.encode()).hexdigest()[:12]}"
    clean_merchant = IndonesianCategorizer.clean_merchant_name(tx.merchant_name)
    cat, subcat, ent = IndonesianCategorizer.classify(clean_merchant, tx.transaction_type, tx.notes or "")
    
    data = {
        "reference_no": ref,
        "rrn": "",
        "transaction_date": tx.transaction_date,
        "amount": tx.amount,
        "currency": tx.currency or "IDR",
        "transaction_type": tx.transaction_type,
        "merchant_name": tx.merchant_name,
        "merchant_clean_name": clean_merchant,
        "merchant_location": tx.merchant_location,
        "source_of_fund": tx.source_of_fund,
        "category": tx.category or cat,
        "subcategory": subcat,
        "entity": tx.entity or ent,
        "status": "Successful",
        "notes": tx.notes,
        "raw_text": f"Manual transaction logged via Hermes Finance."
    }
    is_new, tx_id = db.insert_transaction(data)
    data["id"] = tx_id
    data["is_new"] = is_new
    return {"success": True, "transaction": data}

@app.post("/api/copilot/query")
def copilot_query(req: CopilotQueryRequest):
    """
    Hermes Financial Intelligence Agent.
    Interprets natural language queries, queries SQLite, and synthesizes actionable financial insights.
    """
    q = req.query.lower().strip()
    summary = db.get_analytics_summary()
    total_spent = summary["total_spent"]
    tx_count = summary["tx_count"]
    top_cat = summary["top_category"]
    daily_velocity = summary["daily_velocity"]
    category_breakdown = summary["category_breakdown"]
    entity_breakdown = summary["entity_breakdown"]

    # Natural Language processing responses
    if "total" in q or "how much" in q or "spend" in q or "spent" in q or "pengeluaran" in q or "habis" in q:
        if "miriva" in q:
            miriva_data = next((e for e in entity_breakdown if e["entity"] == "Miriva"), None)
            amt = miriva_data["total_amount"] if miriva_data else 0
            cnt = miriva_data["count"] if miriva_data else 0
            return {
                "answer": f"🥥 **Miriva Operational Expenses:** You have spent **IDR {amt:,.2f}** across {cnt} transactions this month (packaging, ads, and B2C logistics)."
            }
        elif "surejase" in q:
            surejase_data = next((e for e in entity_breakdown if e["entity"] == "Surejase"), None)
            amt = surejase_data["total_amount"] if surejase_data else 0
            cnt = surejase_data["count"] if surejase_data else 0
            return {
                "answer": f"🏭 **Surejase B2B Operations:** You have spent **IDR {amt:,.2f}** across {cnt} transactions this month (bulk supply, freight, and industrial processing)."
            }
        elif "food" in q or "makan" in q or "dining" in q or "restaurant" in q:
            food_data = next((c for c in category_breakdown if c["category"] == "Food & Dining"), None)
            amt = food_data["total_amount"] if food_data else 0
            cnt = food_data["count"] if food_data else 0
            return {
                "answer": f"🍔 **Food & Dining Breakdown:** You have spent **IDR {amt:,.2f}** across {cnt} meals and cafe transactions this month."
            }
        elif "qris" in q:
            qris_data = next((p for p in summary["payment_type_breakdown"] if "qris" in p["transaction_type"].lower()), None)
            amt = qris_data["total_amount"] if qris_data else 0
            cnt = qris_data["count"] if qris_data else 0
            return {
                "answer": f"📱 **QRIS Payments:** Total spent via BCA QRIS is **IDR {amt:,.2f}** ({cnt} scan-and-pay transactions)."
            }
        else:
            return {
                "answer": f"📊 **Month-to-Date Spending:** Total expenses stand at **IDR {total_spent:,.2f}** across {tx_count} transactions. Your daily spending velocity is **IDR {daily_velocity:,.2f}/day** with **{top_cat}** being your largest category."
            }

    elif "top" in q or "highest" in q or "terbesar" in q or "kategori" in q or "category" in q:
        cats_formatted = "\n".join([f"- **{c['category']}**: IDR {c['total_amount']:,.2f} ({c['count']} txs)" for c in category_breakdown[:4]])
        return {
            "answer": f"🏆 **Top Expense Categories for {summary['month']}:**\n{cats_formatted}"
        }

    elif "velocity" in q or "burn rate" in q or "average" in q or "rata-rata" in q:
        return {
            "answer": f"⚡ **Daily Burn Rate:** You are spending an average of **IDR {daily_velocity:,.2f} per day**. Projected end-of-month spend is approximately **IDR {daily_velocity * 30:,.2f}**."
        }

    elif "esb" in q or "restaurant tech" in q:
        return {
            "answer": "🍽️ **ESB Restaurant Tech D:** This is a QRIS transaction processed through ESB POS (commonly used by modern restaurants and cafes in Tangerang/Jabodetabek). Categorized under **Food & Dining**."
        }

    # General fallback summary
    return {
        "answer": f"Hermes Financial Summary for {summary['month']}:\n- Total Spent: **IDR {total_spent:,.2f}**\n- Transactions: **{tx_count}**\n- Primary Category: **{top_cat}**\n- Average Burn Rate: **IDR {daily_velocity:,.2f}/day**\n\nYou can ask me specific questions like: *'How much did I spend on Food?'*, *'What are my Miriva expenses?'*, or *'Show top categories'*"
    }

@app.post("/api/seed")
def seed_sample_data():
    """
    Seeds initial realistic transactions including the user's exact BCA QRIS email.
    """
    sample_user_email = """
Hello JONATHAN ADRIANUS GANI,
You just made a transaction through myBCA.
Here are the details of your transaction :

Status : Successful
Transaction Date : 30 Aug 2026 18:24:28
Transaction Type : QRIS Payment
Payment to : ESB Restaurant Tech D
Merchant Location : TANGERANG, 15810, ID
Acquirer : BCA
Merchant PAN : 9360001430026573904
Terminal ID : A0000001
Source of Fund : TAHAPAN - 6720****92
Customer PAN : 9360001410092502649
Total Payment : IDR 45,320.00
RRN : 287921937
Reference No. : 9527120260830182424533QRS1079342240
Please save this email as your transaction reference.
If you do not recognize this transaction, immediately contact Halo BCA at 1500888.

Best Regards,
PT Bank Central Asia Tbk
"""

    other_samples = [
        """
Hello JONATHAN ADRIANUS GANI,
You just made a transaction through myBCA.
Status : Successful
Transaction Date : 29 Aug 2026 14:10:15
Transaction Type : QRIS Payment
Payment to : KOPI KENANGAN QBIG
Merchant Location : TANGERANG, ID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 28,000.00
Reference No. : 9527120260829141015QRS99812401
""",
        """
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : 28 Aug 2026 11:45:00
Transaction Type : QRIS Payment
Payment to : ALFAMART FORESTIS
Merchant Location : TANGERANG, ID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 76,500.00
Reference No. : 9527120260828114500QRS77123901
""",
        """
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : 27 Aug 2026 09:20:00
Transaction Type : QRIS Payment
Payment to : SPBU PERTAMINA 34-15311
Merchant Location : TANGERANG SELATAN, ID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 150,000.00
Reference No. : 9527120260827092000QRS33901234
""",
        """
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : 25 Aug 2026 15:30:12
Transaction Type : Pembayaran BCA Virtual Account
Payment to : SHOPEE INDONESIA
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 320,000.00
Reference No. : 9527120260825153012VA44019231
Berita : Miriva Packaging Bottle Orders 100ml
""",
        """
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : 22 Aug 2026 13:00:00
Transaction Type : Transfer Antar Bank
Payment to : PT LOGISTIK INDUSTRI UTAMA
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 1,850,000.00
Reference No. : 9527120260822130000TF88102931
Berita : Surejase Bulk Candlenut Drum Freight
""",
        """
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : 20 Aug 2026 20:15:33
Transaction Type : Pembayaran BCA Virtual Account
Payment to : PLN POSTPAID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 485,000.00
Reference No. : 9527120260820201533VA11204921
"""
    ]

    # Ingest user's actual email
    email_listener.process_raw_email(sample_user_email)

    for s in other_samples:
        email_listener.process_raw_email(s)

    return {"success": True, "message": "Sample transactions seeded successfully"}

# Serve Frontend static assets
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Hermes Finance Backend is running. Frontend under construction."}
