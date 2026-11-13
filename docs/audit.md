---
description: Audit the current Tripla code against AGENTS.md, DATA_CONTRACT.md and FLOWS.md. Read-only, no code changes.
---

# /audit — Tripla gap analysis

Do NOT modify any file except creating `docs/AUDIT.md`.

1. Read `AGENTS.md`, `docs/DATA_CONTRACT.md`, `docs/FLOWS.md`.
2. List every HTML page and every JS file. For each page record: purpose, which scripts it loads, which `js/api.js` functions it calls, and whether it touches `localStorage` directly.
3. Read `js/api.js` and `data/*.json`. Build the real list of entities, fields and `localStorage` keys that exist today, and compare them with `docs/DATA_CONTRACT.md`. Note differences (missing fields, different names, different enums).
4. Build a **link map**: for every `<a>`, button and `onclick` on each page, where does it go? Mark dead links (`#`, missing file, empty handler).
5. Walk through every flow F0–F9 in `docs/FLOWS.md`. For each step mark `done`, `partial` or `missing`, and say exactly where it breaks (file and function).
6. Write `docs/AUDIT.md` with these sections:
   - **Summary** (5 lines max)
   - **Existing UI that must not change** (pages and components worth preserving)
   - **Data differences** (table)
   - **Dead links** (table: page, element, current target, suggested target)
   - **Flow status** (table: flow, step, status, file/function, what is missing)
   - **Direct `localStorage` usage** to move into `js/api.js`
   - **Proposed order of work** following the priority list in `AGENTS.md`, with a size estimate (S/M/L) per item
   - **Questions for the user** (include the open decisions from `docs/DATA_CONTRACT.md` §7)
7. Reply in Vietnamese with the summary and the questions. Do not start implementing.
