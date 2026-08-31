import re
from typing import Dict, Any, Tuple

class IndonesianCategorizer:
    """
    Intelligent classifier for Indonesian merchants and expense categories.
    Recognizes POS providers, e-commerce, supermarkets, dining, utilities,
    and business entity tags (Personal vs. Miriva vs. Surejase).
    """

    # Category definitions with icons and default colors
    CATEGORIES = {
        "Food & Dining": {"icon": "🍔", "color": "#f59e0b", "budget": 3000000},
        "Groceries & Supermarket": {"icon": "🛒", "color": "#10b981", "budget": 2000000},
        "Shopping & E-Commerce": {"icon": "🛍️", "color": "#ec4899", "budget": 2500000},
        "Transportation & Fuel": {"icon": "🚗", "color": "#3b82f6", "budget": 1500000},
        "Bills & Utilities": {"icon": "⚡", "color": "#8b5cf6", "budget": 1200000},
        "Subscriptions & SaaS": {"icon": "🔄", "color": "#06b6d4", "budget": 800000},
        "Healthcare & Wellness": {"icon": "💊", "color": "#14b8a6", "budget": 500000},
        "Miriva Operations": {"icon": "🥥", "color": "#eab308", "budget": 0},
        "Surejase Operations": {"icon": "🏭", "color": "#6366f1", "budget": 0},
        "Transfer & Financial": {"icon": "💳", "color": "#64748b", "budget": 0},
        "General / Others": {"icon": "📦", "color": "#94a3b8", "budget": 1000000}
    }

    # Merchant pattern match rules
    RULES = [
        # Business Operations (Miriva / Surejase keywords)
        (r'\b(miriva|candlenut|kemiri|packaging\s*b2c|shopee\s*ad|tiktok\s*shop\s*seller)\b', "Miriva Operations", "Packaging / Ad Spend", "Miriva"),
        (r'\b(surejase|bulk\s*oil|drum|industrial|distributor|b2b\s*logistics)\b', "Surejase Operations", "Supply Chain / Bulk Logistics", "Surejase"),

        # Food & Dining & POS providers
        (r'\b(esb\s*restaurant|moka|pawoon|solaria|kfc|mcdonald|hokben|starbucks|kopi\s*kenangan|janji\s*jiwa|fore|chatime|bakmi\s*gm|gacoan|richeese|sate|resto|cafe|coffee|warung|dapur|kitchen|culinary|food|nasi|mie|roti|breadtalk|jco|subway|pizza\s*hut|marugame)\b', "Food & Dining", "Restaurant / Cafe", "Personal"),
        
        # Groceries & Supermarkets
        (r'\b(alfamart|indomaret|sumber\s*alfaria|indomarco|superindo|super\s*indo|hypermart|hero|grand\s*lucky|ranch\s*market|farmers\s*market|sayurbox|pasar|toko\s*buah|buah|sembako)\b', "Groceries & Supermarket", "Daily Groceries", "Personal"),

        # Transportation & Fuel
        (r'\b(pertamina|mypertamina|spbu|shell|bp\s*akr|gojek|gofood|goride|gocar|grab|grabfood|grabbike|grabcar|maxim|bluebird|mybluebird|kai|kereta|mrt|lrt|transjakarta|etoll|toll|parkir|parking)\b', "Transportation & Fuel", "Fuel & Commute", "Personal"),

        # E-Commerce & Retail Shopping
        (r'\b(shopee|tokopedia|tiktok\s*shop|blibli|lazada|zalora|uniqlo|zara|h&m|ikea|ace\s*hardware|mitra10|gramedia|sociolla)\b', "Shopping & E-Commerce", "Online Shopping", "Personal"),

        # Bills & Utilities
        (r'\b(pln|token\s*listrik|pdam|telkom|telkomsel|indihome|myrepublic|biznet|xl\s*axiata|indosat|tri|smartfren|bpjs|pajak|pbb)\b', "Bills & Utilities", "Electricity / Internet / Phone", "Personal"),

        # Subscriptions & Digital Tools
        (r'\b(netflix|spotify|youtube\s*premium|apple\.com|google\s*storage|icloud|chatgpt|openai|anthropic|github|canva|adobe|midjourney|curseforge|steam|playstation)\b', "Subscriptions & SaaS", "Digital Subscription", "Personal"),

        # Healthcare & Wellness
        (r'\b(halodoc|alodokter|kimia\s*farma|k24|century|guardian|watson|apotek|klinik|rs\s*|rumah\s*sakit|optik|gym|fitness)\b', "Healthcare & Wellness", "Pharmacy / Health", "Personal"),
    ]

    @classmethod
    def clean_merchant_name(cls, raw_merchant: str) -> str:
        """
        Cleans up legal/POS noise from merchant names.
        E.g., 'ESB Restaurant Tech D' -> 'ESB Restaurant Tech D'
        'PT Sumber Alfaria Trijaya Tbk' -> 'Alfamart (PT Sumber Alfaria)'
        """
        if not raw_merchant:
            return "Unknown Merchant"
        
        name = raw_merchant.strip()
        # Common aliases
        if re.search(r'sumber\s*alfaria', name, re.IGNORECASE):
            return "Alfamart"
        if re.search(r'indomarco\s*prismatama', name, re.IGNORECASE):
            return "Indomaret"
        if re.search(r'pertamina\s*patra\s*niaga|spbu', name, re.IGNORECASE):
            return "SPBU Pertamina"
            
        return name

    @classmethod
    def classify(cls, merchant_name: str, tx_type: str = "", notes: str = "") -> Tuple[str, str, str]:
        """
        Returns (category, subcategory, entity)
        where entity is 'Personal', 'Miriva', or 'Surejase'.
        """
        search_target = f"{merchant_name} {tx_type} {notes}".lower()

        for pattern, category, subcategory, entity in cls.RULES:
            if re.search(pattern, search_target, re.IGNORECASE):
                return category, subcategory, entity

        # Default heuristics based on transaction type
        if "qris" in tx_type.lower():
            return "Food & Dining", "QRIS Merchant", "Personal"
        elif "transfer" in tx_type.lower():
            return "Transfer & Financial", "Bank Transfer", "Personal"
        elif "virtual account" in tx_type.lower():
            return "Shopping & E-Commerce", "Virtual Account Payment", "Personal"

        return "General / Others", "Miscellaneous", "Personal"
