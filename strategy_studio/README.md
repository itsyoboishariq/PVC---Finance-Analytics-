# Strategy Studio

Research dashboard, financial peer matching, strategy flow builder, and optional OpenAI analyst.

Run `start_app.bat` on Windows, or install `requirements.txt` and run `python run.py`. Open http://127.0.0.1:8771/strategy. The local database is built from the included CSV snapshot on first launch.

For AI features, copy `ai.local.example.json` to `ai.local.json` and enter your own API key and model. The real credential file is excluded from Git.

This folder is a standalone app alongside the repository’s existing financial modeling application.

# SaaS Research — phases 1–5

A local Python API and browser application for **company search and history**, **financial peer matching**, **side-by-side company-year comparisons**, **adjusted relationship analysis**, and **historical strategy/event comparisons**. Includes your fuller annual SEC financial snapshot and a reproducible SQLite import.

## Start the application

On Windows, extract the complete folder, then double-click **start_app.bat**. The launcher creates `.venv`, installs the pinned dependencies on first launch, and opens **http://127.0.0.1:8771**. Python 3.10+ and internet access for the first dependency installation are required. The launcher can use Codex's bundled Python when present. Subsequent analysis is local and needs no API key.

Manual setup:

```sh
python -m venv .venv
```

Windows:

```bat
.venv\Scripts\activate
python -m pip install -r requirements.txt
python run.py
```

macOS/Linux:

```sh
source .venv/bin/activate
python -m pip install -r requirements.txt
python run.py
```

Keep the terminal open while using the app; Ctrl+C stops it. If the port is occupied, use `python run.py --port 8772`. Do not open `static/index.html` directly.

## Included capabilities

### Phase 1 — consistent database

`data/research.sqlite3` contains:

| Table | Meaning |
|---|---|
| `companies` | Stable SEC CIK identifier, historical ticker, name, inclusion flags, IPO and revenue-model evidence |
| `periods` | One issuer and annual fiscal-period end; actual dates, original disclosure cutoff and all preserved financial fields |
| `metric_values` | Numeric financial values, missingness and availability/extraction status |
| `source_facts` | Metric-level SEC facts, tags, accession, form, filing date and URL |
| `targets` | Separate next-year outcomes, outcome disclosure date and eligibility |
| `observed_changes` | Adjacent annual spending and financial changes; never interpolated |
| `events` | Sourced historical event definitions for strategy comparisons |
| `dictionary` | Financial field definitions and units |
| `import_info` | Snapshot, source SHA-256 hashes and schema version |

The import checks source-file hashes, issuer identity, unique issuer-period keys, foreign keys and SQLite integrity. It builds a temporary sibling database and replaces the prior database only after successful validation. Run `python database.py` or `python run.py --rebuild` to reproduce the database. Edit the source manifest intentionally if replacing the data; do not bypass checksum errors without reviewing the change.

### Phase 2 — company search and history

- Search by name, ticker or CIK. Browse 99 core recurring B2B software companies or all 116 screened companies, with exclusions identified.
- View 885 core company-years, or 1,036 company-years across the full screened set.
- Inspect actual fiscal dates, annual revenue/growth/margins/cash/spending, financial profile labels, IPO evidence and SEC source facts.
- Select an annual metric and fiscal-year range. Missing points and long gaps are not joined in the chart.
- Load a particular company-year into peer search or add it to a comparison. Export the company's annual financial history.

### Phase 3 — explainable matching

- Enter a custom financial profile or load a company's observed profile.
- Supply at least three measures. Revenue input is **USD millions** in the interface; ratio inputs are **percentage numbers**, e.g. **40 = 40%**.
- Adjust weights from 0 to 10; 0 ignores a measure. Candidate matching needs at least three observed measures and at least 80% of the selected feature weight covered.
- Restrict candidates to the first six IPO calendar years, training rows, a fiscal-year range, or a full-comparison disclosure cutoff. One closest observation per company is returned. Loaded companies are excluded from their own matches by default.
- Inspect why each profile matched: user/company values, standardized gaps, weights and missing measures. Later outcomes are available in a separate disclosure and never determine ranking.
- Select up to three company-years for explicit-date side-by-side comparison. Export matching rows and save the exact query, settings, matches and caveats as JSON.

## Data and statistical basis

