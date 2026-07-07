# UCSD Grade Dashboard

A Chrome extension for estimating UCSD DSC course grades from Gradescope data and public course policy pages.

The extension scrapes visible assignment rows from Gradescope, tries to detect the course grading policy from common DSC course websites, and opens a local what-if board for editing weights, scores, categories, dropped items, and hypothetical future assignments.

## Current Features

- Scrapes assignment names, scores, and maximum scores from Gradescope pages.
- Stores scraped grade data locally in `chrome.storage.local`.
- Detects DSC course codes from Gradescope names like `DSC 80`, `DSC100`, or `DSC 140A`.
- Attempts public policy discovery from stable course URLs and the `dsc-courses` GitHub organization:
  - tries common course URLs such as `https://dsc80.com/syllabus/` before GitHub discovery
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
- Follows syllabus, grading, and policy links found on public course pages, including public Google Docs syllabi.
- Allows pasted syllabus grading text in the category board when the policy is in a private document or an unsupported site.
- Parses weighted grading tables from public policy text.
- Parses DSC140B-style credit grading policies where optional credits reduce exam weight.
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
- Keeps known DSC 20 and DSC 80 fallback schemes for cases where the public policy page cannot be parsed cleanly.
- Opens a full category board for local simulations.
- The full category board defaults to `Auto theme`, matching Chrome or OS light/dark mode, with manual Light and Dark overrides.
- Supports local what-if editing:
  - edit category weights
  - edit assignment scores and max scores
  - add categories
  - add hypothetical assignments
  - drop or restore assignments
  - drag assignments between categories
- Supports release-hygiene controls:
  - refresh automatic policy detection
  - clear stored Gradescope data for the selected course

## DSC Requirement Course Coverage

The current parser and tests target these requirement-course policy formats:

| Course | Primary site pattern | Parser support |
| --- | --- | --- |
| DSC 10 | `https://dsc10.com/` | Weighted component table, drops, warnings for late or extra credit policy |
| DSC 20 | `https://dsc20.org/` | Weighted component table, Skill Tests, Weekly Learning/Practice |
| DSC 30 | `https://dsc30.com/` | Candidate URLs are generated, but add real syllabus text or a reachable URL before relying on it |
| DSC 40B | `https://dsc40b.com/` | Leading-percent grading lists and repeated midterm rows |
| DSC 80 | `https://dsc80.com/` | Weighted component table, checkpoints, Exam 01 to midterm, Exam 02 to final |
| DSC 106 | `https://dsc106.com/` | Weighted component table with numbered projects and final project |
| DSC 140A | `https://dsc140a.com/` | Public Google Doc syllabus link or pasted Google Doc grading text |
| DSC 140B | `https://dsc140b.com/` | Credit-system grading where optional credits reduce exam weight |

Manual pasted text is intentionally supported because some courses publish the real grading section in Google Docs or course-specific pages that Chrome cannot fetch without a new host permission. Paste only the grading breakdown section when possible. Shorter input reduces false matches.

## How The Policy Parser Works

The extension does not use an AI model for policy parsing. The flow is deterministic:

1. `src/coursePolicy.ts` extracts the course code from the selected Gradescope course name.
2. It builds stable course URL candidates such as `https://dsc80.com/syllabus/`.
3. It asks the public GitHub API for repositories in `dsc-courses`.
4. It ranks matching repositories by term match and recency. For example, `DSC 10 Summer 2026` should prefer `dsc10-2026-su`.
5. It builds additional candidate URLs from verified repo metadata, GitHub Pages, and raw repo files.
6. It fetches each candidate page in order.
7. It follows only course-local syllabus links, public Google Docs syllabi, `dsc-courses.github.io`, and raw `dsc-courses` GitHub files.
8. It strips HTML into readable text.
9. `src/policyParser.ts` first looks for credit-system policies such as DSC140B, where optional credits reduce exam weight.
10. If no credit system is found, it looks for weighted grading rows, especially tables with a `Component` and `Weight` structure.
11. It also handles heading-style rows like `Homework (10%)` and leading-percent rows like `8%: Labs`.
12. Parsed rows are normalized into calculator categories such as `Labs`, `Projects`, `Quizzes`, or `Exams`.
13. Each category gets generic assignment matchers so Gradescope item names can be grouped under the detected policy.
14. If the parsed weights look complete, usually close to 100%, the detected scheme is used.
15. If parsing fails, the app falls back to a known course scheme when one exists, currently DSC 20 and DSC 80, or equal category weights.

## Limitations

- This is an estimate, not an official course grade.
- The parser currently handles weighted grading schemes and DSC140B-style credit grading.
- Credit-based homework assumes Gradescope scores represent earned credit values, which should be checked against the course's Gradescope setup.
- Final redemption is detected but not applied yet.
- Late policies, slip days, extra credit, and uneven subweights are detected as warnings but not fully modeled.
- Canvas support is not implemented.
- What-if simulations are temporary and reset on reload.
- Chrome requires host permissions for policy-page fetching. The manifest is currently scoped to the target DSC requirement course sites, public Google Docs syllabi, `api.github.com`, raw public files from `dsc-courses`, and `dsc-courses.github.io`. An unusual custom domain may still fail until that host is added.

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

Run parser and calculator tests:

```bash
npm run test
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

- Complete the checks in [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).
- Use [STORE_LISTING.md](./STORE_LISTING.md) for Chrome Web Store product details, privacy answers, and reviewer notes.
- Test against the target DSC requirement courses, not only DSC 80.
- Decide whether target-course host permissions are acceptable or whether to move to optional host permissions.
- Add more known fallback schemes for courses whose policy pages are hard to parse.
- Implement or clearly disable unsupported grading systems such as credit-based grading.
- Verify Chrome Web Store privacy disclosures against the final network behavior.
- Link to `PRIVACY.md` or the GitHub Pages version at `docs/privacy.html`.
- Publish as unlisted first and test with a small group.

## Privacy

See [PRIVACY.md](./PRIVACY.md). A static version for GitHub Pages is available at [docs/privacy.html](./docs/privacy.html).
