// Hermes Finance - Dashboard Controller

let trendChartInstance = null;
let categoryChartInstance = null;
let currentTransactions = [];
let categoriesData = {};

// User's exact BCA QRIS email sample
const USER_BCA_SAMPLE = `Hello JONATHAN ADRIANUS GANI,
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
PT Bank Central Asia Tbk`;

const SHOPEE_VA_SAMPLE = `Hello JONATHAN ADRIANUS GANI,
You just made a transaction through myBCA.
Here are the details of your transaction :

Status : Successful
Transaction Date : 31 Aug 2026 09:15:22
Transaction Type : Pembayaran BCA Virtual Account
Payment to : SHOPEE INDONESIA
Source of Fund : TAHAPAN - 6720****92
Total Payment : IDR 245,000.00
Reference No. : 9527120260831091522VA98011244
Berita : Miriva Candlenut Oil Amber Dropper Bottles
Customer Name : JONATHAN ADRIANUS GANI`;

// Format IDR Currency
function formatIDR(amount) {
    return "IDR " + Number(amount || 0).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Format Date
function formatDate(dateStr) {
    if (!dateStr) return "-";
    try {
        const d = new Date(dateStr.replace(" ", "T"));
        return d.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (e) {
        return dateStr;
    }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
    setupNavigation();
    setupFilters();
    setupEmailTester();
    setupCopilot();
    setupModal();

    // Auto-seed sample if database is fresh
    try {
        await fetch("/api/seed", { method: "POST" });
    } catch (e) {
        console.warn("Seed skipped", e);
    }

    await loadCategories();
    await refreshDashboard();
});

// Navigation Handling
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const tabViews = document.querySelectorAll(".tab-view");
    const pageTitle = document.getElementById("page-title");

    const titles = {
        "dashboard": "Financial Overview",
        "transactions": "Transaction Ledger",
        "email-tester": "BCA Email Ingestor",
        "copilot": "Hermes Financial Copilot"
    };

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.dataset.tab;
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            tabViews.forEach(view => {
                view.classList.remove("active");
                if (view.id === `view-${targetTab}`) {
                    view.classList.add("active");
                }
            });

            if (pageTitle && titles[targetTab]) {
                pageTitle.textContent = titles[targetTab];
            }
        });
    });

    const btnViewAll = document.getElementById("btn-view-all-txs");
    if (btnViewAll) {
        btnViewAll.addEventListener("click", () => {
            document.querySelector('[data-tab="transactions"]').click();
        });
    }

    const btnOpenEmailModal = document.getElementById("btn-open-email-modal");
    if (btnOpenEmailModal) {
        btnOpenEmailModal.addEventListener("click", () => {
            document.querySelector('[data-tab="email-tester"]').click();
        });
    }

    const btnSyncTrigger = document.getElementById("btn-sync-trigger");
    if (btnSyncTrigger) {
        btnSyncTrigger.addEventListener("click", async () => {
            btnSyncTrigger.innerHTML = "<span>⏳</span> Syncing...";
            try {
                const res = await fetch("/api/sync/trigger", { method: "POST" });
                const data = await res.json();
                alert(data.message || "Sync finished");
                await refreshDashboard();
            } catch (err) {
                alert("Sync error: " + err.message);
            } finally {
                btnSyncTrigger.innerHTML = "<span>🔄</span> Run Email Sync";
            }
        });
    }
}

// Load Categories
async function loadCategories() {
    try {
        const res = await fetch("/api/categories");
        categoriesData = await res.json();
        const filterSelect = document.getElementById("filter-category");
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="All">All Categories</option>';
            Object.keys(categoriesData).forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = `${categoriesData[cat].icon || "📦"} ${cat}`;
                filterSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load categories", e);
    }
}

// Refresh Dashboard Stats & Feed
async function refreshDashboard() {
    try {
        const [summaryRes, txRes] = await Promise.all([
            fetch("/api/analytics/summary"),
            fetch("/api/transactions?limit=100")
        ]);

        const summary = await summaryRes.json();
        const txData = await txRes.json();

        currentTransactions = txData.items || [];

        // Update Stat Cards
        document.getElementById("stat-total-spent").textContent = formatIDR(summary.total_spent);
        document.getElementById("stat-tx-count").textContent = `${summary.tx_count} transactions logged`;
        document.getElementById("stat-daily-velocity").textContent = formatIDR(summary.daily_velocity);
        document.getElementById("stat-top-category").textContent = summary.top_category || "None";
        
        // Entity summary
        const miriva = summary.entity_breakdown.find(e => e.entity === "Miriva");
        const surejase = summary.entity_breakdown.find(e => e.entity === "Surejase");
        const personal = summary.entity_breakdown.find(e => e.entity === "Personal");

        let entText = [];
        if (miriva) entText.push(`🥥 Miriva: ${formatIDR(miriva.total_amount)}`);
        if (surejase) entText.push(`🏭 Surejase: ${formatIDR(surejase.total_amount)}`);
        if (personal) entText.push(`👤 Personal: ${formatIDR(personal.total_amount)}`);
        document.getElementById("stat-entity-sub").textContent = entText.join(" · ") || "Personal & Business";

        // Render Charts
        renderTrendChart(summary.daily_trends);
        renderCategoryChart(summary.category_breakdown);

        // Render Tables
        renderTransactionTables(currentTransactions);

    } catch (err) {
        console.error("Dashboard refresh error:", err);
    }
}

