import re
from datetime import datetime
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup

class BCAParser:
    """
    Parser for BCA & myBCA transaction notification emails (HTML & Plaintext).
    Supports QRIS, Bank Transfer, Virtual Account (VA), and Debit payments.
    """

    MONTH_MAP = {
        "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "mei": "05",
        "jun": "06", "jul": "07", "aug": "08", "agu": "08", "sep": "09", "oct": "10",
        "okt": "10", "nov": "11", "dec": "12", "des": "12"
    }

    @classmethod
    def clean_html(cls, raw_content: str) -> str:
        """Convert HTML email body to clean readable text lines while preserving structure."""
        if not raw_content:
            return ""
        if "<html" in raw_content.lower() or "<table" in raw_content.lower() or "<div" in raw_content.lower():
            soup = BeautifulSoup(raw_content, "html.parser")
            # Replace line break tags with newlines
            for br in soup.find_all(["br", "p", "tr", "div"]):
                br.insert_after("\n")
            text = soup.get_text()
        else:
            text = raw_content
        
        # Normalize carriage returns and multiple spaces
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

    @classmethod
    def parse_amount(cls, amount_str: str) -> tuple[float, str]:
        """
        Parses amount strings like 'IDR 45,320.00', 'Rp 45.320,00', '45,320.00', 'USD 120.00'.
        Returns (numeric_amount, currency).
        """
        if not amount_str:
            return 0.0, "IDR"
        
        currency = "IDR"
        clean = amount_str.strip()
        
        if "USD" in clean.upper() or "$" in clean:
            currency = "USD"
        elif "SGD" in clean.upper():
            currency = "SGD"
        elif "EUR" in clean.upper() or "€" in clean:
            currency = "EUR"
        elif "IDR" in clean.upper() or "RP" in clean.upper():
            currency = "IDR"

        # Remove currency words
        clean = re.sub(r'(?i)(IDR|Rp\.?|USD|\$|SGD|EUR|€)', '', clean).strip()

        # Handle Indonesian number format: 45.320,00 vs Standard format: 45,320.00
        # If it has both '.' and ','
        if "." in clean and "," in clean:
            if clean.rfind(",") > clean.rfind("."):
                # Indonesian format: dots are thousands, comma is decimal (e.g. 45.320,00)
                clean = clean.replace(".", "").replace(",", ".")
            else:
                # Standard format: commas are thousands, dot is decimal (e.g. 45,320.00)
                clean = clean.replace(",", "")
        elif "," in clean:
            # Single comma: if 2 digits after comma, it's decimal, else thousands
            parts = clean.split(",")
            if len(parts[-1]) == 2:
                clean = clean.replace(",", ".")
            else:
                clean = clean.replace(",", "")
        elif "." in clean:
            parts = clean.split(".")
            if len(parts[-1]) == 3 and len(parts) > 1:
                # E.g. 45.000 -> 45000
                clean = clean.replace(".", "")

        # Extract only digits and decimal point
        clean = re.sub(r'[^\d.]', '', clean)
        try:
            val = float(clean)
            return val, currency
        except ValueError:
            return 0.0, currency

    @classmethod
    def parse_date(cls, date_str: str) -> str:
        """
        Normalizes date strings to ISO format 'YYYY-MM-DD HH:MM:SS'.
        Supports:
        - 30 Aug 2026 18:24:28 / 30 Agu 2026 18:24:28
        - 30/08/2026 18:24:28
        - 2026-08-30 18:24:28
        """
        if not date_str:
            return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cleaned = date_str.strip()

        # Try matching: '30 Aug 2026 18:24:28' or '30 Aug 2026, 18:24:28'
        m = re.search(r'(\d{1,2})\s+([A-Za-z]{3,4})\s+(\d{4})(?:[,\s]+(\d{1,2}:\d{2}(?::\d{2})?))?', cleaned)
        if m:
            day = m.group(1).zfill(2)
            month_raw = m.group(2).lower()[:3]
            month = cls.MONTH_MAP.get(month_raw, "01")
            year = m.group(3)
            time_part = m.group(4) if m.group(4) else "00:00:00"
            if len(time_part.split(":")) == 2:
                time_part += ":00"
            return f"{year}-{month}-{day} {time_part}"

        # Try matching '30/08/2026 18:24:28' or '30-08-2026'
        m2 = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[,\s]+(\d{1,2}:\d{2}(?::\d{2})?))?', cleaned)
        if m2:
            day = m2.group(1).zfill(2)
            month = m2.group(2).zfill(2)
            year = m2.group(3)
            time_part = m2.group(4) if m2.group(4) else "00:00:00"
            if len(time_part.split(":")) == 2:
                time_part += ":00"
            return f"{year}-{month}-{day} {time_part}"

        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    @classmethod
    def parse_email_content(cls, raw_text_or_html: str, sender: str = "", subject: str = "") -> Optional[Dict[str, Any]]:
        """
        Main parser function. Ingests raw BCA email body and outputs normalized transaction dictionary.
        """
        text = cls.clean_html(raw_text_or_html)
        if not text:
            return None

        # Check if this is a BCA transaction notification
        is_bca = any(k in text.lower() for k in ["mybca", "klikbca", "halo bca", "bank central asia", "bca", "qris payment", "tahapan"]) or "bca" in sender.lower() or "bca" in subject.lower()
        if not is_bca:
            return None

        # Key-value extractor helper using flexible regex
        def get_field(*patterns):
            for pat in patterns:
                # Match lines like "Key : Value" or "Key: Value" or "Key \n Value"
                m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
                if m:
                    val = m.group(1).strip()
                    # Clean trailing colons or noise
                    val = re.sub(r'^:\s*', '', val).strip()
                    if val:
                        return val
            return ""

        # Extract fields
        status = get_field(
            r'Status\s*[:]\s*([^\n]+)',
            r'Status Transaksi\s*[:]\s*([^\n]+)'
        ) or "Successful"

        tx_date_raw = get_field(
            r'Transaction Date\s*[:]\s*([^\n]+)',
            r'Tanggal Transaksi\s*[:]\s*([^\n]+)',
            r'Tanggal\s*[:]\s*([^\n]+)',
            r'Date\s*[:]\s*([^\n]+)'
        )
        tx_date = cls.parse_date(tx_date_raw)

        tx_type = get_field(
            r'Transaction Type\s*[:]\s*([^\n]+)',
            r'Jenis Transaksi\s*[:]\s*([^\n]+)',
            r'Tipe Transaksi\s*[:]\s*([^\n]+)'
        )
        if not tx_type:
            if "qris" in text.lower():
                tx_type = "QRIS Payment"
            elif "virtual account" in text.lower():
                tx_type = "Virtual Account"
            elif "transfer" in text.lower():
                tx_type = "Bank Transfer"
            else:
                tx_type = "BCA Transaction"

        payment_to = get_field(
            r'Payment to\s*[:]\s*([^\n]+)',
            r'Pembayaran ke\s*[:]\s*([^\n]+)',
            r'Merchant Name\s*[:]\s*([^\n]+)',
            r'Nama Merchant\s*[:]\s*([^\n]+)',
            r'Transfer to\s*[:]\s*([^\n]+)',
            r'Tujuan Transfer\s*[:]\s*([^\n]+)',
            r'Nama Penerima\s*[:]\s*([^\n]+)',
            r'Beneficiary Name\s*[:]\s*([^\n]+)',
            r'Nama Perusahaan\s*[:]\s*([^\n]+)',
            r'Company Name\s*[:]\s*([^\n]+)'
        )

        merchant_location = get_field(
            r'Merchant Location\s*[:]\s*([^\n]+)',
            r'Lokasi Merchant\s*[:]\s*([^\n]+)',
            r'Kota\s*[:]\s*([^\n]+)'
        )

        source_of_fund = get_field(
            r'Source of Fund\s*[:]\s*([^\n]+)',
            r'Sumber Dana\s*[:]\s*([^\n]+)',
            r'Dari Rekening\s*[:]\s*([^\n]+)',
            r'Rekening Sumber\s*[:]\s*([^\n]+)',
            r'Account Number\s*[:]\s*([^\n]+)'
        )

        total_payment_raw = get_field(
            r'Total Payment\s*[:]\s*([^\n]+)',
            r'Total Pembayaran\s*[:]\s*([^\n]+)',
            r'Jumlah Pembayaran\s*[:]\s*([^\n]+)',
            r'Jumlah Transaksi\s*[:]\s*([^\n]+)',
            r'Nominal\s*[:]\s*([^\n]+)',
            r'Amount\s*[:]\s*([^\n]+)',
            r'Total\s*[:]\s*(IDR[^\n]+|Rp[^\n]+|\$[\d,.]+)'
        )
        amount, currency = cls.parse_amount(total_payment_raw)

        rrn = get_field(
            r'RRN\s*[:]\s*([^\n]+)',
            r'Retrieval Reference Number\s*[:]\s*([^\n]+)'
        )

        reference_no = get_field(
            r'Reference No\.?\s*[:]\s*([^\n]+)',
            r'No\.?\s*Referensi\s*[:]\s*([^\n]+)',
            r'Nomor Referensi\s*[:]\s*([^\n]+)',
            r'ID Transaksi\s*[:]\s*([^\n]+)'
        )

        # Fallback reference number generation if not present
        if not reference_no:
            if rrn:
                reference_no = f"BCA-RRN-{rrn}"
            else:
                # Create deterministic hash from date + amount + merchant
                import hashlib
                token = f"{tx_date}_{amount}_{payment_to}"
                reference_no = f"BCA-GEN-{hashlib.md5(token.encode()).hexdigest()[:16]}"

        customer_name = get_field(
            r'Hello\s+([A-Za-z\s]+),',
            r'Halo\s+([A-Za-z\s]+),'
        )

        notes = get_field(
            r'Berita\s*[:]\s*([^\n]+)',
            r'Remark\s*[:]\s*([^\n]+)',
            r'Catatan\s*[:]\s*([^\n]+)',
            r'Description\s*[:]\s*([^\n]+)'
        )

        # Default merchant to Transfer for unstated recipients or transfers
        default_merchant = "Transfer" if not payment_to or payment_to.strip().lower() == "unknown merchant" else payment_to

        return {
            "reference_no": reference_no,
            "rrn": rrn,
            "status": status,
            "transaction_date": tx_date,
            "transaction_type": tx_type,
            "merchant_name": default_merchant,
            "merchant_location": merchant_location,
            "source_of_fund": source_of_fund or "myBCA",
            "amount": amount,
            "currency": currency,
            "customer_name": customer_name,
            "notes": notes,
            "raw_text": text[:3000]
        }
