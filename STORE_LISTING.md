# Chrome Web Store Listing Draft

Use this for the first unlisted beta submission.

Official Chrome docs checked:

- Store listing fields: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Program policies: https://developer.chrome.com/docs/webstore/program-policies

## Product Details

### Name

UCSD Grade Dashboard

### Category

Productivity

Alternative if Chrome offers an education category in your dashboard: Education.

### Language

English

### Short Description

Estimate UCSD DSC course grades from Gradescope and run local what-if grade simulations.

### Detailed Description

UCSD Grade Dashboard helps UCSD Data Science students estimate course grades from Gradescope data.

The extension reads visible Gradescope assignment rows, groups them into course grading categories, and shows a local dashboard with current category averages and an estimated overall grade. For supported DSC courses, it can detect grading weights from public course websites and syllabi. It also supports manual syllabus text paste when a grading policy is published somewhere the extension cannot fetch automatically.

Main features:

- Scrape visible assignment names, scores, and maximum scores from Gradescope.
- Detect grading categories and weights from supported public DSC course sites.
- Show category weights, assignment counts, score totals, and category averages.
- Run local what-if simulations by editing scores, max scores, category weights, and dropped items.
- Add hypothetical future assignments to estimate target scores.
- Move assignments between categories when the automatic matcher is wrong.
- Refresh policy detection from the dashboard.
- Clear stored course data for a selected course.
- Support light, dark, and automatic theme modes.

Supported policy formats currently include common weighted DSC grading tables, Google Docs syllabi when public, pasted grading sections, and DSC140B-style credit policies.

Important limitations:

- Grades shown by this extension are estimates, not official course grades.
- Users should verify results against official course syllabi and instructor announcements.
- Redemption, late, slip-day, extra credit, and some uneven subweight policies may be detected as warnings but are not always fully modeled.
- The extension currently targets UCSD DSC courses and Gradescope pages.

Privacy summary:

Scraped grade data is stored locally with Chrome extension storage. The extension does not send grade data to a developer-owned server. Policy detection fetches public course pages, public Google Docs syllabi, and public dsc-courses GitHub resources.

## Graphic Assets

### Store Icon

Use:

`public/icons/icon-128.png`

Chrome listing requirement from official docs: 128x128 px icon.

### Screenshots

Chrome listing requirement from official docs: at least one 1280x800 px screenshot, up to five total.

Recommended screenshots:

1. Full dashboard with DSC80 categories, weights, and policy status visible.
2. Category board showing editable scores and add-item controls.
3. Policy detection area showing source URL, attempted URLs, and refresh control.
4. Popup view on Gradescope, if it fits cleanly.
5. Dark mode full dashboard.

Avoid screenshots that show a real student name, email, course roster, or any private Gradescope identifiers. If your real scores are sensitive, use a test course or crop/redact before upload.

### Small Promo Tile

Required size: 440x280 PNG or JPEG.

Suggested text:

UCSD Grade Dashboard
Gradescope estimates and what-if planning for DSC courses

### Marquee Promo Tile

Optional size: 1400x560 PNG or JPEG.

Suggested text:

UCSD Grade Dashboard
Turn Gradescope scores into a local DSC grade dashboard

## Privacy Practices Tab

### Single Purpose

UCSD Grade Dashboard estimates UCSD DSC course grades from Gradescope assignment rows and public course grading policies, then provides a local what-if dashboard for score simulations.

### Permission Justification: `storage`

The extension uses Chrome storage to save scraped Gradescope assignment names, scores, and maximum scores locally in the user's browser so the popup and full dashboard can display the selected course after the Gradescope page is refreshed.

### Host Permission Justification: `https://www.gradescope.com/*`

The extension runs a content script on Gradescope to read visible assignment names, scores, and maximum scores from the user's course dashboard.

### Host Permission Justification: DSC course websites

The extension fetches public DSC course pages and syllabi to detect grading category names and category weights. These requests are used only for policy parsing.

### Host Permission Justification: `https://docs.google.com/document/*`

Some course syllabi are published as public Google Docs. The extension fetches public document text when a course page links to a Google Docs syllabus or when the user provides a Google Docs syllabus URL.

### Host Permission Justification: GitHub and GitHub Pages

The extension uses `api.github.com`, `raw.githubusercontent.com/dsc-courses/*`, and `dsc-courses.github.io` to discover public course repositories and read public syllabus or policy files maintained under the dsc-courses organization.

### Remote Code

No. The extension does not execute remotely hosted code. It fetches public syllabus and policy text for parsing only.

### Data Usage Disclosure

Data collected:

- Gradescope assignment names.
- Gradescope scores and maximum scores.
- Selected course names as shown on Gradescope.
- User-provided syllabus URL or pasted syllabus grading text, if entered.

How data is used:

- To calculate estimated grades.
- To group assignments into grading categories.
- To run local what-if simulations.
- To detect grading policy categories and weights.

Data sharing:

- Grade data is not sold.
- Grade data is not sent to a developer-owned server.
- Public course policy pages may be fetched from their original public hosts.

### Privacy Policy URL

Use the hosted copy of `docs/privacy.html`.

Recommended GitHub Pages path after enabling Pages for `/docs`:

`https://<your-github-username>.github.io/grade_calculator/privacy.html`

Replace `<your-github-username>` with the account that owns the repository.

## Distribution

Recommended first release:

- Visibility: Unlisted
- Regions: All regions, unless you intentionally want United States only
- Mature content: No
- Paid extension: No

## Reviewer Notes

Suggested text:

This extension is intended for UCSD Data Science students using Gradescope. To test it, load the extension, open a supported Gradescope course page, refresh the page, then open the extension popup. The full dashboard can be opened from the popup. Course policy detection can be tested from the full dashboard with public DSC course sites such as https://dsc80.com/syllabus/ or https://dsc20.org/syllabus/.

The extension does not execute remote code. It fetches public syllabus or policy text for parsing and stores scraped Gradescope rows locally with Chrome extension storage.
