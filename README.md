# 🚀 Executive Financial Modeling Platform & SaaS Simulator

We are building the cleanest, most intuitive financial modeling experience on the web—and we want your help to scale it!

We are looking for two core groups to collaborate and drive this forward:

- 🎨 **UI/UX Designers & Frontend Developers:** To craft beautiful, responsive layouts, polish micro-interactions, and build rich interactive data visualizations (like cohort curves and sensitivity heatmaps).
- 📈 **Finance Professionals & Startup Modelers:** To sharpen our underlying financial logic, by building some tools in excel, or using coding agents. Documenting changes in the scoping document that is in the repository.

---

## 💰 Weekly Bounties & Rewards

To keep momentum high, we are launching **Weekly Bounties**!

- 🎯 Every week, we will post specific tasks ranging from UI polish to financial logic expansion.
- 🏆 Contributors will receive points as a result of completing a specific task, with weekly winners receiving a **$100 Gift Card**.

### **Active Bounties (Updated weekly; points for contributors tracked):**
1. **Develop a financial model or analytical tool** that could be useful in a startup setting — be creative! Add your changes within the scoping document and add the document or change on the repository.
2. **Create a Fork on the repo and further develop the design** to make it more professional.
3. **Explore building an agent** that monitors the scoping document for new changes and recommends changes that it can build:
   - *GitHub Action:* Trigger a workflow that takes the new changes and develops project plans that can be further developed and implemented by a consultant on the team.
4. **Set up the database** for storing the financial datasets.

*Merging conflicts: We will figure this out as we go, should be aight.*

---

## 📋 Living Scoping Document

