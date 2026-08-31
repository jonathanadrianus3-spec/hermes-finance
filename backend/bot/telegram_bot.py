import os
import logging
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    BotCommand
)
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters
)

from backend.db.database import Database
from backend.services.email_listener import EmailListener

logger = logging.getLogger(__name__)

# Category presets for 1-tap buttons
CATEGORY_BUTTONS = [
    [
        InlineKeyboardButton("🍔 Food", callback_data="cat:{id}:Food & Dining:Personal"),
        InlineKeyboardButton("🛒 Groceries", callback_data="cat:{id}:Groceries & Supermarket:Personal"),
    ],
    [
        InlineKeyboardButton("💊 Health", callback_data="cat:{id}:Healthcare & Wellness:Personal"),
        InlineKeyboardButton("🎬 Entertainment", callback_data="cat:{id}:Entertainment & Leisure:Personal"),
    ],
    [
        InlineKeyboardButton("🚗 Transport", callback_data="cat:{id}:Transportation & Fuel:Personal"),
        InlineKeyboardButton("⚡ Bills", callback_data="cat:{id}:Bills & Utilities:Personal"),
    ],
    [
        InlineKeyboardButton("🥥 Miriva (B2C)", callback_data="cat:{id}:Miriva Operations:Miriva"),
        InlineKeyboardButton("🏭 Surejase (B2B)", callback_data="cat:{id}:Surejase Operations:Surejase"),
    ],
    [
        InlineKeyboardButton("📦 Other", callback_data="cat:{id}:General / Others:Personal"),
    ]
]

def format_idr(amount: float) -> str:
    return f"IDR {amount:,.2f}"

def format_tx_card(tx: Dict[str, Any]) -> str:
    """Formats a pending transaction into a clean Telegram message."""
    location_str = f"\n📍 Location: `{tx.get('merchant_location')}`" if tx.get('merchant_location') else ""
    notes_str = f"\n📝 Notes: `{tx.get('notes')}`" if tx.get('notes') else ""
    fund_str = f"\n💳 Source: `{tx.get('source_of_fund', 'myBCA')}`"

    return (
        f"⚡ **BCA Transaction Review**\n\n"
        f"🏪 **Merchant:** `{tx['merchant_name']}`\n"
        f"💰 **Total:** `{format_idr(tx['amount'])}`\n"
        f"📱 **Type:** `{tx['transaction_type']}`\n"
        f"🕒 **Date:** `{tx['transaction_date']}`"
        f"{location_str}"
        f"{fund_str}"
        f"{notes_str}\n\n"
        f"👇 **Tap category below to tag:**"
    )

def build_category_keyboard(tx_id: int) -> InlineKeyboardMarkup:
    """Builds inline keyboard for a specific transaction ID."""
    rows = []
    for row in CATEGORY_BUTTONS:
        keyboard_row = []
        for btn in row:
            new_cb = btn.callback_data.format(id=tx_id)
            keyboard_row.append(InlineKeyboardButton(btn.text, callback_data=new_cb))
        rows.append(keyboard_row)
    return InlineKeyboardMarkup(rows)

