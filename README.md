# Poondu Ledger

A simple business tracker for our garlic (poondu) trading business, run by
Thendral, Nagaraj, and Senthil.

## What this is

- `frontend/index.html` — the app itself. Open it in a browser (or visit the
  GitHub Pages link once set up) to log sales, expenses, inventory lots, and
  see partner contributions and reports.
- `backend/Code.gs` — the Google Apps Script code that saves everything into
  our shared Google Sheet, which acts as the database.
- `docs/DEPLOYMENT.md` — step-by-step instructions for publishing changes.

## How data flows

```
index.html (browser)  --->  Apps Script web app  --->  Google Sheet
                       <---                        <---
```

Every save (a new sale, a new expense, a new lot) is sent to the Apps Script
web app, which appends one row to the relevant sheet tab. The app also reads
from the sheet on load so all three of us always see the same numbers.

## Google Sheet

https://docs.google.com/spreadsheets/d/1LUGAEclAgBU2H3KJhYPBlm8mTlIKy32gTA_b0z2ywlc/edit

## Making a change

See `docs/DEPLOYMENT.md`. Short version: edit the file, commit, push, and for
backend changes also run `clasp push` to send it to Apps Script.

## Reports

The Reports tab in the app shows daily / weekly / monthly / quarterly revenue
and expense totals, computed live from the Sales and Expenses sheets. For
anything more custom (per-partner, per-lot breakdowns), open the Google Sheet
directly and use a Pivot Table on the Sales tab — no code change needed.