// Render Trend Chart
function renderTrendChart(trends) {
    const ctx = document.getElementById("trendChart");
    if (!ctx) return;

    if (trendChartInstance) trendChartInstance.destroy();

    const labels = (trends || []).map(t => {
        const d = new Date(t.day);
        return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    });
    const data = (trends || []).map(t => t.daily_total);

    trendChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels.length ? labels : ["Aug 25", "Aug 27", "Aug 28", "Aug 29", "Aug 30"],
            datasets: [{
                label: "Daily BCA Outflow (IDR)",
                data: data.length ? data : [320000, 150000, 76500, 28000, 45320],
                borderColor: "#06b6d4",
                backgroundColor: "rgba(6, 182, 212, 0.12)",
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: "#06b6d4"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Spent: ${formatIDR(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#94a3b8", font: { family: "Plus Jakarta Sans", size: 11 } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: {
                        color: "#94a3b8",
                        font: { family: "Plus Jakarta Sans", size: 11 },
                        callback: (v) => "Rp " + (v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : (v / 1000).toFixed(0) + "k")
                    }
                }
            }
        }
    });
}

// Render Category Doughnut Chart
function renderCategoryChart(breakdown) {
    const ctx = document.getElementById("categoryChart");
    if (!ctx) return;

    if (categoryChartInstance) categoryChartInstance.destroy();

    const labels = (breakdown || []).map(b => b.category);
    const data = (breakdown || []).map(b => b.total_amount);
    const colors = [
        "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6",
        "#10b981", "#3b82f6", "#f43f5e", "#a855f7"
    ];

    categoryChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: labels.length ? labels : ["Food & Dining", "Groceries", "Fuel", "Shopping"],
            datasets: [{
                data: data.length ? data : [45320, 76500, 150000, 320000],
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: "#0f172a"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#94a3b8",
                        font: { family: "Plus Jakarta Sans", size: 11 },
                        padding: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${formatIDR(ctx.raw)}`
                    }
                }
            }
        }
    });
}

// Render Transaction Tables
function renderTransactionTables(transactions) {
    const miniBody = document.getElementById("mini-tx-tbody");
    const fullBody = document.getElementById("full-tx-tbody");

    const getPaymentTag = (type) => {
        const t = (type || "").toLowerCase();
        if (t.includes("qris")) return `<span class="tag-pill tag-qris">📱 QRIS</span>`;
        if (t.includes("virtual account") || t.includes("va")) return `<span class="tag-pill tag-va">🛍️ VA</span>`;
        if (t.includes("transfer")) return `<span class="tag-pill tag-tf">💳 Transfer</span>`;
        return `<span class="tag-pill tag-tf">🏦 ${type}</span>`;
    };

    const getEntityClass = (entity) => {
        if (entity === "Miriva") return "entity-miriva";
        if (entity === "Surejase") return "entity-surejase";
        return "entity-personal";
    };

    // Mini Table (Top 5)
    if (miniBody) {
        if (!transactions.length) {
            miniBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No transactions found.</td></tr>`;
        } else {
            miniBody.innerHTML = transactions.slice(0, 6).map(tx => `
                <tr>
                    <td>
                        <div class="merchant-cell">
                            <span class="merchant-name">${tx.merchant_clean_name || tx.merchant_name}</span>
                            <span class="merchant-sub">${tx.source_of_fund || 'myBCA'} · Ref: ${tx.reference_no.substring(0, 14)}...</span>
                        </div>
                    </td>
                    <td>${getPaymentTag(tx.transaction_type)}</td>
                    <td><span class="tag-pill">${tx.category}</span></td>
                    <td><span class="${getEntityClass(tx.entity)}">${tx.entity || 'Personal'}</span></td>
                    <td>${formatDate(tx.transaction_date)}</td>
                    <td class="text-right"><span class="amount-display">${formatIDR(tx.amount)}</span></td>
                    <td class="text-center">
                        <button class="btn-icon-receipt" onclick="inspectTransaction(${tx.id})">Inspect</button>
                    </td>
                </tr>
            `).join("");
        }
    }

    // Full Table
    if (fullBody) {
        if (!transactions.length) {
            fullBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No transactions matching filter.</td></tr>`;
        } else {
            fullBody.innerHTML = transactions.map(tx => `
                <tr>
                    <td>
                        <div class="merchant-cell">
                            <span class="merchant-name">${tx.merchant_name}</span>
                            <span class="merchant-sub">${tx.notes ? `Berita: ${tx.notes}` : `Ref: ${tx.reference_no}`}</span>
                        </div>
                    </td>
                    <td>${getPaymentTag(tx.transaction_type)}</td>
                    <td><span class="tag-pill">${tx.category}</span></td>
                    <td><span class="${getEntityClass(tx.entity)}">${tx.entity || 'Personal'}</span></td>
                    <td>${tx.merchant_location || 'Indonesia'}</td>
                    <td>${formatDate(tx.transaction_date)}</td>
                    <td class="text-right"><span class="amount-display">${formatIDR(tx.amount)}</span></td>
                    <td class="text-center">
                        <button class="btn-icon-receipt" onclick="inspectTransaction(${tx.id})">BCA Receipt</button>
                    </td>
                </tr>
            `).join("");
        }
    }
}

// Setup Filters
function setupFilters() {
    const searchInput = document.getElementById("tx-search-input");
    const categorySelect = document.getElementById("filter-category");
    const entitySelect = document.getElementById("filter-entity");

    const applyFilters = async () => {
        const search = searchInput ? searchInput.value : "";
        const cat = categorySelect ? categorySelect.value : "All";
        const ent = entitySelect ? entitySelect.value : "All";

        let url = `/api/transactions?search=${encodeURIComponent(search)}&category=${encodeURIComponent(cat)}&entity=${encodeURIComponent(ent)}`;
        const res = await fetch(url);
        const data = await res.json();
        renderTransactionTables(data.items || []);
    };

    if (searchInput) searchInput.addEventListener("input", debounce(applyFilters, 300));
    if (categorySelect) categorySelect.addEventListener("change", applyFilters);
    if (entitySelect) entitySelect.addEventListener("change", applyFilters);
}

// Setup Email Tester
function setupEmailTester() {
    const btnUser = document.getElementById("btn-load-user-sample");
    const btnVA = document.getElementById("btn-load-va-sample");
    const btnClear = document.getElementById("btn-clear-ingest");
    const btnExecute = document.getElementById("btn-execute-ingest");
    const textarea = document.getElementById("raw-email-input");
    const resultBox = document.getElementById("extraction-result-container");

    if (btnUser && textarea) {
        btnUser.addEventListener("click", () => {
            textarea.value = USER_BCA_SAMPLE;
        });
    }

    if (btnVA && textarea) {
        btnVA.addEventListener("click", () => {
            textarea.value = SHOPEE_VA_SAMPLE;
        });
    }

    if (btnClear && textarea) {
        btnClear.addEventListener("click", () => {
            textarea.value = "";
            resultBox.className = "extraction-container empty";
            resultBox.innerHTML = `
                <div class="placeholder-msg">
                    <span class="placeholder-icon">📨</span>
                    <p>Paste a BCA email on the left and click "Parse & Log" to see live structured extraction.</p>
                </div>
            `;
        });
    }

    if (btnExecute && textarea) {
        btnExecute.addEventListener("click", async () => {
            const raw = textarea.value.trim();
            if (!raw) {
                alert("Please paste a BCA transaction email first.");
                return;
            }

            btnExecute.innerHTML = "<span>⚡</span> Extracting...";
            try {
                const res = await fetch("/api/ingest/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ raw_content: raw })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || "Extraction failed");
                }

                const tx = data.transaction;
                resultBox.className = "extraction-container";
                resultBox.innerHTML = `
                    <div class="parsed-result-box">
                        <div class="parsed-header-badge">
                            <div>
                                <span class="tag-pill tag-qris">${tx.transaction_type}</span>
                                <span class="trend-pill trend-positive">Status: ${tx.status}</span>
                            </div>
                            <span class="parsed-val highlight">${formatIDR(tx.amount)}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Merchant / Payee:</span>
                            <span class="parsed-val">${tx.merchant_name}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Categorized as:</span>
                            <span class="parsed-val">🏷️ ${tx.category} &rarr; ${tx.subcategory || 'General'}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Entity Tag:</span>
                            <span class="parsed-val font-bold">${tx.entity}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Location:</span>
                            <span class="parsed-val">${tx.merchant_location || '-'}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Date & Time:</span>
                            <span class="parsed-val">${tx.transaction_date}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Source of Fund:</span>
                            <span class="parsed-val">${tx.source_of_fund || 'myBCA'}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">Reference No:</span>
                            <span class="parsed-val font-mono">${tx.reference_no}</span>
                        </div>
                        <div class="parsed-field-row">
                            <span class="parsed-label">RRN:</span>
                            <span class="parsed-val font-mono">${tx.rrn || '-'}</span>
                        </div>
                    </div>
                `;

                await refreshDashboard();
            } catch (err) {
                alert("Ingestion Error: " + err.message);
            } finally {
                btnExecute.innerHTML = "<span>⚡</span> Parse & Log Transaction";
            }
        });
    }
}

// Setup Copilot Chat
function setupCopilot() {
    const chatBox = document.getElementById("copilot-messages-box");
    const input = document.getElementById("copilot-input");
    const btnSend = document.getElementById("btn-send-copilot");

    const handleQuery = async (queryText) => {
        if (!queryText.trim()) return;

        // Append User Message
        const userMsg = document.createElement("div");
        userMsg.className = "copilot-msg user-msg";
        userMsg.innerHTML = `
            <div class="msg-avatar">👤</div>
            <div class="msg-bubble"><p>${queryText}</p></div>
        `;
        chatBox.appendChild(userMsg);
        chatBox.scrollTop = chatBox.scrollHeight;

        if (input) input.value = "";

        // Placeholder Bot Msg
        const botMsg = document.createElement("div");
        botMsg.className = "copilot-msg bot-msg";
        botMsg.innerHTML = `
            <div class="msg-avatar">⚡</div>
            <div class="msg-bubble"><p>Thinking...</p></div>
        `;
        chatBox.appendChild(botMsg);
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const res = await fetch("/api/copilot/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: queryText })
            });
            const data = await res.json();
            
            // Format bold and bullets into HTML
            let formatted = data.answer
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n- /g, '<br>• ')
                .replace(/\n/g, '<br>');

            botMsg.querySelector(".msg-bubble").innerHTML = `<p>${formatted}</p>`;
        } catch (e) {
            botMsg.querySelector(".msg-bubble").innerHTML = `<p>Sorry, I encountered an error answering that.</p>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    if (btnSend && input) {
        btnSend.addEventListener("click", () => handleQuery(input.value));
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleQuery(input.value);
        });
    }

    // Query Chips
    document.querySelectorAll(".query-chip").forEach(chip => {
        chip.addEventListener("click", () => {
            handleQuery(chip.dataset.query);
        });
    });
}

