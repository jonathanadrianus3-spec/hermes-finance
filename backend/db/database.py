import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(DB_DIR, "hermes_finance.db")

class Database:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Transactions Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reference_no TEXT UNIQUE NOT NULL,
                rrn TEXT,
                transaction_date TEXT NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'IDR',
                transaction_type TEXT,
                merchant_name TEXT NOT NULL,
                merchant_clean_name TEXT,
                merchant_location TEXT,
                source_of_fund TEXT,
                category TEXT NOT NULL,
                subcategory TEXT,
                entity TEXT DEFAULT 'Personal',
                status TEXT DEFAULT 'Successful',
                is_reviewed INTEGER DEFAULT 0,
                reviewed_at TEXT,
                notes TEXT,
                raw_text TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # Add is_reviewed column if migrating from older schema
            try:
                cursor.execute("ALTER TABLE transactions ADD COLUMN is_reviewed INTEGER DEFAULT 0;")
            except sqlite3.OperationalError:
                pass

            try:
                cursor.execute("ALTER TABLE transactions ADD COLUMN reviewed_at TEXT;")
            except sqlite3.OperationalError:
                pass

            # Categories Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                icon TEXT,
                color TEXT,
                monthly_budget REAL DEFAULT 0
            );
            """)

            # Custom Tagging Rules Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern TEXT NOT NULL,
                category TEXT NOT NULL,
                subcategory TEXT,
                entity TEXT DEFAULT 'Personal'
            );
            """)

            # Email Sync History Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sync_time TEXT DEFAULT CURRENT_TIMESTAMP,
                emails_scanned INTEGER DEFAULT 0,
                transactions_imported INTEGER DEFAULT 0,
                status TEXT,
                error_message TEXT
            );
            """)

            conn.commit()

    def insert_transaction(self, tx: Dict[str, Any]) -> Tuple[bool, int]:
        """
        Inserts transaction idempotently. Returns (is_new, transaction_id).
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if reference_no already exists
            cursor.execute("SELECT id FROM transactions WHERE reference_no = ?", (tx.get("reference_no"),))
            existing = cursor.fetchone()
            if existing:
                return False, existing["id"]

            cursor.execute("""
            INSERT INTO transactions (
                reference_no, rrn, transaction_date, amount, currency,
                transaction_type, merchant_name, merchant_clean_name,
                merchant_location, source_of_fund, category, subcategory,
                entity, status, is_reviewed, notes, raw_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tx.get("reference_no"),
                tx.get("rrn"),
                tx.get("transaction_date"),
                tx.get("amount", 0.0),
                tx.get("currency", "IDR"),
                tx.get("transaction_type"),
                tx.get("merchant_name", "Unknown Merchant"),
                tx.get("merchant_clean_name", tx.get("merchant_name")),
                tx.get("merchant_location"),
                tx.get("source_of_fund"),
                tx.get("category", "General / Others"),
                tx.get("subcategory"),
                tx.get("entity", "Personal"),
                tx.get("status", "Successful"),
                tx.get("is_reviewed", 0),
                tx.get("notes"),
                tx.get("raw_text")
            ))
            conn.commit()
            return True, cursor.lastrowid

    def get_pending_reviews(self, date_str: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches transactions that have not been categorized/reviewed by the user.
        If date_str is provided (YYYY-MM-DD), filters for that day.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if date_str:
                cursor.execute("""
                    SELECT * FROM transactions 
                    WHERE is_reviewed = 0 AND strftime('%Y-%m-%d', transaction_date) = ?
                    ORDER BY transaction_date ASC
                """, (date_str,))
            else:
                cursor.execute("""
                    SELECT * FROM transactions 
                    WHERE is_reviewed = 0
                    ORDER BY transaction_date ASC
                """)
            return [dict(r) for r in cursor.fetchall()]

    def mark_as_reviewed(self, tx_id: int, category: str, entity: str = "Personal") -> bool:
        """
        Marks transaction as reviewed and updates category and entity tag.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("""
                UPDATE transactions
                SET is_reviewed = 1, reviewed_at = ?, category = ?, entity = ?
                WHERE id = ?
            """, (now_iso, category, entity, tx_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_daily_summary(self, date_str: Optional[str] = None) -> Dict[str, Any]:
        """
        Summarizes expenses for a given day (default today).
        """
        if not date_str:
            date_str = datetime.now().strftime("%Y-%m-%d")

        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_spent,
                    COUNT(*) as tx_count
                FROM transactions
                WHERE strftime('%Y-%m-%d', transaction_date) = ?
            """, (date_str,))
            row = dict(cursor.fetchone())

            cursor.execute("""
                SELECT category, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count
                FROM transactions
                WHERE strftime('%Y-%m-%d', transaction_date) = ?
                GROUP BY category
                ORDER BY total_amount DESC
            """, (date_str,))
            cats = [dict(r) for r in cursor.fetchall()]

            return {
                "date": date_str,
                "total_spent": row["total_spent"],
                "tx_count": row["tx_count"],
                "categories": cats
            }

    def get_transactions(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        category: Optional[str] = None,
        entity: Optional[str] = None,
        month: Optional[str] = None
    ) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM transactions WHERE 1=1"
            params = []

            if search:
                query += " AND (merchant_name LIKE ? OR reference_no LIKE ? OR notes LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

            if category and category != "All":
                query += " AND category = ?"
                params.append(category)

            if entity and entity != "All":
                query += " AND entity = ?"
                params.append(entity)

            if month:
                query += " AND strftime('%Y-%m', transaction_date) = ?"
                params.append(month)

            count_query = query.replace("SELECT *", "SELECT COUNT(*)")
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            query += " ORDER BY transaction_date DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            rows = [dict(r) for r in cursor.fetchall()]

            return {"total": total, "items": rows}

    def get_analytics_summary(self, month: Optional[str] = None) -> Dict[str, Any]:
        if not month:
            month = datetime.now().strftime("%Y-%m")

        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_spent,
                    COUNT(*) as tx_count,
                    COALESCE(AVG(amount), 0) as avg_tx
                FROM transactions 
                WHERE strftime('%Y-%m', transaction_date) = ?
            """, (month,))
            curr = dict(cursor.fetchone())

            year, m_num = map(int, month.split("-"))
            prev_month = f"{year - 1}-12" if m_num == 1 else f"{year}-{str(m_num - 1).zfill(2)}"

            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0) as total_spent
                FROM transactions 
                WHERE strftime('%Y-%m', transaction_date) = ?
            """, (prev_month,))
            prev_total = cursor.fetchone()[0]

            cursor.execute("""
                SELECT category, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count
                FROM transactions
                WHERE strftime('%Y-%m', transaction_date) = ?
                GROUP BY category
                ORDER BY total_amount DESC
            """, (month,))
            category_breakdown = [dict(r) for r in cursor.fetchall()]

            cursor.execute("""
                SELECT entity, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count
                FROM transactions
                WHERE strftime('%Y-%m', transaction_date) = ?
                GROUP BY entity
            """, (month,))
            entity_breakdown = [dict(r) for r in cursor.fetchall()]

            cursor.execute("""
                SELECT transaction_type, COALESCE(SUM(amount), 0) as total_amount, COUNT(*) as count
                FROM transactions
                WHERE strftime('%Y-%m', transaction_date) = ?
                GROUP BY transaction_type
                ORDER BY total_amount DESC
            """, (month,))
            payment_type_breakdown = [dict(r) for r in cursor.fetchall()]

            cursor.execute("""
                SELECT strftime('%Y-%m-%d', transaction_date) as day, SUM(amount) as daily_total
                FROM transactions
                WHERE strftime('%Y-%m', transaction_date) = ?
                GROUP BY day
                ORDER BY day ASC
            """, (month,))
            daily_trends = [dict(r) for r in cursor.fetchall()]

            now = datetime.now()
            days_in_month = now.day if now.strftime("%Y-%m") == month else 30
            daily_velocity = curr["total_spent"] / max(days_in_month, 1)

            mom_change_pct = 0.0
            if prev_total > 0:
                mom_change_pct = ((curr["total_spent"] - prev_total) / prev_total) * 100

            top_category = category_breakdown[0]["category"] if category_breakdown else "None"

            return {
                "month": month,
                "total_spent": curr["total_spent"],
                "tx_count": curr["tx_count"],
                "avg_tx": curr["avg_tx"],
                "daily_velocity": daily_velocity,
                "prev_month_total": prev_total,
                "mom_change_pct": round(mom_change_pct, 1),
                "top_category": top_category,
                "category_breakdown": category_breakdown,
                "entity_breakdown": entity_breakdown,
                "payment_type_breakdown": payment_type_breakdown,
                "daily_trends": daily_trends
            }

    def log_sync(self, emails_scanned: int, imported: int, status: str, error: str = ""):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO sync_history (emails_scanned, transactions_imported, status, error_message)
            VALUES (?, ?, ?, ?)
            """, (emails_scanned, imported, status, error))
            conn.commit()

    def get_recent_sync_logs(self, limit: int = 5) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sync_history ORDER BY id DESC LIMIT ?", (limit,))
            return [dict(r) for r in cursor.fetchall()]
