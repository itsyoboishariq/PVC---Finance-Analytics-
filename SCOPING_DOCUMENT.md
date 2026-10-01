# 📋 Project Scoping & Contributor Roadmap

> **Living Document:** Anyone with repository access is encouraged to review, update, and submit Pull Requests to expand or refine this scoping document.

---

## 1. Project Overview & Vision

**Startup Financial Models Platform** is an open-source, local-first executive financial modeling system. Our objective is to replace static, fragile spreadsheets with a responsive, high-precision web application that combines:
- A rigorous, testable **Python calculation engine** preserving 100% mathematical parity with venture financial models.
- An intuitive, modern **executive dashboard (React + FastAPI)** for dynamic scenario analysis, sensitivity modeling, and unit economics exploration.

---

## 2. Current Baseline Scope (v1.0 Implemented)

The project currently provides complete, cell-by-cell fidelity with [Startup_Financial_Models.xlsx](file:///c:/Users/shark/Downloads/Startup%20Financial%20Models/Startup_Financial_Models.xlsx):

| Domain | Implemented Features |
| :--- | :--- |
| **Calculation Engine** | Pure Python 3.11 engine using `decimal.Decimal` for zero floating-point drift; reproduces all 510+ formulas and 23 monthly periods (Jul 2026 – May 2028). |
| **Baseline Parity** | 100.0% match on Total Revenue ($9,352.00, cell `N10`), Total Customers (668, cell `N4`), and Cumulative EBIT ($1,456.99, cell `S9`). |
| **API Server** | FastAPI server running locally on `http://127.0.0.1:8000` with endpoints for health checks, default assumptions, on-demand calculations, and scenario persistence. |
| **User Interface** | Laptop-friendly React dashboard with executive KPI cards, SVG trajectory charts, full 23-month financial statements, interactive assumptions editor, lead generation database (66 records), and live Excel cell inspector. |
| **Scenario Storage** | Dual persistence support via local JSON files in `scenarios/` and browser `localStorage`. |
| **One-Click Launch** | Windows [start-demo.bat](file:///c:/Users/shark/Downloads/Startup%20Financial%20Models/start-demo.bat) automated environment setup and browser launch. |

---

## 3. Future Scoping: Pillars of Improvement

We invite contributors across three tracks:

### Track A: Financial Modeling & Quantitative Logic (Finance Minds)
- [ ] **Cohort-Based Retention & Churn:** Model customer churn by customer age/tenure rather than a flat monthly rate.
- [ ] **Revenue Expansion & Net Revenue Retention (NRR):** Add expansion, upsell, and contraction ARR alongside new customer acquisition.
- [ ] **SaaS Unit Economics Dashboard:**
  - Customer Acquisition Cost (CAC) and CAC Payback Period (months).
  - Customer Lifetime Value (LTV) and LTV:CAC Ratio.
  - SaaS "Magic Number" (Sales efficiency).
  - Rule of 40 tracking (Growth % + Free Cash Flow / EBITDA Margin %).
- [ ] **Headcount & Hiring Plan:** Expand the placeholder in row 29 into a salary, benefits, and employee ramp schedule.
- [ ] **Cash Flow Statement & Runway Simulator:** Project cash burn, minimum cash balance, and runway runway date (zero-cash date).
- [ ] **Sensitivity & Monte Carlo Analysis:** Multi-variable stress testing (e.g., churn +50%, conversion -30%).

---

### Track B: UI / UX Design & Frontend Engineering (Designers & Devs)
- [ ] **Interactive Cohort Heatmaps:** Visual grid showing customer retention decay across cohorts.
- [ ] **Sensitivity Matrix / Heatmap View:** 2D interactive table varying 2 levers (e.g. Price vs. Churn) showing resulting Total Revenue / EBIT.
- [ ] **Visual Scenario Comparison:** Split-screen side-by-side view with interactive slider for comparing two scenario outcomes.
- [ ] **Executive Presentation Mode:** High-contrast, clean print/presentation stylesheet or slide-deck view.
- [ ] **Keyboard Shortcuts & Power-User Editing:** Excel-like cell navigation (`Tab`, `Enter`, arrow keys) inside model tables.
- [ ] **Light / Dark Mode Theme Switcher:** Polished theme toggles adhering to accessibility and WCAG standards.

---

### Track C: Full-Stack & Systems Architecture (Software Engineers)
- [ ] **PDF Executive Pitch Deck Generator:** Automated 1-page summary PDF download with key metrics and charts.
- [ ] **Two-Way Excel / CSV Sync:** Ability to import a modified `.xlsx` workbook or export calculations with living Excel formulas intact.
- [ ] **Monte Carlo Worker Process:** Offload 1,000+ simulation iterations to Python multiprocessing or background worker.
- [ ] **Vectorized Engine (NumPy):** Optional high-throughput vectorized engine mode for bulk sensitivity runs.
- [ ] **Cloud-Ready / Docker Packaging:** Multi-platform `Dockerfile` and `docker-compose.yml` for zero-install deployment.

---

## 4. 🏆 Weekly Bounties ($100 Gift Card)

We run weekly development sprints to incentivize community contributions.

### Program Rules:
1. **Weekly Prize:** Top contributor or standout PR each week receives a **$100 Gift Card** (Amazon, Visa, or custom equivalent).
2. **Eligibility:**
   - Any merged Pull Request addressing an open scoped item or verified community suggestion.
   - Quality criteria: Clean code/design, clear documentation, tests included (if touching calculations).
3. **How to Claim a Task:**
   - Review the roadmap above or check repository GitHub Issues tagged `bounty`.
   - Comment on the Issue or open an RFC with your proposed approach.
   - Submit your PR with a reference to the task before the weekly Sunday cutoff (11:59 PM EST).
4. **Judging & Selection:**
   - Winners are evaluated on impact, user experience, and mathematical precision.
   - Announcements are posted weekly in the repo discussions/releases.

---

## 5. How to Propose Scope Changes

This document is collaborative. If you have an idea for a new feature or improvement:
1. Fork the repo and create a branch (`feature/new-scope-item`).
2. Edit this [SCOPING_DOCUMENT.md](file:///c:/Users/shark/Downloads/Startup%20Financial%20Models/SCOPING_DOCUMENT.md) to add your proposed feature under the appropriate track.
3. Submit a Pull Request titled `[RFC] Scope Proposal: <Feature Name>`.
4. Once discussed and approved, the scope item becomes an official bounty candidate!