- Financial snapshot is **2026-10-23**; no filings were refreshed for this build. Annual period ends span 2008-01-31 through 2026-07-31. Some companies were acquired or delisted; their latest available history is not a claim of current trading status.
- Source tables come from the earlier expanded SEC extraction: 116 screened companies, 99 strict core companies, 1,036 annual rows, 22,129 financial source observations. Availability is constrained by that extraction; this is not a claim of exhaustive custom-tag coverage.
- Monetary values are USD. API and database ratios are fractions: **0.40 = 40%**. Dates are ISO calendar dates and preserve each issuer's fiscal calendar.
- Null means missing or undefined, not zero. Inventory and debt omissions remain missing. The API exposes extraction status and original filing facts. Reported and derived values are distinct; see the dictionary and existing source metadata.
- Fiscal end year is the calendar year of period end, not necessarily the issuer's fiscal-year label. Early prospectuses can disclose older years much later; the disclosure date is shown separately.
- Per-period values preserve the earlier available-at-cutoff selection. Historical targets remain separate from financial inputs. Future outcomes and company identity never enter distance calculations.
- Library history is broader than the labeled modeling sample. Peer matching requires strict eligibility and observed next-year labels: 622 company-years across 97 companies in the broad sample, or 430 rows across 94 companies in the early-public-years subset before additional query filters.
- Normalization reuses the earlier **274-row training model**: log revenue, revenue growth, operating margin, gross margin, sales and marketing / revenue, and R&D / revenue. Fixed training means/scales and 1st/99th percentile bounds are stored in `data/cluster_model.json`. Raw financials are never clipped. User/candidate values are clipped only for similarity calculations. Out-of-bound user inputs trigger a warning.
- Weighted distance = square root of the weighted sum of squared standardized differences divided by the sum of weights for observed matching inputs. Candidate missing measures are skipped, not imputed. Matched-weight coverage is reported.
- Distances are not match probabilities. Weights express research preferences and can materially change results. Similarity is financial and does not guarantee common industry, customer type, product or competitive exposure.
- Current financial profile labels reuse the earlier descriptive k-means model. Its training silhouette is about 0.21, so clusters overlap. Cluster membership does **not** filter or rank peer matches.
- `available_by` is conservative: both the starting financials and the following-year outcome must be disclosed by that date. It is not a forward-looking prediction query. Research pool results can contain prior validation/test periods and should not be treated as new untouched model evaluation.
- Adjacent-year changes require period ends 330–380 days apart, observed values, and prior-year disclosure no later than the current cutoff. A ratio change can result from a changing numerator or revenue denominator; actual spending changes are stored separately.

## API

Interactive documentation: **http://127.0.0.1:8771/docs**. Swagger's interface may need internet to load its documentation assets; the application itself uses local assets. Machine-readable specification: `/openapi.json`.

| Operation | Purpose |
|---|---|
| `GET /api/summary` | Coverage, snapshot and policies |
| `GET /api/companies?q=HubSpot&scope=core` | Search and paginate companies |
| `GET /api/companies/{company_id}/history` | Complete annual history; optional `start_year` / `end_year` |
| `GET /api/periods/{row_id}/sources?metric=revenue` | SEC facts and availability for a period or metric |
| `POST /api/similar-companies` | Weighted peer matching |
| `GET /api/compare?row_ids=...&row_ids=...` | Compare one to three distinct company-period IDs |
| `POST /api/export/matches` | CSV of the exact returned match rows |
| `GET /api/export/companies/{company_id}/history` | Export annual history CSV |
| `GET /api/metrics` | Financial definitions |
| `GET /api/events` | Historical event windows and source links |
| `POST /api/analysis/relationship` | Correlations and unadjusted/adjusted OLS with company-bootstrap intervals |
| `POST /api/analysis/strategy-comparison` | Compare observed actions among financially similar starting profiles |
| `POST /api/export/analysis/relationship` | Exact complete-case analysis rows, controls and sources as CSV |
| `POST /api/export/analysis/strategy-comparison` | Matched strategy observations, timelines and sources as CSV |

Example request to `/api/similar-companies`:

```json
{
  "profile": {
    "revenue": 100000000,
    "revenue_growth": 0.30,
    "operating_margin": -0.15,
    "gross_margin": 0.75,
    "sales_marketing_ratio": 0.40,
    "rd_ratio": 0.25
  },
  "weights": {"log_revenue": 1, "revenue_growth": 2, "operating_margin": 1},
  "stage_only": true,
  "one_per_company": true,
  "pool": "research",
  "limit": 10
}
```

Unspecified weights default to 1; unknown weight names are rejected. Omit unknown profile values or use null. Validations reject invalid year ranges, unsupported fields, nonfinite numbers, out-of-range ratios and fewer than three active inputs. For example, 75 is invalid as API gross margin; use 0.75. The interface converts percentages for you.

Run `python example_client.py` while the server is running for a standard-library client example.

## Tests

```sh
python -m unittest discover -s tests -v
```

