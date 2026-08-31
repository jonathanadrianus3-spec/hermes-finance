import imaplib
import email
from email.header import decode_header
import os
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.parsers.bca_parser import BCAParser
from backend.parsers.categorizer import IndonesianCategorizer
from backend.db.database import Database

class EmailListener:
    """
    IMAP Email Service for automated background ingestion of BCA transaction emails.
    Connects to Gmail, Outlook, or any IMAP provider.
    """

    def __init__(self, db: Database):
        self.db = db
        self.host = os.getenv("EMAIL_HOST", "imap.gmail.com")
        self.port = int(os.getenv("EMAIL_PORT", "993"))
        self.user = os.getenv("EMAIL_USER", "")
        self.password = os.getenv("EMAIL_PASSWORD", "")
        self.folder = os.getenv("EMAIL_FOLDER", "INBOX")

    def process_raw_email(self, raw_content: str, sender: str = "", subject: str = "") -> Optional[Dict[str, Any]]:
        """
        Parses raw email content, categorizes it, and inserts it into database.
        Returns parsed transaction dict and whether it was newly inserted.
        """
        parsed = BCAParser.parse_email_content(raw_content, sender=sender, subject=subject)
        if not parsed:
            return None

        # Classify merchant & entity
        clean_merchant = IndonesianCategorizer.clean_merchant_name(parsed["merchant_name"])
        category, subcategory, entity = IndonesianCategorizer.classify(
            merchant_name=clean_merchant,
            tx_type=parsed.get("transaction_type", ""),
            notes=parsed.get("notes", "")
        )

        parsed["merchant_clean_name"] = clean_merchant
        parsed["category"] = category
        parsed["subcategory"] = subcategory
        parsed["entity"] = entity

        is_new, tx_id = self.db.insert_transaction(parsed)
        parsed["is_new"] = is_new
        parsed["id"] = tx_id
        return parsed

    def fetch_unseen_bca_emails(self, limit: int = 20) -> Dict[str, Any]:
        """
        Connects via IMAP, searches for recent BCA transaction emails, and logs them.
        """
        if not self.user or not self.password or self.user == "your_email@gmail.com":
            return {
                "success": False,
                "message": "Email credentials not configured in .env",
                "imported": 0,
                "scanned": 0
            }

        scanned = 0
        imported = 0
        try:
            # Connect over SSL
            mail = imaplib.IMAP4_SSL(self.host, self.port)
            mail.login(self.user, self.password)
            mail.select(self.folder)

            # Search for BCA related emails
            # Try searching for emails from BCA or containing BCA in subject
            status, messages = mail.search(None, '(OR FROM "bca" SUBJECT "myBCA")')
            if status != "OK" or not messages[0]:
                status, messages = mail.search(None, '(OR SUBJECT "Transaksi" SUBJECT "BCA")')

            email_ids = messages[0].split() if messages and messages[0] else []
            # Take latest N emails
            email_ids = email_ids[-limit:] if email_ids else []

            for e_id in reversed(email_ids):
                scanned += 1
                res, msg_data = mail.fetch(e_id, "(RFC822)")
                if res != "OK":
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Extract Subject
                        subject, encoding = decode_header(msg.get("Subject", ""))[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding or "utf-8", errors="ignore")

                        # Extract From
                        sender = msg.get("From", "")

                        # Extract Body
                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                content_type = part.get_content_type()
                                content_disposition = str(part.get("Content-Disposition"))
                                if "attachment" not in content_disposition:
                                    if content_type == "text/html":
                                        body = part.get_payload(decode=True).decode(errors="ignore")
                                        break
                                    elif content_type == "text/plain" and not body:
                                        body = part.get_payload(decode=True).decode(errors="ignore")
                        else:
                            body = msg.get_payload(decode=True).decode(errors="ignore")

                        res_tx = self.process_raw_email(body, sender=sender, subject=subject)
                        if res_tx and res_tx.get("is_new"):
                            imported += 1

            mail.close()
            mail.logout()

            self.db.log_sync(emails_scanned=scanned, imported=imported, status="SUCCESS")
            return {
                "success": True,
                "message": f"Successfully scanned {scanned} emails, imported {imported} new transactions.",
                "imported": imported,
                "scanned": scanned
            }

        except Exception as e:
            err_msg = str(e)
            self.db.log_sync(emails_scanned=scanned, imported=imported, status="ERROR", error=err_msg)
            return {
                "success": False,
                "message": f"IMAP Sync failed: {err_msg}",
                "imported": imported,
                "scanned": scanned
            }
