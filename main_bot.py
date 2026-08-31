import os
import sys
import logging
import asyncio
from dotenv import load_dotenv

load_dotenv()

from backend.db.database import Database
from backend.bot.telegram_bot import HermesTelegramBot
from backend.services.scheduler import HermesScheduler

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("HermesBot")

async def main():
    db = Database()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()

    print("================================================================")
    print("⚡ Hermes Telegram Bot & VPS Nightly BCA Review Agent")
    print("================================================================")

    if not token or token == "your_telegram_bot_token_here":
        print("\n⚠️  TELEGRAM_BOT_TOKEN is not configured yet!")
        print("To setup your Telegram bot in 30 seconds:")
        print("1. Open Telegram on your phone and search for @BotFather")
        print("2. Send /newbot, give it a name (e.g. 'My Hermes Finance Bot')")
        print("3. Copy the HTTP API token into your .env file: TELEGRAM_BOT_TOKEN=...")
        print("4. Start your bot on Telegram, send /start to get your Chat ID.")
        print("5. Put your Chat ID in .env: TELEGRAM_CHAT_ID=...\n")
        print("Also configure your Gmail credentials in .env to enable 20:55 auto-sync:")
        print("EMAIL_USER=your_email@gmail.com")
        print("EMAIL_PASSWORD=your_gmail_app_password (generated at myaccount.google.com/apppasswords)\n")
        print("Press Ctrl+C to exit or update .env and restart.")
        return

    bot = HermesTelegramBot(db=db, token=token, default_chat_id=chat_id)
    app = bot.build_application()

    # Start background scheduler (20:55 sync & 21:00 push)
    loop = asyncio.get_running_loop()
    scheduler = HermesScheduler(db=db, bot=bot, loop=loop)
    scheduler.start_in_background()

    print(f"[*] Hermes Bot connected to Telegram!")
    print(f"[*] Default Chat ID: {chat_id or 'Will be captured on /start'}")
    print(f"[*] Nightly Schedule: 20:55 Gmail Sync -> 21:00 Telegram Review Push")
    print(f"[*] Bot is listening for /start, /review, /today, /month, /sync...")
    print("================================================================")

    # Initialize and run polling
    await app.initialize()
    await app.start()
    await app.updater.start_polling()

    # Keep running until interrupted
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        print("\nStopping Hermes Telegram Bot...")
    finally:
        scheduler.stop()
        await app.updater.stop()
        await app.stop()
        await app.shutdown()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExited.")
