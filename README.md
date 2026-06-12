# ATS — Applicant Tracking System

A lightweight hiring pipeline for a small HR team (built for ~2 users). Tracks a
candidate from resume upload through interview, feedback, decision, document
collection, and offer.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

Requires Node 18+.

## The pipeline

Candidates move through eight stages, shown as columns on the board:

`Applied → Interview → Decision → Documents → Offer Out → Hired`
plus `On Hold` and `Rejected`.

1. **New candidate** — capture name, email, phone, role, source, and upload a resume.
2. **Schedule interview** — date / time / mode / interviewer.
3. **Send invite + CV** — generates a templated email and lets you download the
   resume to attach.
4. **Feedback** — rating, strengths, concerns, recommendation.
5. **Decide** — Select / On Hold / Reject (Reject auto-drafts the email).
6. **Documents** — editable checklist; offer unlocks once all are collected.
7. **Offer letter** — generated from your inputs; copy or download, then release.
8. **Hired** when the offer is accepted.

Company name, email signature, the document checklist, and both email templates
are editable under **Settings**.

## Project structure

```
src/
  main.jsx                 app entry
  App.jsx                  board, state, persistence, email builders
  config.js                stages + default settings/templates
  styles.css               all styling
  lib/
    storage.js             persistence (localStorage today, swap for an API later)
    helpers.js             pure utilities (dates, ids, templating, download)
  components/
    CandidateDrawer.jsx    per-candidate panel with stage actions
    AddModal.jsx           new candidate + resume upload
    EmailModal.jsx         interview / rejection email composer
    OfferModal.jsx         offer letter generator
    SettingsModal.jsx      company info + templates
    forms.jsx              interview / feedback / document checklist
    primitives.jsx         Section, StageBlock, Field, Modal
```

## Data & persistence

Everything is stored in the browser via `localStorage` (keys prefixed `ats:`),
so the app runs with zero backend setup. Resumes are stored as base64 under
`ats:resume:<id>` (capped at ~3.5MB per file to stay within browser quotas).

`src/lib/storage.js` is intentionally the only place that touches storage, and
its three functions (`sGet` / `sSet` / `sDel`) are already async — so wiring it
to a real backend is a single-file change.

## Taking it to production

This front end is complete and usable, but a shared production tool for a real
team needs a backend. Suggested next steps:

- **Backend**: Node/Express (or Next.js API routes) with PostgreSQL or SQLite.
  Replace `lib/storage.js` with `fetch()` calls to your endpoints.
- **Auth**: login for the two HR users (e.g. Auth.js / Clerk) so the pipeline is shared, not per-browser.
- **Email delivery**: send invites/rejections automatically via SendGrid, AWS
  SES, or Resend — including the resume as a real attachment.
- **File storage**: store resumes/documents in S3 (or similar) instead of base64.
- **Offer letters**: render to PDF server-side and email them.

## Notes

- No emails are actually sent — the app opens your mail client (`mailto:`) and
  provides copy/download, since a browser can't run a mail server.
- Clearing browser storage will erase candidates. Export/backup is a good early
  addition once a backend is in place.
