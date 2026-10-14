# PROHEALTH CARE LABORATORY — Utility App

A React + Vite + Tailwind CSS single-page app with four tools available
from one Home screen:

1. **Payment Receipt** — generate and print patient payment receipts.
2. **PDF Editor** — upload and merge multiple PDFs, reorder pages, delete
   pages, and download one final PDF, all in one workspace.
3. **Doctor Incentive Report** — patients, tests, payments and incentives for
   one doctor over a reporting period, with totals.
4. **Billing Report** — billing entries for several doctors in one session;
   every doctor's report prints on its own page, with negative amounts supported.

All PDF processing happens entirely in the browser (via `pdf-lib` and
`pdfjs-dist`) — files are never uploaded to a server. Nothing entered in the
report forms is stored anywhere; the pages warn before you leave with unsaved work.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview   # to test the production build locally
```

`npm run build` outputs a static site to `dist/` that can be hosted anywhere
(e.g. Netlify, Vercel, an internal server, or opened directly).

## Editing the lab's identity

All fixed laboratory details (name, tagline, email, phone, document title)
live in one place: `src/labConfig.js`. Change them there and every receipt
updates.

## Project structure

```
src/
  pages/
    Home.jsx                  Landing page with the four options
    PaymentReceipt.jsx        Receipt generator (protected, unchanged)
    PdfEditor.jsx             Unified PDF workspace (merge + reorder + delete)
    DoctorIncentiveReport.jsx Incentive report form + live preview
    BillingReport.jsx         Multi-doctor billing report form + preview
    PdfPageAdjuster.jsx, PdfPageDeleter.jsx   (legacy, not routed - safe to delete)
  components/
    (receipt components, untouched)
    PdfDropZone.jsx, PdfPageCard.jsx          PDF editor pieces
    PdfNameDialog.jsx         "Name your PDF" prompt used by every PDF download
    ReportHeader.jsx          Lab name/address/contact + report title
    EntryEditor.jsx           Editable add/edit/delete entry rows (both reports)
    BillingReportPreview.jsx, IncentiveReportPreview.jsx   Print-ready previews
    BackToHomeLink.jsx        Back link that confirms if there is unsaved work
  hooks/useUnsavedWarning.js  Browser warning on reload/close with unsaved work
  utils/
    reportCalculations.js     Pure: parsing, totals, formatting, validation
    reportPdf.js              Builds the report PDFs with pdf-lib
    fileName.js               Cleans the PDF name the user types
    pdfUtils.js, pdfWorkspace.js, numberToWords.js, formatCurrency.js
  labConfig.js                Lab name, address, contact (single place to edit)
  reportPrint.css             Print rules for the two reports (scoped, receipt unaffected)
  App.jsx                     Routes: /, /receipt, /pdf-editor, /doctor-incentive, /billing-report
```

### Payment Receipt

Unchanged from before — same form, calculations, preview, print CSS, and A4
layout. It was only moved into `src/pages/PaymentReceipt.jsx` and given a
"Back to Home" link so it can be reached via routing; no business logic was
touched.

Total, payable amount, and the amount-in-words conversion
(`src/utils/numberToWords.js`, Indian numbering system: Lakh/Crore) are all
calculated automatically — no manual math required. The "Received" field
auto-fills with the payable amount but can be edited manually if a different
amount was actually collected.

### PDF Editor

One continuous workflow:

1. **Upload** one or more PDFs (file picker or drag-and-drop). Add more at any
   time; remove a file with **Remove**; change merge order with ↑ / ↓.
2. All pages appear in a unified workspace, in upload order then page order.
   Each thumbnail shows its final position, source file and original page
   number. A **By file** view groups pages by source file.
3. **Reorder** by dragging a page anywhere (also across files) or with the
   ◀ ▶ buttons. **Reset Page Order** restores the original combined sequence
   without restoring deleted pages.
4. **Delete**: click/check pages, press **Delete Selected Pages**, then
   **Confirm Delete**. Deleting every page is blocked ("At least one page must
   remain"). **Undo Last Deletion** restores pages to their previous positions.
5. **Download PDF** builds one new PDF from the *original uploaded bytes*
   (original pages are copied with `pdf-lib`, not re-rendered images), in
   exactly the displayed order. Page sizes and orientations are preserved.
6. **Start New Session** clears the workspace.

Notes: moving a file with ↑ / ↓ rebuilds the combined order (manual page
moves are reset, deleted pages stay deleted). Password-protected, corrupted
or empty PDFs are rejected with a message while other files in the same batch
still load.

### Naming downloaded PDFs

Every **Download PDF** button (PDF Editor, Doctor Incentive Report, Billing
Report) first opens a small dialog asking what the file should be called. The
name is cleaned (characters not allowed in file names are replaced) and `.pdf`
is added automatically. Each dialog suggests a sensible default.

### Doctor Incentive Report

Enter doctor, report date and period, then add entries (date, patient, tests,
payment, incentive). Totals update as you type. **Print Report** prints only
the report (A4, column headings repeat on later pages, rows are never cut
across pages, totals appear once at the end). **Download PDF** produces the
same report as a PDF.

### Billing Report

Add as many doctors as needed, each with its own entries. **Negative amounts,
zero and decimals are valid** and are never converted or clamped; each doctor's
total is the net sum of only their own entries (e.g. 130 + 200 - 50 = ₹280.00,
100 + 50 - 200 = -₹50.00). When printed, **every doctor's report starts on a new
page** (none before the first), a long report continues over several pages with
repeated column headings, and its total is shown once, after the last row.
"Remove Doctor" asks for confirmation.

Note: the downloaded report PDFs use standard PDF fonts, so the rupee sign is
written as "Rs." and characters outside basic Latin (for example Devanagari)
appear as "?". The on-screen preview and browser print use the normal font.

## Test scenario (from the original brief)

| Field | Value |
|---|---|
| Patient ID | 108950 |
| Date | 2026-05-18 |
| Name | PAYAL |
| Age / Sex | 29 / Female |
| Ref Dr. | SELF |
| Test 1 | URINE ROUTINE — ₹100 |
| Test 2 | CULTURE AND SENSITIVITY URINE — ₹350 |
| Discount | ₹0 |
| Payment Mode | Cash |

Expected result: **Total ₹450**, **Received ₹450**,
**Amount in Words: Four Hundred Fifty Rupees Only**.

## Test scenarios for the PDF Editor

- **A – Merge:** upload PDFs of 2 and 3 pages → 5 pages in upload order.
- **B – Reorder across PDFs:** move a page from the 2nd PDF to the start →
  downloaded PDF matches the preview.
- **C – Delete:** upload a 6-page PDF, delete pages 2 and 5 → result is 1, 3, 4, 6.
- **D – Combined:** three PDFs, reorder, delete, download.
- **E – Add files:** reorder one PDF, then add another → existing order kept.
- **F – Reset order:** reorder, delete, reset → original relative order,
  deleted pages stay deleted.
- **G – Payment Receipt:** works exactly as before.