class HermesTelegramBot:
    def __init__(self, db: Database, token: Optional[str] = None, default_chat_id: Optional[str] = None):
        self.db = db
        self.token = token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.default_chat_id = default_chat_id or os.getenv("TELEGRAM_CHAT_ID", "")
        self.email_listener = EmailListener(db)
        self.app: Optional[Application] = None

    def build_application(self) -> Application:
        if not self.token:
            raise ValueError("TELEGRAM_BOT_TOKEN is not set in environment or .env file.")

        builder = Application.builder().token(self.token)
        app = builder.build()

        # Command Handlers
        app.add_handler(CommandHandler("start", self.cmd_start))
        app.add_handler(CommandHandler("review", self.cmd_review))
        app.add_handler(CommandHandler("today", self.cmd_today))
        app.add_handler(CommandHandler("month", self.cmd_month))
        app.add_handler(CommandHandler("sync", self.cmd_sync))
        app.add_handler(CommandHandler("pending", self.cmd_pending))
        app.add_handler(CommandHandler("help", self.cmd_help))

        # Callback Query Handler for 1-tap buttons
        app.add_handler(CallbackQueryHandler(self.handle_callback))

        self.app = app
        return app

    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        msg = (
            f"⚡ **Welcome to Hermes Finance Bot!**\n\n"
            f"I am your autonomous personal finance agent running on your VPS.\n\n"
            f"📌 **Your Chat ID:** `{chat_id}`\n"
            f"(Save this to `TELEGRAM_CHAT_ID` in your `.env`)\n\n"
            f"🌙 **Every night at 21:00**, I will gather all your daily BCA transactions so you can categorize them with **1 tap**.\n\n"
            f"**Quick Commands:**\n"
            f"• `/review` - Review today's pending transactions now\n"
            f"• `/today` - Today's expense summary\n"
            f"• `/month` - Month-to-date breakdown\n"
            f"• `/sync` - Check Gmail for new BCA emails now\n"
            f"• `/pending` - Show unreviewed count\n"
            f"• `/help` - Help menu"
        )
        await update.message.reply_text(msg, parse_mode="Markdown")

    async def cmd_review(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Sends interactive cards for all pending transactions."""
        pending = self.db.get_pending_reviews()
        if not pending:
            await update.message.reply_text("✅ **All caught up!** No pending BCA transactions to review.", parse_mode="Markdown")
            return

        await update.message.reply_text(
            f"🌙 **Found {len(pending)} pending transaction(s).** Tap a button to categorize:",
            parse_mode="Markdown"
        )

        for tx in pending:
            card_text = format_tx_card(tx)
            reply_markup = build_category_keyboard(tx["id"])
            await update.message.reply_text(card_text, reply_markup=reply_markup, parse_mode="Markdown")

    async def cmd_today(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Shows summary of today's expenses."""
        summary = self.db.get_daily_summary()
        date_str = summary["date"]
        total = summary["total_spent"]
        count = summary["tx_count"]
        cats = summary["categories"]

        if count == 0:
            await update.message.reply_text(f"📊 **Today's Expenses ({date_str}):**\nNo transactions logged today.", parse_mode="Markdown")
            return

        cat_lines = "\n".join([f"• **{c['category']}:** `{format_idr(c['total_amount'])}` ({c['count']} txs)" for c in cats])
        msg = (
            f"📊 **Today's Expenses ({date_str})**\n\n"
            f"💰 **Total Spent:** `{format_idr(total)}`\n"
            f"🔢 **Transactions:** `{count}`\n\n"
            f"**Category Breakdown:**\n{cat_lines}"
        )
        await update.message.reply_text(msg, parse_mode="Markdown")

    async def cmd_month(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Shows month-to-date analytics."""
        summary = self.db.get_analytics_summary()
        month = summary["month"]
        total = summary["total_spent"]
        velocity = summary["daily_velocity"]
        cats = summary["category_breakdown"]
        entities = summary["entity_breakdown"]

        cat_lines = "\n".join([f"• **{c['category']}:** `{format_idr(c['total_amount'])}`" for c in cats[:6]])
        ent_lines = "\n".join([f"• **{e['entity']}:** `{format_idr(e['total_amount'])}`" for e in entities])

        msg = (
            f"📈 **Month-to-Date Summary ({month})**\n\n"
            f"💰 **Total Outflow:** `{format_idr(total)}`\n"
            f"⚡ **Daily Burn Rate:** `{format_idr(velocity)}/day`\n"
            f"🔢 **Total Transactions:** `{summary['tx_count']}`\n\n"
            f"**Top Categories:**\n{cat_lines}\n\n"
            f"**Entity Split:**\n{ent_lines}"
        )
        await update.message.reply_text(msg, parse_mode="Markdown")

    async def cmd_sync(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Triggers immediate Gmail IMAP sync."""
        await update.message.reply_text("🔄 Checking Gmail for recent BCA emails...", parse_mode="Markdown")
        res = self.email_listener.fetch_unseen_bca_emails(limit=20)
        
        if res.get("success"):
            imported = res.get("imported", 0)
            scanned = res.get("scanned", 0)
            if imported > 0:
                await update.message.reply_text(
                    f"✅ **Sync Completed!**\nFound **{imported} new BCA transactions** (scanned {scanned} emails).\nUse `/review` to categorize them now!",
                    parse_mode="Markdown"
                )
            else:
                await update.message.reply_text(
                    f"✅ **Inbox is up to date.** (Scanned {scanned} emails, no new transactions).",
                    parse_mode="Markdown"
                )
        else:
            await update.message.reply_text(
                f"⚠️ **Sync Warning:** {res.get('message')}\nMake sure your `EMAIL_USER` and `EMAIL_PASSWORD` are configured in `.env`.",
                parse_mode="Markdown"
            )

    async def cmd_pending(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Shows pending count."""
        pending = self.db.get_pending_reviews()
        if pending:
            await update.message.reply_text(
                f"⏳ You have **{len(pending)} pending transaction(s)** waiting for categorization.\nType `/review` to tag them now!",
                parse_mode="Markdown"
            )
        else:
            await update.message.reply_text("✨ You have 0 pending transactions. Everything is categorized!", parse_mode="Markdown")

    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        msg = (
            f"🤖 **Hermes Finance Bot Commands:**\n\n"
            f"• `/review` — Start interactive review of today's pending transactions\n"
            f"• `/today` — Today's total spending summary\n"
            f"• `/month` — Month-to-date category & burn rate report\n"
            f"• `/sync` — Force an immediate Gmail sync for BCA emails\n"
            f"• `/pending` — Show number of unreviewed items\n"
            f"• `/help` — Show this guide\n\n"
            f"⏰ **Automated Schedule:**\n"
            f"• **20:55:** Hermes connects to Gmail and gathers all today's BCA emails\n"
            f"• **21:00:** Hermes sends you the nightly interactive review push"
        )
        await update.message.reply_text(msg, parse_mode="Markdown")

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handles 1-tap category button callbacks."""
        query = update.callback_query
        await query.answer()

        data = query.data
        if not data.startswith("cat:"):
            return

        parts = data.split(":")
        if len(parts) < 4:
            return

        tx_id = int(parts[1])
        category = parts[2]
        entity = parts[3]

        # Update in DB
        success = self.db.mark_as_reviewed(tx_id, category, entity)
        if not success:
            await query.edit_message_text("⚠️ Could not update transaction.")
            return

        # Fetch updated record
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
            row = cursor.fetchone()
            tx = dict(row) if row else {}

        # Edit message to confirmed state
        confirmed_msg = (
            f"✅ **Transaction Categorized!**\n\n"
            f"🏪 **Merchant:** `{tx.get('merchant_name')}`\n"
            f"💰 **Amount:** `{format_idr(tx.get('amount', 0))}`\n"
            f"🏷️ **Category:** `{category}`\n"
            f"👤 **Entity:** `{entity}`\n"
            f"🕒 **Date:** `{tx.get('transaction_date')}`\n"
            f"🔖 **Ref:** `{tx.get('reference_no')}`"
        )

        await query.edit_message_text(confirmed_msg, parse_mode="Markdown")

    async def push_nightly_review(self, target_chat_id: Optional[str] = None):
        """Pushes pending transactions to Telegram at 21:00."""
        chat_id = target_chat_id or self.default_chat_id
        if not chat_id or not self.app:
            logger.warning("No chat_id configured for nightly review push.")
            return

        pending = self.db.get_pending_reviews()
        if not pending:
            try:
                await self.app.bot.send_message(
                    chat_id=chat_id,
                    text="🌙 **Hermes 21:00 Nightly Check:** No new BCA transactions today. You're all caught up! ✨",
                    parse_mode="Markdown"
                )
            except Exception as e:
                logger.error(f"Failed to send 21:00 empty message: {e}")
            return

        try:
            await self.app.bot.send_message(
                chat_id=chat_id,
                text=f"🌙 **Hermes Nightly Review (21:00)**\nFound **{len(pending)} BCA transaction(s)** today. Tap a category below to tag each one in seconds:",
                parse_mode="Markdown"
            )

            for tx in pending:
                card_text = format_tx_card(tx)
                reply_markup = build_category_keyboard(tx["id"])
                await self.app.bot.send_message(
                    chat_id=chat_id,
                    text=card_text,
                    reply_markup=reply_markup,
                    parse_mode="Markdown"
                )
        except Exception as e:
            logger.error(f"Failed to send nightly review push: {e}")
