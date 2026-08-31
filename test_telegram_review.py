import os
from backend.db.database import Database
from backend.parsers.bca_parser import BCAParser
from backend.parsers.categorizer import IndonesianCategorizer
from backend.services.email_listener import EmailListener

def test_telegram_nightly_flow():
    # Use in-memory or test database
    test_db_path = "backend/db/test_hermes.db"
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    db = Database(db_path=test_db_path)
    email_listener = EmailListener(db)

    # 1. Ingest User's BCA Email
    sample_email = """
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
"""
    tx = email_listener.process_raw_email(sample_email)
    print(f"[*] Ingested Transaction ID: {tx['id']}, Amount: IDR {tx['amount']}")

    # 2. Check Pending Reviews for 21:00 push
    pending = db.get_pending_reviews()
    print(f"[*] Pending transactions count before review: {len(pending)}")
    assert len(pending) == 1
    assert pending[0]["merchant_name"] == "ESB Restaurant Tech D"
    assert pending[0]["is_reviewed"] == 0

    # 3. Simulate User Tapping Telegram Inline Button "[ 🍔 Food ]"
    tx_id = pending[0]["id"]
    chosen_category = "Food & Dining"
    chosen_entity = "Personal"

    success = db.mark_as_reviewed(tx_id, chosen_category, chosen_entity)
    assert success is True
    print(f"[*] User tapped category: {chosen_category} [{chosen_entity}]")

    # 4. Verify Pending Queue is now 0
    pending_after = db.get_pending_reviews()
    print(f"[*] Pending transactions count after review: {len(pending_after)}")
    assert len(pending_after) == 0

    # 5. Verify Daily & Monthly Summaries
    summary = db.get_daily_summary("2026-08-30")
    print(f"[*] Daily Summary for 2026-08-30: Total = IDR {summary['total_spent']:,}, Categories = {summary['categories']}")
    assert summary["total_spent"] == 45320.0
    assert summary["categories"][0]["category"] == "Food & Dining"

    print("[SUCCESS] Full Telegram Nightly Review Flow verified successfully!")

    # Cleanup test db
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
    except Exception:
        pass

if __name__ == "__main__":
    test_telegram_nightly_flow()
