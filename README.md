# UCSD Grade Dashboard

A Chrome extension for estimating UCSD DSC course grades from Gradescope data and public course policy pages.

The extension scrapes visible assignment rows from Gradescope, tries to detect the course grading policy from common DSC course websites, and opens a local what-if board for editing weights, scores, categories, dropped items, and hypothetical future assignments.

## Current Features

- Scrapes assignment names, scores, and maximum scores from Gradescope pages.
- Stores scraped grade data locally in `chrome.storage.local`.
- Detects DSC course codes from Gradescope names like `DSC 80`, `DSC100`, or `DSC 140A`.
- Attempts public policy discovery from the `dsc-courses` GitHub organization:
  - looks for matching repos like `dsc10-2026-su`, `dsc10-2026-sp`, or `dsc80-2025-fa`
  - prefers repos whose term matches the Gradescope course title when a term is visible
  - tries the repo's configured homepage if GitHub provides one
  - tries GitHub Pages URLs such as `https://dsc-courses.github.io/dsc10-2026-su/`
  - tries raw repo files such as `syllabus.md`, `syllabus/index.md`, `README.md`, and `index.md`
- Falls back to common stable DSC course URLs:
  - `https://dscXX.com/syllabus/`
  - `https://dscXX.com/syllabus.html`
  - `https://dscXX.com/`
  - `https://dscXX.org/syllabus/`
  - `https://dscXX.org/syllabus.html`
  - `https://dscXX.org/`
  - `https://dsc-courses.github.io/dscXX/syllabus/`
  - `https://dsc-courses.github.io/dscXX/syllabus.html`
  - `https://dsc-courses.github.io/dscXX/`
- Parses weighted grading tables from public policy text.
- Adds generic category matchers for common policy components:
  - labs
  - projects
  - checkpoints
  - homework
  - assignments
  - quizzes
  - exams
  - midterms
  - finals
  - discussions
  - attendance or participation
  - reading
- Keeps a known DSC 80 fallback scheme for cases where the public policy page cannot be parsed cleanly.
- Opens a full category board for local simulations.
- Supports local what-if editing:
  - edit category weights
  - edit assignment scores and max scores
  - add categories
  - add hypothetical assignments
  - drop or restore assignments
  - drag assignments between categories

## How The Policy Parser Works

The extension does not use an AI model for policy parsing. The flow is deterministic:

1. `src/coursePolicy.ts` extracts the course code from the selected Gradescope course name.
2. It asks the public GitHub API for repositories in `dsc-courses`.
3. It ranks matching repositories by term match and recency. For example, `DSC 10 Summer 2026` should prefer `dsc10-2026-su`.
4. It builds candidate URLs from verified repo metadata, GitHub Pages, raw repo files, and then stable fallback domains.
5. It fetches each candidate page in order.
6. It strips HTML into readable text.
7. `src/policyParser.ts` looks for weighted grading rows, especially tables with a `Component` and `Weight` structure.
8. Parsed rows are normalized into calculator categories such as `Labs`, `Projects`, `Quizzes`, or `Exams`.
9. Each category gets generic assignment matchers so Gradescope item names can be grouped under the detected policy.
10. If the parsed weights look complete, usually close to 100%, the detected scheme is used.
11. If parsing fails, the app falls back to a known course scheme when one exists, currently DSC 80, or equal category weights.

## Limitations

- This is an estimate, not an official course grade.
- The parser currently handles weighted grading schemes best.
- Credit-based grading systems are typed in the code but not implemented in the calculator yet.
- Final redemption is detected but not applied yet.
- Late policies, slip days, extra credit, and uneven subweights are detected as warnings but not fully modeled.
- Canvas support is not implemented.
- What-if simulations are temporary and reset on reload.
- Chrome requires host permissions for policy-page fetching. The manifest includes `api.github.com`, raw public files from `dsc-courses`, `dsc-courses.github.io`, and many common DSC `.com` and `.org` hosts. An unusual custom domain may still fail until that host is added.

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

Package the extension zip:

```bash
npm run package
```

## Local Chrome Testing

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist` folder.
6. Open a Gradescope course page and refresh it.
7. Open the extension popup.
8. Click `Open category board`.
9. Use `Detect policy` to fetch and parse the public policy page.

## Publishing Notes

This is not ready for a public Chrome Web Store launch without more testing. Before publishing:

- Test against multiple real DSC courses, not only DSC 80.
- Decide whether broad policy host permissions are acceptable or whether to move to optional host permissions.
- Add more known fallback schemes for courses whose policy pages are hard to parse.
- Implement or clearly disable unsupported grading systems such as credit-based grading.
- Verify Chrome Web Store privacy disclosures against the final network behavior.
- Link to `PRIVACY.md` or a hosted privacy policy.
- Publish as unlisted first and test with a small group.

## Privacy

See [PRIVACY.md](./PRIVACY.md).
