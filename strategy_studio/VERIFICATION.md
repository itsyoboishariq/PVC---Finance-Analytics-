# Verification

Completed for this build:

- SQLite integrity and foreign-key checks passed.
- Imported 116 screened companies, including 99 core companies; 1,036 total and 885 core company-years; 22,129 source facts; 5,290 adjacent-year changes.
- Eighteen Python tests passed. They cover search/pagination, annual histories and source links, missingness, matching, weights, self-exclusion, disclosure filters, invalid input, comparisons, exports and observed changes.
- A separate test altered all future outcome fields in a copied database; matched row ordering and distances remained unchanged.
- Front-end JavaScript syntax passed verification.
- Browser verification loaded company histories and filing facts, loaded a selected company-year into the matching form, returned financial peers and match explanations, and displayed a selected company-year in the comparison table.
- The Windows launcher was inspected; dependency installation and the API were exercised using the project development environment. A new-machine installation was not independently tested.

The application snapshot is 2026-10-23. These checks validate implementation, not financial prediction accuracy or causality. Adjusted regressions and descriptive strategy/event comparisons are included. No causal event-effect estimates are claimed.

Additional checks cover known regression coefficients, company-level bootstrap draws, rank ties, rank-deficient designs, no-data behavior, invalid analysis requests, starting/spending/outcome chronology, fiscal-event overlap, R&D action grouping and analysis exports.

Browser verification also ran the default adjusted regression (267 rows, 74 companies) and the rising-rate strategy comparison, confirming group counts, explicit outcome timing, source links and sparse-interval handling.
Dashboard/live AI update: 21 tests passed. Browser confirmed cards and charts.
Provider integration tested with a mocked response; real live inference awaits the
user's API key/model. No live market/news/filing feed is connected.
