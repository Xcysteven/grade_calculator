# Release Checklist

Use this checklist before submitting an unlisted Chrome Web Store build.

## Build Checks

- Run `npm run test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run package`.
- Inspect `dist/manifest.json`.
- Confirm production `web_accessible_resources` only exposes needed extension assets to `https://www.gradescope.com/*`.
- Confirm `host_permissions` only include supported DSC course sites, public Google Docs syllabi, GitHub API, GitHub raw files, and `dsc-courses.github.io`.

## Manual Course Checks

For each course below:

- Open the course on Gradescope.
- Refresh the Gradescope page so the content script re-scrapes rows.
- Open the extension popup and confirm the course appears.
- Open the full category board.
- Confirm current grade is plausible.
- Confirm detected or fallback policy status shows a source URL.
- Open attempted URLs when detection completes.
- Confirm categories match the course syllabus.
- Confirm a sample assignment lands in the expected category.
- Edit one score and confirm the current grade changes.
- Drop one item and confirm the current grade changes.
- Click `Refresh auto policy` and confirm it completes without Chrome extension errors.

| Course | Required status before beta |
| --- | --- |
| DSC 10 | Manual check needed |
| DSC 20 | Manual check needed |
| DSC 30 | Needs reachable syllabus or pasted grading section |
| DSC 40B | Manual check needed |
| DSC 80 | Manual check needed |
| DSC 106 | Manual check needed |
| DSC 140A | Manual check needed, including Google Doc syllabus behavior |
| DSC 140B | Manual check needed, including credit-system display |

## Chrome Error Checks

- Open `chrome://extensions`.
- Clear existing errors for UCSD Grade Dashboard.
- Reproduce one course scrape and one policy detection.
- Return to `chrome://extensions`.
- Confirm no new errors appear.

## Store Listing Checks

- Set the listing to unlisted for first release.
- Use the copy in `STORE_LISTING.md`.
- Enable GitHub Pages for `/docs`, then use `docs/privacy.html` as the privacy policy URL.
- Disclose that grade data is stored locally with Chrome extension storage.
- Disclose that the extension fetches public course policy pages for syllabus parsing.
- State that grades are estimates and should be verified against official course materials.
- Upload at least one 1280x800 screenshot that does not expose private student information.