Checks cover database integrity and counts, search/pagination, history and filing links, missingness, weighted matching, self-exclusion, disclosure/training filters, invalid queries, comparison, CSV export and adjacent-year changes. Development verification also exercised the browser interface.

## Files and deployment scope

`database.py` imports SQLite; `service.py` contains analytical retrieval/matching; `api.py` declares the FastAPI endpoints and validation; `run.py` launches Uvicorn. `static/` contains the browser interface. `data/` contains the source tables, source hash manifest, previous clustering model, event definitions and built database.

The server binds to **127.0.0.1 only**. Inputs are processed locally and not saved. This is a local research application, not an authenticated public service. Your earlier hosted scenario site is a separate application and is not modified by this package. Phases 4–5 add adjusted relationships and historical strategy/event outcome comparisons as described below. Causal effects, live data refresh and natural-language querying remain outside this release.


## Phase 4 — financial relationships and adjusted regression

Open **Relationships**. Choose an observed financial predictor and a next-year outcome, then select controls. Default: sales and marketing / revenue predicts next-year revenue growth, accounting for current growth and company size. A 10-percentage-point higher ratio means, for example, 30% versus 40% of revenue.

The screen shows complete-case counts, distinct-company counts, missing exclusions, an unadjusted scatterplot, Pearson and Spearman correlations, and unadjusted versus adjusted OLS coefficient estimates. All calculations run in Python, with observed financial values and no imputation or clipping in regression. Both fits use the exact same complete cases so the coefficient comparison is not driven by a different missing-data sample.

OLS centers/scales its inputs for numerical stability and transforms the predictor coefficient back to outcome percentage-point difference for a 10-percentage-point higher predictor. Controls can be log revenue, current revenue growth, current operating margin and gross margin. The predictor cannot also be a control. Rank-deficient, constant-input or constant-outcome fits are not reported as usable estimates.

Regression needs at least 30 complete observations and 10 companies. Uncertainty uses a fixed-seed percentile bootstrap of **whole companies**, preserving repeated annual observations within each sampled company. The interface uses 1,000 draws; the API supports 200–2,000. Resamples with rank-deficient designs are skipped. At least 80% of requested draws must be valid to report a 95% interval. There are no p-values or multiple-testing corrections. High condition numbers trigger a collinearity warning. R² and RMSE are explicitly in-sample, not forecast validation.

Example API request:

```json
{
  "predictor": "sales_marketing_ratio",
  "target": "target_revenue_growth",
  "controls": ["revenue_growth", "log_revenue"],
  "pool": "train",
  "stage_only": true,
  "bootstrap_samples": 1000
}
```

The default observed sample contains 267 complete rows across 74 companies. Its estimated difference is about +2.87 percentage points without controls and +1.02 after controls, per 10 points higher sales ratio. The adjusted interval crosses zero. This is an implementation check against the earlier analysis, not a claim of causality or new predictive accuracy.

Available predictors: sales/marketing ratio, R&D ratio, G&A ratio, operating cash flow margin, gross margin, current growth, current operating margin and deferred revenue growth. Targets: next-year revenue growth and next-year operating margin. Optional fiscal-year and disclosure filters are supported. The training sample is the default; all-history research includes previously inspected evaluation periods and is not a fresh holdout.

Exports include the exact company-year rows, selected predictor, target, control values, current and outcome filing links, and disclosure dates. Save analysis exports settings, estimates, methods and observations as JSON.

## Phase 5 — observed strategies and historical event context

Open **Strategies & events**. The starting profile and weights come from **Find peers**. Edit those values there, then run a comparison. Choose sales/marketing or R&D spending, a historical event (or custom dated context), a financial distance threshold, and whether outcomes are measured **during** the spending year or in the annual period **following** it.

Every returned sequence is aligned as:

**Starting financial year → spending-change year → explicitly dated outcome year.**

Matching uses the starting financial profile only, before observing the spending change or outcome. The starting financials must have been publicly disclosed before the spending year ended, but they can have been disclosed after it began. This is retrospective financial research and is not a point-in-time decision backtest. Annual period ends must be 330–380 days apart, per the stored observed-change rules.

Events filter **spending fiscal periods that overlap the research window**. Source links identify the underlying historical event. Window ends are analyst research choices. Calendar overlap does not establish a company's exposure, AI adoption, or response to an event. The app does not fetch live news or adjust a prediction by an invented event effect.

Observed actions are grouped as increased, held, or reduced ratio. Default held threshold: ±2 percentage points; increases/reductions must exceed that range. Both the ratio change and actual expense-dollar change are exposed, since a ratio can rise when revenue falls. Each action group selects the closest observation per company **within that group**, independent of outcomes. A company may appear in multiple groups in different years, so group results are not independent.

