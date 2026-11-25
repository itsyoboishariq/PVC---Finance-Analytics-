# Phase 1 Implementation Review: Trust and Correctness

Branch: `feature/phase-1-financial-reliability` (based on `main` at `d50f5f4`)
Scope: Startup Financial Models only (`frontend/`, `backend/`, `model_engine/`, `tests/`). Strategy Studio is untouched.

## What changed

| Item | Before | After | Files |
|---|---|---|---|
| Customer KPI label | "Total Customers (Sum)", read as unique customers | "Total Customer-Months", with a description saying it is each month's active customers added up and not a count of unique customers. Backend field `total_customers_sum` and the Excel formula `=SUM(C28:Y28)` are unchanged. | `KPICards.jsx` |
| ARPU display | `weightedArpu \|\| 14.0`, so a real $0 showed as $14 | $0 shows `$0.00`. Missing or non-numeric values (`null`, `undefined`, `NaN`, `Infinity`) show `N/A` / "No value available". The comparison uses the workbook baseline's own ARPU instead of a hardcoded 14. | `KPICards.jsx`, `App.jsx` |
| Tier shares must total 100% | No check (the old validator computed the sum and did nothing). The first attempt on this branch blocked every live calculation, which broke the editor while tiers were being rebalanced. | Enforced when a scenario is **saved** (`SavedScenarioAssumptions`). Live calculation still accepts unbalanced tiers, and the editor keeps its existing yellow warning. | `schema.py`, `main.py` |
| Conversion and churn rates | Already limited to 0–100% on `main` (`monthly_churn`, `lead_to_trial_conversion`, `trial_to_paid_conversion`, `payment_processing_pct`) | No change needed. Now covered by tests. | — |
| Scenario duplication | Copied the currently active assumptions, not the selected scenario. The first attempt on this branch fell back to that same behaviour on any error and dropped the baseline entry from the list. | Reads the selected scenario and saves its assumptions under "<name> (Copy)". Shows an error instead of copying the wrong data. Keeps the baseline entry in the list. Reuses the existing `POST /api/scenarios` (no new endpoint). Neither the active scenario nor the original changes. | `App.jsx` |
| Scenario IDs / path traversal | IDs went straight into file paths. The first attempt on this branch allowed only UUIDs, which broke the two sample scenarios (`conservative_bootstrapping`, `growth_acceleration`). | Allows letters, digits, `_` and `-` (1–64 characters), then checks that the resolved file stays inside the scenarios folder. Unsafe IDs return HTTP 400 on load, save and delete. | `main.py` |
| Stale calculation results | An older, slower response could overwrite newer results | Each request is numbered and only the newest can update the screen | `App.jsx` |
| Error messages | Validation errors appeared as `[object Object]`. A refused save silently stored a local copy. | Errors read like "Scenario not saved. Trial, Pro and Enterprise customer shares must add up to 100% (they currently add up to 90.0%)." Save and duplicate errors show inside the Scenario Manager, which keeps the typed name. | `App.jsx`, `ScenarioManagerModal.jsx`, `main.py` |
| "Excel Parity 100%" badge | Hardcoded claim | Replaced with "Excel-based model". Parity is checked by `tests/test_engine_parity.py`, not shown live in the app. | `App.jsx` |

## Decisions

- **Tier tolerance is 0.0005 (0.05 points).** The editor takes shares in 0.1% steps, so a real mistake is off by at least 0.001. Half a step absorbs floating-point noise (0.6 + 0.3 + 0.1 = 0.9999999999999999) and still rejects 99.9% and 100.1%. The earlier 0.001 with `>` sat exactly on that step, so whether 99.9% passed depended on rounding.
- **Strict tier check only on save.** Blocking `/api/calculate` meant every keystroke while rebalancing tiers produced an error. The workbook itself doesn't enforce the sum either.
- **No free tier and no change to formulas.** All financial calculations are unchanged; the 13 parity tests still pass.

## Tests

Command: `.venv/bin/python -m pytest -q tests`. Result: **83 passed** (it was 18 before this work).