// Inspect Transaction Receipt Modal
window.inspectTransaction = function(txId) {
    const tx = currentTransactions.find(t => t.id === txId);
    if (!tx) return;

    const modal = document.getElementById("receipt-modal");
    const body = document.getElementById("receipt-modal-content");

    body.innerHTML = `
        <div class="parsed-result-box">
            <div class="parsed-header-badge">
                <span class="tag-pill tag-qris">${tx.transaction_type}</span>
                <span class="parsed-val highlight">${formatIDR(tx.amount)}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Status:</span>
                <span class="parsed-val" style="color: #10b981;">● ${tx.status}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Transaction Date:</span>
                <span class="parsed-val">${formatDate(tx.transaction_date)}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Payment to:</span>
                <span class="parsed-val font-bold">${tx.merchant_name}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Location:</span>
                <span class="parsed-val">${tx.merchant_location || '-'}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Source of Fund:</span>
                <span class="parsed-val">${tx.source_of_fund || 'myBCA'}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Category:</span>
                <span class="parsed-val">🏷️ ${tx.category}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Entity Tag:</span>
                <span class="parsed-val font-bold">${tx.entity}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">RRN:</span>
                <span class="parsed-val font-mono">${tx.rrn || '-'}</span>
            </div>
            <div class="parsed-field-row">
                <span class="parsed-label">Reference No:</span>
                <span class="parsed-val font-mono" style="font-size: 11px;">${tx.reference_no}</span>
            </div>
            ${tx.notes ? `
            <div class="parsed-field-row">
                <span class="parsed-label">Berita / Notes:</span>
                <span class="parsed-val">${tx.notes}</span>
            </div>` : ''}
        </div>
    `;

    modal.classList.add("open");
};

function setupModal() {
    const modal = document.getElementById("receipt-modal");
    const btnClose = document.getElementById("btn-close-modal");
    if (btnClose && modal) {
        btnClose.addEventListener("click", () => modal.classList.remove("open"));
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove("open");
        });
    }
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