Check out the living contributor roadmap:
- 📖 **[SCOPING_DOCUMENT.md](file:///c:/Users/shark/Downloads/Startup%20Financial%20Models/SCOPING_DOCUMENT.md)** — Comprehensive product roadmap, tracks for UI/UX designers, developers, and finance experts, plus guidelines for our Weekly Bounties. Anyone with repository access can make changes and submit Pull Requests!

---

## ⚡ Quick Start: Run the Platform Locally

Launch the entire demo with a single click:

```cmd
start-demo.bat
```

This automated launcher:
1. Detects Python or the existing virtual environment.
2. Installs required packages from `requirements.txt`.
3. Starts the FastAPI server on `http://127.0.0.1:8000`.
4. Automatically opens `http://127.0.0.1:8000` in your default browser.
5. Serves the pre-compiled React application directly without needing a separate terminal or Node.js runtime.

---

## 📊 Summary of Baseline Workbook Logic

The platform models a SaaS company over **23 monthly periods** from **July 2026 to May 2028**, verified against `Startup_Financial_Models.xlsx` with **100% calculation parity**:

| Metric | Source Cell in Excel | Formula | Target Excel Value | Python Engine Output |
| :--- | :---: | :--- | :---: | :---: |
| **Total Customers** | `'Financial Model '!N4` | `=SUM(C28:Y28)` | **668.0** | **668.0** (0.00 diff) |
| **Total Revenue** | `'Financial Model '!N10` | `=SUM(C35:Y35)` | **$9,352.00** | **$9,352.00** (0.00 diff) |
| **Total EBIT** | `'Financial Model '!S9` | `=SUM(C56:Y56)` | **$1,456.992** | **$1,456.992** (0.00 diff) |
| **Weighted ARPU** | `'Assumptions  '!B8` | `=(B12*C12)+(B13*C13)+(B14*C14)` | **$14.00** | **$14.00** (0.00 diff) |
| **Total Leads (M1)** | `'Lead Generation '!H4` | `=COUNT(F4:F69)` | **66** | **66** (0 diff) |

### Key Mechanics Preserved:
1. **Acquisition Funnel:**
   - Month 1 leads (66) are counted from the 66 rows in `'Lead Generation '`.
   - Lead → Trial conversion (20.0%) gives Trials Started (`Row 20 * Row 21`).
   - Trial → Paid conversion (5.0%) gives New Paid Customers via `=ROUNDUP(Trials * Rate, 0)`.
2. **Customer Waterfall:**
   - Month 1 Ending Customers (`C28`): `=SUM(C25:C25)-C27` (Beginning 10 - Churned 1 = 9).
   - Months 2–23 Ending Customers (`D28..Y28`): `=SUM(New + Beg) - Churned`.
   - Monthly Churn (3.0%) computed via `=ROUNDUP(Beg * Churn, 0)`.
3. **Pricing Tier Distribution:**
   - Trial Tier: 60% of ending active customers (`$0/mo`).
   - Pro Tier: 30% of ending active customers (`$20/mo`).
   - Enterprise Tier: 10% of ending active customers (`$80/mo`).
   - Customer counts rounded to 1 decimal place using Excel's symmetric `ROUND(x, 1)`.
4. **COGS & OPEX:**
   - Cloud Hosting: flat $45/mo.
   - Payment Processing: 2.9% of Total MRR.
   - Support APIs: $1.00 per ending active customer.
   - Other Direct Costs: $1.00 per trial customer.
   - Total OPEX: 11 categories totaling $240/mo.

---

## 🛠️ Technology Stack

- **Calculation Core:** Pure Python 3.11 with `decimal.Decimal` precision (zero external math approximation).
- **Backend API:** FastAPI & Uvicorn (local, zero-cloud dependency).
- **Frontend:** React 18, Vite, Vanilla CSS design tokens, custom SVG charts.
- **Scenario Persistence:** Dual persistence (Local JSON files in `scenarios/` + browser `localStorage` fallback).

---

## 📁 Repository Structure

```
PVC---Finance-Analytics-/
├── Startup_Financial_Models.xlsx     # Preserved original reference workbook
├── start-demo.bat                    # One-click Windows launch script
├── requirements.txt                  # Python dependencies
├── model_engine_defaults.json        # Extracted defaults from workbook
├── SCOPING_DOCUMENT.md               # Living scoping & roadmap document
├── model_engine/                     # Pure Python calculation engine
│   ├── __init__.py
│   ├── engine.py                     # Financial calculation logic & rounding rules
│   ├── schema.py                     # Pydantic data contracts
│   └── defaults.py                   # Default loader
├── backend/                          # FastAPI web server
│   ├── __init__.py
│   └── main.py                       # Endpoints & frontend static mounting
├── frontend/                         # React source code & compiled bundle
│   ├── dist/                         # Pre-compiled static assets served by FastAPI
│   ├── src/
│   │   ├── components/               # UI views, tables, charts, modals
│   │   ├── utils/                    # Formatters & CSV/JSON exporters
│   │   ├── App.jsx                   # Master application
│   │   └── index.css                 # Executive theme styling
│   ├── package.json
│   └── vite.config.js
├── scenarios/                        # Local scenario JSON files
│   ├── growth_acceleration.json      # Bull case demo scenario
│   └── conservative_bootstrapping.json # Bear case demo scenario
├── tests/                            # Automated parity and API test suite
│   ├── test_engine_parity.py         # 23-month cell-by-cell Excel validation
│   └── test_api.py                   # FastAPI endpoint tests
└── docs/
    ├── WORKBOOK_FORMULA_MAP.md       # Comprehensive cell-to-formula map
    └── EXCEL_PARITY_REPORT.md        # Detailed parity & audit report
```

---

## 🧪 Automated Testing

To run the automated test suite comparing Python calculations against Excel:

```cmd
.venv\Scripts\python.exe -m pytest tests/ -v
```

All 15 tests validate:
- Baseline parity across all 23 months (510+ formulas)
- Summary KPI parity (N4, N10, S9)
- Multi-variable modified scenarios (Bull and Bear)
- Edge cases: zero leads, zero conversion, 100% churn, percentage boundaries (0% and 100%)
- API endpoints and static frontend serving.

---

## 🌐 API Endpoints

- `GET /api/health` — Confirms service health.
- `GET /api/defaults` — Returns default assumptions, 66 prospect records, and baseline results.
- `POST /api/calculate` — Validates assumptions, executes calculation engine, and returns results.
- `GET /api/scenarios` — Lists saved scenarios from `scenarios/`.
- `POST /api/scenarios` — Saves or updates a scenario JSON file.
- `GET /api/scenarios/{id}` — Retrieves full scenario JSON.
- `DELETE /api/scenarios/{id}` — Deletes a scenario JSON file.
- `GET /` — Serves compiled React frontend.
