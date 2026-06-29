# Privacy Policy

UCSD Grade Dashboard is designed to run locally in the user's browser.

## Data Collected

The extension reads assignment names, scores, and maximum scores from supported Gradescope pages. It also reads public course repository metadata and public course policy pages when the user asks the dashboard to detect a grading policy.

## How Data Is Used

Grade data is used to calculate estimated course grades and display local what-if simulations. Public course repository metadata is used to find likely course websites. Public course policy text is used to detect grading categories and category weights.

## Data Storage

Scraped grade data is stored locally using Chrome extension storage. The current extension does not send grade data to a developer-owned server.

## Data Sharing

The extension does not sell grade data and does not share grade data with third parties.

## Network Requests

The extension reads Gradescope pages through a content script. When policy detection is used, the extension may fetch public metadata from `api.github.com`, public course files from `raw.githubusercontent.com/dsc-courses`, and public DSC course websites such as `dsc80.com`, `dsc100.org`, or `dsc-courses.github.io`.

## User Control

Users can remove stored extension data by removing the extension or clearing extension storage through Chrome.

## Disclaimer

Grades shown by this extension are estimates. Users should verify grades and grading policies with official course materials.
