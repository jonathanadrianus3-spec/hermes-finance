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

def background_email_sync_worker():
    """Background thread running on VPS to ingest BCA emails every 20 minutes."""
    import time
    time.sleep(10)
    while True:
        try:
            load_dotenv(override=True)
            u = os.getenv("EMAIL_USER", "").strip()
            p = os.getenv("EMAIL_PASSWORD", "").replace(" ", "").strip()
            if u and p and u != "your_email@gmail.com":
                email_listener.user = u
                email_listener.password = p
                email_listener.fetch_unseen_bca_emails(limit=30)
        except Exception as e:
            print(f"[Worker] Auto-sync error: {e}")
        time.sleep(20 * 60)

@app.on_event("startup")
def on_startup():
    import threading
    t = threading.Thread(target=background_email_sync_worker, daemon=True)
    t.start()

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

class TransactionReviewRequest(BaseModel):
    category: str
    entity: str = "Personal"
    notes: Optional[str] = None
    merchant_name: Optional[str] = None
    amount: Optional[float] = None

class TransactionUpdateRequest(BaseModel):
    merchant_name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    entity: Optional[str] = None
    notes: Optional[str] = None

# API Endpoints
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Hermes Finance Engine", "time": datetime.now().isoformat()}

@app.get("/api/entities")
def get_entities():
    return IndonesianCategorizer.ENTITIES

@app.get("/api/categories")
def get_categories():
    return IndonesianCategorizer.CATEGORIES

@app.get("/api/mobile/dashboard")
def get_mobile_dashboard(month: Optional[str] = None):
    summary = db.get_analytics_summary(month=month)
    pending_count = db.get_pending_review_count()
    recent = db.get_transactions(limit=8, offset=0)
    pending_items = db.get_pending_reviews()
    
    # Ensure all 4 entities exist in entity_breakdown even if 0
    existing_entities = {e["entity"]: e for e in summary.get("entity_breakdown", [])}
    full_entity_breakdown = []
    for ent_name in IndonesianCategorizer.ENTITIES:
        if ent_name in existing_entities:
            full_entity_breakdown.append(existing_entities[ent_name])
        else:
            full_entity_breakdown.append({
                "entity": ent_name,
                "total_amount": 0.0,
                "count": 0
            })
    summary["entity_breakdown"] = full_entity_breakdown
    
    return {
        "summary": summary,
        "pending_review_count": pending_count,
        "pending_reviews": pending_items[:10],
        "recent_transactions": recent["items"]
    }

@app.get("/api/transactions/pending-review")
def get_pending_reviews(date: Optional[str] = None):
    return db.get_pending_reviews(date_str=date)

@app.post("/api/transactions/{tx_id}/review")
def review_transaction(tx_id: int, req: TransactionReviewRequest):
    success = db.mark_as_reviewed(
        tx_id=tx_id,
        category=req.category,
        entity=req.entity,
        notes=req.notes,
        merchant_name=req.merchant_name,
        amount=req.amount,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"success": True, "message": "Transaction marked as reviewed", "id": tx_id}

@app.put("/api/transactions/{tx_id}")
def update_transaction_endpoint(tx_id: int, req: TransactionUpdateRequest):
    updates = req.dict(exclude_unset=True)
    success = db.update_transaction(tx_id=tx_id, updates=updates)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found or no changes made")
    return {"success": True, "message": "Transaction updated successfully", "id": tx_id}

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

class GmailCredentialsRequest(BaseModel):
    email: str
    password: str

@app.post("/api/settings/gmail")
def configure_gmail(req: GmailCredentialsRequest):
    clean_email = req.email.strip()
    clean_pwd = req.password.replace(" ", "").strip()
    
    # Update .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    lines = [
        f"EMAIL_HOST=imap.gmail.com\n",
        f"EMAIL_PORT=993\n",
        f"EMAIL_USER={clean_email}\n",
        f"EMAIL_PASSWORD={clean_pwd}\n",
        f"EMAIL_FOLDER=INBOX\n",
        f"DATABASE_PATH=backend/db/hermes_finance.db\n",
    ]
    with open(env_path, "w") as f:
        f.writelines(lines)

    # Reload into runtime
    email_listener.user = clean_email
    email_listener.password = clean_pwd
    email_listener.host = "imap.gmail.com"
    email_listener.port = 993
    email_listener.folder = "INBOX"

    # Test connection immediately
    test_res = email_listener.fetch_unseen_bca_emails(limit=25)
    return {
        "success": test_res.get("success", True),
        "message": test_res.get("message", "Credentials saved and Gmail synced!"),
        "scanned": test_res.get("scanned", 0),
        "imported": test_res.get("imported", 0)
    }

