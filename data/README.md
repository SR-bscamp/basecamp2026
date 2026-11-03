# data/ — mock structured data (Lane C, ticket C2: do this first)

- `booking_codes.json` — about 12 entries: client or project, code, billable flag, owner (include internal codes such as `INT-TRN-001` training and `INT-BEN-001` bench).
- `checklists.json` — per department and role: Day 1 / Week 1 / Month 1 items with **stable ids** and `doc` paths into `knowledge/`.
- `contacts.json` — topic to person or team.

The backend tools (`lookup_booking_code`, `tick_checklist`, `find_contact`) read these files; keep ids consistent with the docs and the contract.
