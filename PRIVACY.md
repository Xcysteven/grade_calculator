# Privacy Policy

UCSD Grade Dashboard is designed to run locally in the user's browser. It does not require a developer-owned backend.

## Data Collected

The extension reads assignment names, scores, and maximum scores from supported Gradescope pages. It also reads public course repository metadata and public course policy pages when policy detection runs. If a user pastes syllabus grading text into the dashboard, that pasted text is parsed locally in the browser.

## How Data Is Used

Grade data is used to calculate estimated course grades and display local what-if simulations. Public course repository metadata is used to find likely course websites. Public course policy text is used to detect grading categories and category weights.

## Data Storage

Scraped grade data is stored locally using Chrome extension storage. What-if edits are kept in the dashboard session and reset when the dashboard is reloaded. The extension does not send grade data to a developer-owned server.

## Data Sharing

The extension does not sell grade data and does not share grade data with third parties.

## Network Requests

The extension reads Gradescope pages through a content script. When policy detection is used, the extension may fetch public metadata from `api.github.com`, public course files from `raw.githubusercontent.com/dsc-courses`, public DSC course websites such as `dsc80.com` or `dsc20.org`, GitHub Pages course sites under `dsc-courses.github.io`, and public Google Docs syllabi.

## User Control

Users can remove stored course data from the full dashboard with `Clear course data`. Users can also remove all stored extension data by removing the extension or clearing extension storage through Chrome.

## Disclaimer

Grades shown by this extension are estimates. Users should verify grades and grading policies with official course materials.
