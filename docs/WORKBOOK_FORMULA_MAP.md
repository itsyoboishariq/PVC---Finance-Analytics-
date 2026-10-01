# Workbook Formula Map: Startup_Financial_Models.xlsx

This document maps every input, assumption, formula, cell reference, and output implemented in the Python calculation engine to its original sheet and coordinate in `Startup_Financial_Models.xlsx`.

---

## 1. Worksheets Inventory

| Sheet Name in Excel | State | Dimensions | Role in Model |
| :--- | :--- | :--- | :--- |
| `'Lead Generation '` | Visible | A1:H69 | 66 prospect records; formula `=COUNT(F4:F69)` generates Month 1 leads (66). |
| `'Assumptions  '` | Visible | A1:D44 | Core customer, conversion, pricing tier, COGS, and OPEX assumptions. |
| `'Financial Model '` | Visible | A3:Y57 | 23-month multi-period financial statement (Jul 2026 – May 2028), KPI rollups. |

*Note: Worksheets contain trailing spaces in their official XML names; the Python loader preserves these exact sheet identifiers.*

---

## 2. Assumptions & Input Cells (`'Assumptions  '`)

| Coordinate | Input Name | Baseline Value | Units | Engine Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **B3** | Beginning customers | 10 | customers | `assumptions.beginning_customers` |
| **B4** | New customers Month 1 | 2 | customers | Descriptive label |
| **B5** | Monthly churn | 0.03 | % (3.0%) | `assumptions.monthly_churn` |
| **B6** | Free → Paid conversion | 0.10 | % (10.0%) | Historical reference |
| **B7** | Trial period | 14 | days | Informational |
| **B8** | Weighted Average ARPU | `=(B12*C12)+(B13*C13)+(B14*C14)` = 14.0 | $ | `calculate_weighted_arpu()` |
| **B12:C12** | Trial Pricing Tier | Price: $0, Share: 60% (0.60) | $ / % | `assumptions.pricing_tiers.trial` |
| **B13:C13** | Pro Pricing Tier | Price: $20, Share: 30% (0.30) | $ / % | `assumptions.pricing_tiers.pro` |
| **B14:C14** | Enterprise Pricing Tier | Price: $80, Share: 10% (0.10) | $ / % | `assumptions.pricing_tiers.enterprise` |
| **B17** | Monthly marketing spend | 100 | $/mo | `assumptions.monthly_marketing_spend` |
| **B18** | Leads Generated | 50 | leads | Baseline funnel reference |
| **B19** | Lead → trial conversion | 0.20 | % (20.0%) | `assumptions.lead_to_trial_conversion` |
| **B20** | Trial → paid conversion | 0.05 | % (5.0%) | `assumptions.trial_to_paid_conversion` |
| **B24** | Cloud hosting description | "$5 / customer" | text | Handled as fixed $45 in model |
| **B25** | Payment processing | 2.9% of revenue | % | `assumptions.cogs.payment_processing_pct` |
| **B26** | Third-party APIs | "$1 / customer" | $/cust | `assumptions.cogs.api_per_customer` |
| **B27** | Other direct costs | "1% of revenue" | $/trial | `assumptions.cogs.other_direct_per_trial` |

---

## 3. Financial Model Periods & Column Mapping

The model spans 23 monthly columns from column C to column Y:

| Column | Month Index | Date (Row 19) | Excel Month Label |
| :---: | :---: | :---: | :---: |
| **C** | Month 1 | 2026-07-01 | Jul 2026 |
| **D** | Month 2 | 2026-08-01 | Aug 2026 |
| **E** | Month 3 | 2026-09-01 | Sep 2026 |
| **F** | Month 4 | 2026-10-01 | Oct 2026 |
| **G** | Month 5 | 2026-11-01 | Nov 2026 |
| **H** | Month 6 | 2026-12-01 | Dec 2026 |
| **I** | Month 7 | 2027-01-01 | Jan 2027 |
| **J** | Month 8 | 2027-02-01 | Feb 2027 |
| **K** | Month 9 | 2027-03-01 | Mar 2027 |
| **L** | Month 10 | 2027-04-01 | Apr 2027 |
| **M** | Month 11 | 2027-05-01 | May 2027 |
| **N** | Month 12 | 2027-06-01 | Jun 2027 |
| **O** | Month 13 | 2027-07-01 | Jul 2027 |
| **P** | Month 14 | 2027-08-01 | Aug 2027 |
| **Q** | Month 15 | 2027-09-01 | Sep 2027 |
| **R** | Month 16 | 2027-10-01 | Oct 2027 |
| **S** | Month 17 | 2027-11-01 | Nov 2027 |
| **T** | Month 18 | 2027-12-01 | Dec 2027 |
| **U** | Month 19 | 2028-01-01 | Jan 2028 |
| **V** | Month 20 | 2028-02-01 | Feb 2028 |
| **W** | Month 21 | 2028-03-01 | Mar 2028 |
| **X** | Month 22 | 2028-04-01 | Apr 2028 |
| **Y** | Month 23 | 2028-05-01 | May 2028 |

