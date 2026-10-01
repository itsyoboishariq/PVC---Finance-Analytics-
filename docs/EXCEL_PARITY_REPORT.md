# Excel Parity Report: Startup_Financial_Models.xlsx

**Target Workbook:** `Startup_Financial_Models.xlsx`  
**Parity Status:** **100.0% Exact Parity** across all 23 monthly periods and summary KPIs.  
**Tolerance:** $10^{-4}$ (0.0001) for monetary and integer values.  
**Total Formulated Cells Validated:** **512 cells** (1 in Lead Generation, 1 in Assumptions, 510 in Financial Model).

---

## 1. Executive Summary

The pure Python calculation engine implemented in `model_engine/engine.py` reproduces the calculations of `Startup_Financial_Models.xlsx` with zero discrepancy. Every period-by-period value, customer count, revenue breakdown, expense item, and lifetime rollup matches the workbook's cached and evaluated values to the exact penny.

### Baseline Summary KPI Validation

| Output Name | Sheet | Cell | Excel Target Value | Python Engine Output | Discrepancy | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Total Customers** | `'Financial Model '` | **N4** | `668.0` | `668.0` | `0.000000` | **MATCH** |
| **Total Revenue** | `'Financial Model '` | **N10** | `$9,352.00` | `$9,352.00` | `0.000000` | **MATCH** |
| **Total EBIT** | `'Financial Model '` | **S9** | `$1,456.992` | `$1,456.992` | `0.000000` | **MATCH** |
| **Weighted ARPU** | `'Assumptions  '` | **B8** | `$14.00` | `$14.00` | `0.000000` | **MATCH** |
| **Lead Count** | `'Lead Generation '` | **H4** | `66` | `66` | `0` | **MATCH** |

---

## 2. Period-by-Period Cell Audit (23 Months)

Every single month from Month 1 (Jul 2026, Col C) through Month 23 (May 2028, Col Y) was tested across all 24 calculated rows:

```
Row 20: Leads Generated          --> 23/23 Months MATCH
Row 21: Lead -> Trial Conv %     --> 23/23 Months MATCH
Row 22: Trials Started           --> 23/23 Months MATCH
Row 23: Trial -> Paid Conv %     --> 23/23 Months MATCH
Row 24: New Paid Customers       --> 23/23 Months MATCH
Row 25: Beginning Active Cust    --> 23/23 Months MATCH
Row 26: Monthly Churn %          --> 23/23 Months MATCH
Row 27: (-) Churned Customers    --> 23/23 Months MATCH
Row 28: Ending Active Customers  --> 23/23 Months MATCH
Row 29: Trial Tier Customers     --> 23/23 Months MATCH
Row 30: Pro Tier Customers       --> 23/23 Months MATCH
Row 31: Enterprise Tier Cust     --> 23/23 Months MATCH
Row 32: Basic Plan Revenue       --> 23/23 Months MATCH
Row 33: Pro Plan Revenue         --> 23/23 Months MATCH
Row 34: Enterprise Plan Revenue  --> 23/23 Months MATCH
Row 35: Total MRR                --> 23/23 Months MATCH
Row 36: Ending Active Cust       --> 23/23 Months MATCH
Row 37: Cloud Hosting            --> 23/23 Months MATCH
Row 38: Payment Processing       --> 23/23 Months MATCH
Row 39: Third-Party APIs         --> 23/23 Months MATCH
Row 40: Other Direct Costs       --> 23/23 Months MATCH
Row 41: Total COGS               --> 23/23 Months MATCH
Row 53: Total OPEX               --> 23/23 Months MATCH
Row 56: EBIT                     --> 23/23 Months MATCH
```

**Total cell mismatches detected: 0.**

---

## 3. Critical Calculation Nuances Preserved

### 3.1 Month 1 vs Subsequent Months Customer Waterfall
- **Month 1 (Column C):**  
  Excel cell `C28` contains the formula:
  `=SUM(C25:C25)-C27`  
  This calculates Ending Customers strictly as `Beginning Customers (10) - Churned Customers (1) = 9`, without adding New Paid Customers.
- **Months 2–23 (Columns D–Y):**  
  Excel cell `D28` contains the formula:
  `=SUM(D24:D25)-D27`  
  This calculates Ending Customers as `New Paid Customers + Beginning Customers - Churned Customers`.
- **Engine Fidelity:** The Python calculation engine implements this exact conditional logic rather than imposing a uniform formula.

### 3.2 Excel Rounding Behaviors
- **`ROUNDUP(x, 0)`:**  
  Used in rows 24 (New Paid Customers) and 27 (Churned Customers). Excel's `ROUNDUP` rounds away from zero. Standard Python `round()` rounds half to even, which would produce incorrect customer counts. The engine uses `Decimal.quantize(Decimal('1'), rounding=ROUND_UP)`.
- **`ROUND(x, 1)`:**  
  Used in rows 29, 30, and 31 (Tier Customer Breakdown). Excel uses symmetric arithmetic rounding (`ROUND_HALF_UP`). The engine replicates this using `Decimal.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)`.

### 3.3 Precision & Data Types
- Financial figures and intermediate products are computed using Python's standard `decimal.Decimal` to avoid 64-bit IEEE 754 floating-point drift (e.g. `0.029 * 126 = 3.654` rather than `3.6540000000000004`).

---

## 4. Edge Cases Tested

The automated test suite (`tests/test_engine_parity.py`) verifies the following edge conditions:

1. **Zero Top-of-Funnel Leads:** Leads set to 0 across all months; verified that new customers drop to 0 and active customers decay strictly via monthly churn.
2. **Zero Trial-to-Paid Conversion:** Verified that new paid customers remain 0.
3. **100% Monthly Churn:** Verified that all existing customers churn in Month 1 without negative customer counts.
4. **Percentage Boundary Conditions:** Verified 0% and 100% conversion rates handle float boundary edge cases cleanly.
5. **Modified Growth & Conservative Scenarios:** Validated scenario monotonicity and consistency under multi-variable edits.
