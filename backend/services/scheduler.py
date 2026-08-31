import time
import schedule
import logging
import threading
import asyncio
from datetime import datetime
from typing import Optional

from backend.db.database import Database
from backend.services.email_listener import EmailListener
from backend.bot.telegram_bot import HermesTelegramBot

logger = logging.getLogger(__name__)

class HermesScheduler:
    def __init__(self, db: Database, bot: HermesTelegramBot, loop: Optional[asyncio.AbstractEventLoop] = None):
        self.db = db
        self.bot = bot
        self.email_listener = EmailListener(db)
        self.loop = loop or asyncio.get_event_loop()
        self.running = False

    def job_sync_gmail(self):
        """Runs at 20:55 to gather all BCA emails from Gmail before the review."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] 🔄 [Scheduler 20:55] Running evening BCA Gmail sync...")
        res = self.email_listener.fetch_unseen_bca_emails(limit=50)
        print(f"[{now_str}] 🔄 [Scheduler 20:55] Sync finished: {res.get('message')}")

    def job_nightly_review(self):
        """Runs at 21:00 to push interactive Telegram review messages."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] 🌙 [Scheduler 21:00] Pushing nightly BCA review to Telegram...")
        if self.loop and self.bot:
            asyncio.run_coroutine_threadsafe(self.bot.push_nightly_review(), self.loop)

    def start_in_background(self):
        """Schedules jobs and starts the scheduler loop."""
        # 1. Sync Gmail at 20:55
        schedule.every().day.at("20:55").do(self.job_sync_gmail)
        
        # 2. Push Review to Telegram at 21:00
        schedule.every().day.at("21:00").do(self.job_nightly_review)

        self.running = True
        print("[*] Scheduler active: 20:55 Gmail Sync, 21:00 Telegram Review scheduled.")

        def run_loop():
            while self.running:
                schedule.run_pending()
                time.sleep(15)

        t = threading.Thread(target=run_loop, daemon=True)
        t.start()

    def stop(self):
        self.running = False