---

## 4. Multi-Period Calculation Formulas (`'Financial Model '`)

Let `[Col]` represent the active column letter (C through Y):

### 4.1 Acquisition Funnel
- **Row 20: Leads Generated**
  - Month 1 (C20): `='Lead Generation '!$H$4` (evaluates to 66)
  - Months 2–23 (D20:Y20): static baseline numbers (e.g., D=125, E=145, ..., P=2323, ..., Y=54)
- **Row 21: Lead → Trial Conversion**
  - Formula: `='Assumptions  '!$B$19` (0.20)
- **Row 22: Trials Started**
  - Formula: `=[Col]20*[Col]21`
- **Row 23: Trial → Paid Conversion**
  - Formula: `='Assumptions  '!$B$20` (0.05)
- **Row 24: New Paid Customers**
  - Formula: `=ROUNDUP([Col]22*[Col]23, 0)`

### 4.2 Customer Waterfall
- **Row 25: Beginning Active Customers**
  - Month 1 (C25): `='Assumptions  '!$B$3` (10)
  - Months 2–23 ([Col]25): `=[PrevCol]28` (previous month's ending active customers)
- **Row 26: Monthly Churn Rate**
  - Formula: `='Assumptions  '!$B$5` (0.03)
- **Row 27: (-) Churned Customers**
  - Formula: `=ROUNDUP(SUM([Col]25:[Col]25)*[Col]26, 0)`
- **Row 28: Ending Active Customers**
  - Month 1 (C28): `=SUM(C25:C25)-C27` (= 10 - 1 = 9)
  - Months 2–23 ([Col]28): `=SUM([Col]24:[Col]25)-[Col]27` (= New Paid + Beginning - Churned)

### 4.3 Customer Breakdown
- **Row 29: Trial Tier Customers**
  - Formula: `=ROUND([Col]28*'Assumptions  '!$C$12, 1)` (rounded to 1 decimal place using `ROUND_HALF_UP`)
- **Row 30: Pro Tier Customers**
  - Formula: `=ROUND([Col]28*'Assumptions  '!$C$13, 1)`
- **Row 31: Enterprise Tier Customers**
  - Formula: `=ROUND([Col]28*'Assumptions  '!$C$14, 1)`

### 4.4 Revenue Build (MRR)
- **Row 32: Basic Plan Revenue**
  - Formula: `='Assumptions  '!$B$12*[Col]29` ($0 * Trial customers = $0)
- **Row 33: Pro Plan Revenue**
  - Formula: `=[Col]30*'Assumptions  '!$B$13` ($20 * Pro customers)
- **Row 34: Enterprise Plan Revenue**
  - Formula: `='Assumptions  '!$B$14*'Financial Model '![Col]31` ($80 * Enterprise customers)
- **Row 35: Total MRR**
  - Formula: `=SUM([Col]32:[Col]34)`

### 4.5 Cost of Goods Sold (COGS)
- **Row 36: Ending Active Customers**
  - Formula: `=[Col]28`
- **Row 37: Cloud Hosting**
  - Hardcoded value in workbook: `45` across all months C37:Y37
- **Row 38: Payment Processing**
  - Formula: `=0.029*[Col]35` (2.9% of Total MRR)
- **Row 39: Third-Party APIs**
  - Formula: `=1*[Col]28` ($1.00 per ending active customer)
- **Row 40: Other Direct Costs**
  - Formula: `=1*[Col]29` ($1.00 per trial tier customer)
- **Row 41: Total COGS**
  - Formula: `=SUM([Col]37:[Col]40)`

### 4.6 Operating Expenses (OPEX)
- **Rows 42–52: Monthly Expense Categories**
  - Row 42: Customer Acquisition / Marketing = 100
  - Row 43: UGC / AI Content = 25
  - Row 44: Events = 0
  - Row 45: Other S&M / Demos = 25
  - Row 46: Development Software = 25
  - Row 47: Contractors = 10
  - Row 48: Prototypes = 0
  - Row 49: Legal = 25
  - Row 50: Software / Workspace = 20
  - Row 51: Travel = 0
  - Row 52: Other G&A = 10
- **Row 53: Total OPEX**
  - Formula: `=SUM([Col]42:[Col]52)` (= 240.00 across all months)

### 4.7 EBIT (Operating Profit)
- **Row 56: EBIT**
  - Formula: `=[Col]35-[Col]41-[Col]53` (Total MRR - Total COGS - Total OPEX)

---

## 5. Summary KPI Cell References

| Metric Name | Sheet | Cell | Excel Formula | Evaluated Baseline Value |
| :--- | :--- | :---: | :--- | :--- |
| **Total Customers** | `'Financial Model '` | **N4** | `=SUM(C28:Y28)` | **668.0** |
| **Total Revenue** | `'Financial Model '` | **N10** | `=SUM(C35:Y35)` | **$9,352.00** |
| **Total EBIT** | `'Financial Model '` | **S9** | `=SUM(C56:Y56)` | **$1,456.99** |
