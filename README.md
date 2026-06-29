# UCSD Grade Dashboard

A Chrome extension for estimating DSC course grades from Gradescope data.

The current implementation is focused on DSC 80. It scrapes visible assignment rows from Gradescope, applies the DSC 80 grading scheme, and provides a full-page what-if board for editing category weights, assignment scores, dropped items, and hypothetical future assignments.

## Current Features

- Scrapes assignment names and scores from Gradescope pages.
- Stores scraped grade data locally in `chrome.storage.local`.
- Detects DSC 80 category weights:
  - Labs: 20%
  - Projects: 25%
  - Project Checkpoints: 5%
  - Midterm: 20%
  - Final: 30%
- Maps DSC 80 Gradescope names like `Exam 01` and `Exam 02` to Midterm and Final.
- Shows category-level grade summaries.
- Opens a full category board from the popup.
- Supports local what-if simulations:
  - edit category weights
  - edit item scores
  - add categories
  - add hypothetical assignments
  - drop or restore assignments
  - drag assignments between categories

## Limitations

- This is an estimate, not an official course grade.
- Final redemption is detected but not applied yet.
- Canvas support is not implemented.
- Course policy scraping is experimental and not wired into the extension flow yet.
- What-if simulations are temporary and reset on reload.

## Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build the extension:

```bash
npm run build
```

Check code quality:

```bash
npm run lint
```

## Local Chrome Testing

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist` folder.
6. Open a Gradescope course page and refresh it.
7. Open the extension popup.

## Publishing Checklist

Before submitting to the Chrome Web Store:

- Verify the extension works on real DSC 80 Gradescope pages.
- Keep permissions minimal.
- Add production-quality icons if the placeholder icons are not sufficient.
- Fill out Chrome Web Store privacy disclosures accurately.
- Link to `PRIVACY.md` or a hosted privacy policy.
- Publish as unlisted first and test with a small group.

## Privacy

See [PRIVACY.md](./PRIVACY.md).
