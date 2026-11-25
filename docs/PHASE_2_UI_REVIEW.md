# Phase 2: Financial Model UX

Branch: `feature/phase-1-financial-reliability`. Frontend only: no change to the engine, API or financial formulas (99 backend tests still pass). Strategy Studio untouched.

## Problems found (from running the app at 1440px and 375px)

| Area | Problem |
|---|---|
| KPI cards | Six cards with equal weight in a 4 + 2 layout. Each value had its own colour. Every card repeated "Matches Excel Baseline", and the Excel cell badges drew more attention than the numbers. |
| Assumptions editor | Percentage fields reformatted on every keystroke, so typing "50" became "5.0". Nothing showed which inputs had been changed. OPEX was a flat list with no subtotals. |
| Monthly table | About 1,150 px tall and 3,400 px wide. Month headers scrolled out of view and the sideways scrollbar only appeared at the bottom. There was no way to jump to a period or show just the totals. |
| Charts | The tooltip was pinned to one corner and showed the same five values on every chart. Hover targets were 3.5px dots, axis ticks fell on odd values ($182, $364…), losses were shaded green, and custom revenue was ignored. |
| Scenario comparison | Could only compare against the workbook baseline. Negative percentage-point changes showed as "-0.0%". Labels used Excel cell codes. |

## What changed

**KPI hierarchy** (`KPICards.jsx`)
- One hero figure: cumulative EBIT, with the first profitable month and a small bar chart of monthly profit and loss.
- Two primary tiles, total revenue and active customers at M23, each with a 23-month trend line.
- A quieter row below for weighted ARPU, gross margin and customer-months.
- The Excel match is stated once ("All figures match the Excel workbook"). Each tile shows a change only when it differs, in green or red with an arrow, the amount and the percentage.
- Excel sources sit behind small icon buttons.

**Assumptions editor** (`AssumptionsEditorView.jsx`)
- Number fields keep exactly what you type and only reformat when you leave the field, or when the value changes from elsewhere (for example, a reset).
- Changed inputs get an amber outline, their workbook value, and a per-field Reset. Tabs show how many inputs differ from the workbook.
- Pricing shows a live total of the tier shares with a one-click "Set Trial to X% to balance".
- OPEX is grouped by category with subtotals and a monthly total. Monthly leads show their total and mark changed months.

**Monthly table** (`FinancialTableView.jsx`)
- The table scrolls inside its card (up to 72% of the viewport height), so headers and the sideways scrollbar stay visible.
- A toolbar lets you:
  - jump to Year 1, Year 2, the break-even month or any month
  - expand or collapse all sections
  - switch to "Key rows only" (totals and headline rows)
  - show or hide the Excel ref column
- A divider marks the start of year 2.

**Charts** (`ChartsView.jsx`)
- A crosshair snaps to the nearest month, by mouse or arrow keys. The tooltip lists every series, puts the value first, and flips sides near the edge.
- The new default **Profitability** chart shows:
  - monthly EBIT as green bars (profit) and red bars (loss) around a zero line
  - revenue and total-cost lines on the same dollar axis (no dual axis)
  - a break-even marker and a short summary line
- Revenue is stacked by plan, plus Trial and custom revenue when they're present. Customer and funnel charts show related numbers (new paid, churned, trials) in the tooltip.
- Axis ticks fall on round numbers. Colours come from the validated dark palette and stay tied to their series. Charts draw at their real width and shrink to phone width.

**Scenario comparison** (`ScenarioComparisonView.jsx`)
- Compare the current model, including unsaved edits, with the workbook baseline or any saved scenario. Saved scenarios are recalculated with the current engine.
- Outcomes side by side with signed differences, including the first profitable month.
- Cumulative EBIT over time for both scenarios.
- An automatic list of inputs that differ: funnel, pricing, COGS, each OPEX line, and custom items.

**Shared** (`index.css`)
- Spacing scale (`--space-1` to `--space-6`) and data-viz colour tokens: series, grid, axis, and good/bad change colours.

## Checked in the browser

- 1440px: KPI layout; table jumps land on M1, M13 and the break-even month; headers stay pinned after scrolling; "Key rows only" shows the totals.
- Charts: the tooltip content is correct for each chart and flips at the right edge.
- Comparison with Growth Acceleration: outcomes, chart and 12 differing inputs.
- Editor:
  - typing "50" keeps "50"
  - a tier total of 120% offers "Set Trial to 40%", which brings it back to 100%
  - Reset restores the workbook value even while the field has focus
- 375px: no content overflows the page. The tab bar, segmented controls and the table scroll sideways inside their own areas.

## Not done / ideas for later

- Charts have no table view of their own; the Financial Model Statements tab serves as that.
- The Lead Generation Database tab was out of scope and is unchanged.
- The header and toolbar at the top weren't redesigned. On phones the header buttons wrap onto three rows.
- No frontend test framework exists. These changes were checked by building and running the app in a browser.