Group medians require at least 5 distinct companies. A 95% median interval requires at least 10 companies and uses 1,000 within-group company resamples, fixed seed 827. Intervals describe sampling variation among the selected matched companies; they do not include all matching/selection uncertainty, shared macroeconomic shocks, or a causal difference between strategies. Empty or sparse groups do not receive fabricated outcomes. Files can be inspected for starting-year, spending-year and outcome-year evidence.

Example request to `/api/analysis/strategy-comparison`:

```json
{
  "profile": {
    "revenue": 100000000,
    "revenue_growth": 0.30,
    "operating_margin": -0.15,
    "gross_margin": 0.75,
    "sales_marketing_ratio": 0.40,
    "rd_ratio": 0.25
  },
  "action_metric": "sales_marketing_ratio",
  "event_id": "rates",
  "outcome_timing": "following",
  "threshold_pp": 2,
  "max_distance": 1,
  "stage_only": true,
  "pool": "research"
}
```

For a custom event, use `event_id: "custom"`, `event_name`, `event_start` and `event_end` in ISO date format. `available_by` includes the outcome disclosure for following-year comparisons; during-year comparisons require disclosure of the spending-year financials. Starting years are measured before the spending change; fiscal-year filters and early-public-year scope apply to the **spending year**. Following-year comparisons require strict observed-label eligibility; during-year comparisons use observed current growth and operating margin without inventing next-year labels.

## Interpretation

Neither adjusted regression nor historical strategy grouping establishes the causal return from increasing spending. Demand, products, acquisitions, accounting and financing can affect both spending and outcomes. A confidence interval excluding zero is exploratory evidence of an association, not proof of a business decision's effect. Company bootstrap intervals account for company-level repetition but not every source of dependence or bias.

## Visual dashboard and live OpenAI analysis

The home page now shows company/year filters, five KPI cards, annual revenue,
growth/profitability and spending charts, and an adjusted relationship scatterplot.
Detailed peer and event research remains at /advanced.

To activate live AI answers:
1. Open ai.local.json beside run.py (copy ai.local.example.json if absent).
2. Fill OPENAI_API_KEY with your own API key and OPENAI_MODEL with a Responses-compatible model ID available to your account. Keep both values inside the JSON quotes.
3. Save the file and reload the dashboard. No server restart is needed.
4. Click Ask live AI. API usage is billed by your provider.

Environment variables OPENAI_API_KEY / OPENAI_MODEL override file values.
The local credential file is ignored by Git and excluded from the distributed ZIP.
Do not paste keys into chat, share that file, or publish this local app to a network.
The current local file is blank; live provider calls have not been verified with a real key.

GET /api/ai/status reports connection configuration without exposing a key.
POST /api/ai/analyze accepts company_id, period_end, question, and validated
relationship settings. The server computes the evidence itself, sends selected
company history, source facts, regression results and the question to OpenAI,
and returns a live explanation plus the evidence. No financial/news refresh occurs.
The financial snapshot remains 2026-10-23. AI explanations can be wrong; inspect
returned evidence. Statistical associations do not establish causal spending effects.
Provider HTTP errors are redacted; store:false is used. Questions are not persisted
by this app. A configured key/model does not guarantee provider billing/access.

Implementation reference: https://developers.openai.com/api/docs/guides/text
Verification: 21 unit/API checks passed, including mocked provider calls, missing
credentials, unchanged research checks and dashboard routes. Browser verified five
cards, observed financial trends and the 267-row / 74-company relationship result.

## Strategy Studio
Open /strategy to build an editable flow from a financial profile, one or two
spending decisions, a historical context and an objective. Evidence orchestration
runs financial-distance matching, adjusted OLS with company bootstrap intervals,
and historical action-group comparisons. Proposed budgets hold revenue fixed.
Decisions are analyzed independently; no joint causal or predictive model is claimed.
AI analyst mode receives the flow and computed evidence, providing branch-specific
findings, tradeoffs and next tests. This workspace does not search live news.
Save flow stores editable inputs in this browser's local storage; edits mark prior
results stale. The existing research dashboard remains at /.

## Research side analyst
Use Ask analyst on the dashboard, detailed research or Strategy Studio. The chat
uses the current screen, financial profile, computed nearest peers and a training
sample regression. It returns multiple-choice follow-ups and bounded navigation
buttons. Open flow transfers the financial profile; compare strategies opens the
existing matched action-group analysis. Conversation persists within this browser
session. Screen context and profile are sent to OpenAI on each submitted question.
This panel does not search live news or execute arbitrary AI-generated code.
