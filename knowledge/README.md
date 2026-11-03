# knowledge/ — mock company docs (Lane C)

Markdown docs for the fictional company "Northwind Advisory", one folder per department: `it/`, `hr/`, `finance/`, `consultants/`. The backend loads **all** of them into one cached prompt prefix, and citations point at these paths (for example `finance/booking-codes.md`).

Rules: concrete, checkable facts (codes, dates, steps, links); no real organizations or people; ids consistent with `data/checklists.json`. Ticket C1a (six core docs) first, C1b (more) later. Together they should reach roughly 5–6K tokens.