- `tests/conftest.py` gives every test its own temporary scenarios folder, so tests never write to the real `scenarios/` files.
- `tests/test_assumption_validation.py`:
  - tier totals: valid, above and below 100%, an empty tier, float noise, and 99.9% / 100.1%
  - defaults and both sample scenarios pass the strict check
  - churn and conversion bounds
- `tests/test_scenario_api.py`:
  - create, load and delete
  - sample scenarios load and re-save
  - duplicating the selected or an inactive scenario, with the original and other scenarios left unchanged
  - unsafe IDs and traversal attempts rejected
  - readable save errors
  - live calculation still works while tiers don't add up to 100%

`pytest` at the repo root also collects `strategy_studio/tests`, which fail to import (out of scope here). Run `pytest tests` for this app.

### Manual browser check (backend serving the freshly built `frontend/dist`)

- Tiers at 90% while editing: warning shown, no error, numbers still update.
- Trial 100% / Pro 0% / Enterprise 0%: ARPU shows `$0.00`.
- Saving with tiers at 50%: readable error inside the Scenario Manager, name kept, no file written.
- Duplicating "Growth Acceleration" while the baseline (with edited tiers) was active: the copy had Growth Acceleration's values, and the baseline stayed in the list.
- Stale response: the first calculation was artificially delayed by 2 seconds and a second edit was made. The screen kept the newer result ($2.80), not the late one ($9.20).

## How to run

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000 (this app, not `/strategy`). To work on the UI with live reload, also run `npm run dev` in `frontend/` and open http://localhost:3000, which forwards `/api` to port 8000. After changing `frontend/src`, run `npm run build` so the copy served on port 8000 is up to date.

## Known limitations and follow-ups

- The percentage inputs reformat with `toFixed(1)` on every keystroke, so typing "50" into a field can end up as "5.0". This belongs to the Phase 2 assumptions-editor work.
- Saved values with no data still show as `$0` / `0` in other KPI cards, because the shared formatters do this. Changing that affects every view, so it's left for the Phase 2 KPI work.
- Renaming a scenario only changes it in this browser; the file on disk keeps the old name. This was already the case before this work.
- Delete ignores server errors (also pre-existing).
- Scenario writes are not atomic. No problem has been seen with a single local user.
- The trial versus free-tier concern is documented but intentionally not modelled.

## Addendum: custom line items (requested by the project lead)

The Assumptions Editor has a new **Add Your Own** tab for assumptions that aren't in the workbook. Each item has:

- a name
- a type:
  - **Expense** adds to OPEX
  - **Direct cost** adds to COGS
  - **Revenue** adds to total revenue, so payment processing (2.9%) also applies to it
- an amount, charged either **per month** or **per active customer per month**
- a **start month** (M1–M23)

How it's built:

- **Engine** (`model_engine/engine.py`, `schema.py`): `ModelAssumptions.custom_items` defaults to `[]`, so existing scenarios still load. Each month the engine works out every item's amount and adds it to the right total. When there are no items, every total is calculated exactly as before, and the Excel parity tests are unchanged. Each month's results also include `custom_items_breakdown`, plus totals for custom revenue, direct costs and expenses.
- **Validation:**
  - amount must be 0 or more
  - start month must be 1–23
  - type and basis must be one of the listed options
  - name can't be empty
  - item IDs must be unique
- **Display:** custom items get their own rows, marked "(custom)", in the financial statement and the CSV export, just above the total they feed into. KPIs, charts, annual rollups, saved scenarios and scenario comparison all include them automatically.
- **Tests:** `tests/test_custom_items.py` covers the math for each type and basis, start months, rollups, validation, the API and saving to a scenario, and older scenarios that have no custom items. Full suite: **99 passed**.
- **Browser check:** a $1,000/month "Sales hire" starting in M7 lowered total EBIT by exactly $17,000 (17 months × $1,000) and appeared as its own row in the OPEX section.

Not included (possible next steps): end dates or growth rates per item, one-time costs, and percent-of-revenue items.
