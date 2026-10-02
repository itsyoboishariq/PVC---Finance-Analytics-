# 📋 Project Scoping & Contributor Roadmap

> **Living Document:** Anyone with repository access is encouraged to review, update, and submit Pull Requests to expand or refine this scoping document.

## 1. Project Overview & Vision

**Startup Financial Models Platform** is an open-source, local-first financial modeling system designed to turn a static startup financial model into an interactive web application.

The platform combines:

- A **Python calculation engine** based on the logic of the original Excel financial model.
- A modern **React + FastAPI dashboard** for changing assumptions, comparing scenarios, and analyzing financial performance.

---

## 2. Current Baseline Scope

The current version reproduces the core logic and key outputs of `Startup_Financial_Models.xlsx`.

| Domain | Implemented Features |
| :--- | :--- |
| **Calculation Engine** | Python 3.11 calculation engine reproducing 510+ formulas across 23 monthly periods (Jul 2026 – May 2028). |
| **Baseline Validation** | Key outputs match the original Excel model, including Total Revenue ($9,352.00), Total Customers (668), and Cumulative EBIT ($1,456.99). |
| **API Server** | FastAPI server with endpoints for health checks, assumptions, calculations, and scenario storage. |
| **User Interface** | React dashboard with KPI cards, financial charts, 23-month financial statements, assumptions editor, and Excel cell inspector. |
| **Scenario Storage** | Scenarios can be saved and loaded for comparison and future analysis. |
| **One-Click Launch** | Windows `start-demo.bat` script for environment setup and application launch. |

---

## 4. 🏆 Weekly Bounties ($100 Gift Card)

Weekly development sprints can be found below based on your interests. 

## 3. Future Roadmap

Contributors can work across three main tracks.

### Track A: Financial Modeling & Quantitative Logic

- [ ] **Cohort-Based Retention & Churn**
  - Model customer churn based on customer age instead of one flat churn rate.

- [ ] **Revenue Expansion & NRR**
  - Add upsells, expansion revenue, contraction, and Net Revenue Retention.

- [ ] **SaaS Unit Economics**
  - Customer Acquisition Cost (CAC)
  - CAC Payback Period
  - Customer Lifetime Value (LTV)
  - LTV:CAC Ratio
  - SaaS Magic Number
  - Rule of 40

- [ ] **Headcount & Hiring Plan**
  - Model salaries, benefits, hiring dates, and employee ramp schedules.

- [ ] **Cash Flow & Runway Simulator**
  - Track cash burn, minimum cash balance, runway, and projected zero-cash date.

- [ ] **Sensitivity & Monte Carlo Analysis**
  - Test how changes in assumptions such as churn, conversion, pricing, and costs affect financial results.

---

### Track B: UI / UX & Frontend

- [ ] **Cohort Heatmaps**
  - Visualize customer retention across different customer cohorts.

- [ ] **Sensitivity Matrix**
  - Compare two assumptions, such as Price vs. Churn, and see the effect on Revenue or EBIT.

- [ ] **Scenario Comparison**
  - Compare two financial scenarios side-by-side.

- [ ] **Executive Presentation Mode**
  - Create a clean presentation view for sharing financial results.

- [ ] **Keyboard Shortcuts**
  - Add Excel-style navigation using `Tab`, `Enter`, and arrow keys.

- [ ] **Light / Dark Mode**
  - Add accessible light and dark themes.

---

### Track C: Full-Stack & Systems

- [ ] **Executive Summary PDF Generator**
  - Generate a one-page PDF containing key financial metrics and charts.

- [ ] **Excel Import / Export**
  - Import assumptions from the standard Excel template and export model results back to Excel.

- [ ] **ML Model for Demand Forecasting - simulate with mock data sets or with startup data**
  - Support large simulation runs without slowing down the main application.
  

### Program Rules

1. **Weekly Prize**
   - The top contributors receive a gift card maybe $100 gift card.

2. **Eligibility**
   - Submit a Pull Request addressing an open roadmap item or approved community suggestion.
   - Contributions should include clean code, documentation, and tests when modifying financial calculations.

3. **Claiming a Task**
   - Review the roadmap or GitHub Issues tagged `bounty`.
   - Comment on the Issue with your proposed approach.
   - Submit your Pull Request before the weekly Sunday cutoff at **11:59 PM EST**.

4. **Selection**
   - Contributions are evaluated based on impact, user experience, code quality, and financial accuracy.

---

## 5. Proposing New Features

Have an idea that isn't currently on the roadmap?
1. Add in your changes to the roadmap so that we can discuss.
2. If your business oriented build out a financial model and add it to the repo. Document the changes in the scoping document. 


For people wanting to build a feature: 

1. Fork the repository and create a new branch.
2. Add your proposed feature to `SCOPING_DOCUMENT.md`.
3. Build your feature on new branch and provide a description of the change in the new branch
4.  Once reviewed and approved, the feature can be added to the official roadmap and be merged to the main branch. 