@app.post("/api/sync/trigger")
def trigger_sync():
    load_dotenv(override=True)
    email_listener.user = os.getenv("EMAIL_USER", "").strip()
    email_listener.password = os.getenv("EMAIL_PASSWORD", "").replace(" ", "").strip()
    email_listener.host = os.getenv("EMAIL_HOST", "imap.gmail.com").strip()
    email_listener.port = int(os.getenv("EMAIL_PORT", "993"))
    email_listener.folder = os.getenv("EMAIL_FOLDER", "INBOX").strip()
    res = email_listener.fetch_unseen_bca_emails(limit=50)
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
        if "personal" in q:
            p_data = next((e for e in entity_breakdown if e["entity"] == "Personal"), None)
            amt = p_data["total_amount"] if p_data else 0
            cnt = p_data["count"] if p_data else 0
            return {
                "answer": f"👤 **Personal Expenses:** You have spent **IDR {amt:,.2f}** across {cnt} transactions this month (meals, commute, personal retail)."
            }
        elif "family" in q or "keluarga" in q or "household" in q:
            f_data = next((e for e in entity_breakdown if e["entity"] == "Family"), None)
            amt = f_data["total_amount"] if f_data else 0
            cnt = f_data["count"] if f_data else 0
            return {
                "answer": f"👨‍👩‍👦 **Family Expenses:** You have spent **IDR {amt:,.2f}** across {cnt} transactions this month (groceries, utilities, family care)."
            }
        elif "community" in q or "giving" in q or "donasi" in q or "sosial" in q:
            c_data = next((e for e in entity_breakdown if e["entity"] == "Community"), None)
            amt = c_data["total_amount"] if c_data else 0
            cnt = c_data["count"] if c_data else 0
            return {
                "answer": f"🤝 **Community & Giving:** You have contributed **IDR {amt:,.2f}** across {cnt} transactions this month."
            }
        elif "professional" in q or "work" in q or "kerja" in q or "bisnis" in q:
            pr_data = next((e for e in entity_breakdown if e["entity"] == "Professional"), None)
            amt = pr_data["total_amount"] if pr_data else 0
            cnt = pr_data["count"] if pr_data else 0
            return {
                "answer": f"💼 **Professional & Work:** You have invested **IDR {amt:,.2f}** across {cnt} transactions this month (software, work supplies, operations)."
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
        "answer": f"Hermes Financial Summary for {summary['month']}:\n- Total Spent: **IDR {total_spent:,.2f}**\n- Transactions: **{tx_count}**\n- Primary Category: **{top_cat}**\n- Average Burn Rate: **IDR {daily_velocity:,.2f}/day**\n\nYou can ask me specific questions like: *'How much did I spend on Food?'*, *'What are my Family expenses?'*, or *'Show top categories'*"
    }

@app.post("/api/seed")
def seed_sample_data():
    """
    Seeds initial realistic transactions including the user's exact BCA QRIS email
    and samples covering Personal, Family, Community, and Professional entities.
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
Total Payment : IDR 176,500.00
Reference No. : 9527120260828114500QRS77123901
Berita : Bulanan Rumah Tangga dan Susu
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
Payment to : GITHUB COPILOT WORKSPACE
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 310,000.00
Reference No. : 9527120260825153012VA44019231
Berita : Professional Developer Tool Subscription
""",
        """
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : 22 Aug 2026 13:00:00
Transaction Type : Transfer Antar Bank
Payment to : YAYASAN KITABISA INDONESIA
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 250,000.00
Reference No. : 9527120260822130000TF88102931
Berita : Donasi Bantuan Komunitas & Anak Asuh
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
Berita : Tagihan Listrik Rumah Tangga
"""
    ]

    # Ingest user's actual email
    email_listener.process_raw_email(sample_user_email)

    for s in other_samples:
        email_listener.process_raw_email(s)

    # Add dynamic transactions for current month / today so dashboard is immediately rich
    now = datetime.now()
    d_today = now.strftime("%d %b %Y 12:45:00")
    d_yest = (now - timedelta(days=1)).strftime("%d %b %Y 18:30:10")
    d_prev = (now - timedelta(days=2)).strftime("%d %b %Y 09:15:22")

    current_samples = [
        f"""
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : {d_today}
Transaction Type : QRIS Payment
Payment to : KOPI KENANGAN QBIG
Merchant Location : TANGERANG, ID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 32,000.00
Reference No. : 95271{now.strftime('%Y%m%d')}124500QRS01
""",
        f"""
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : {d_today}
Transaction Type : QRIS Payment
Payment to : BAKMI GM LIVING WORLD
Merchant Location : TANGERANG SELATAN, ID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 84,500.00
Reference No. : 95271{now.strftime('%Y%m%d')}131500QRS02
Berita : Makan Siang Bareng Rekan
""",
        f"""
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : {d_yest}
Transaction Type : QRIS Payment
Payment to : SUPERINDO FRESH BINTARO
Merchant Location : TANGERANG SELATAN, ID
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 215,000.00
Reference No. : 95271{now.strftime('%Y%m%d')}183010QRS03
Berita : Belanja Sayur & Buah Keluarga
""",
        f"""
Hello JONATHAN ADRIANUS GANI,
Status : Successful
Transaction Date : {d_prev}
Transaction Type : Pembayaran BCA Virtual Account
Payment to : ANTHROPIC CLAUDE API
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 320,000.00
Reference No. : 95271{now.strftime('%Y%m%d')}091522VA04
Berita : Subscription AI Assistant Work
"""
    ]

    for s in current_samples:
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
