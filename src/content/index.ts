import type { Assignment } from '../types';

console.log("🚀 UCSD Grade Dashboard: Content Script Active");

let lastSavedFingerprint = '';
let scrapeTimeout: number | undefined;

function scrapeGradescope() {
  // 1. Get the Course Name
  const titleElement = document.querySelector('.courseHeader--title, h1');
  const baseCourseName = titleElement?.textContent?.trim() || "Unknown Course";
  const termName = detectCourseTerm(titleElement);
  const courseName = termName ? `${baseCourseName} ${termName}` : baseCourseName;

  // 2. Find the rows
  const rows = document.querySelectorAll('tbody tr');
  if (rows.length === 0) return;

  const assignments: Assignment[] = [];

  rows.forEach((row, index) => {
    const nameCell = row.querySelector('.table--primaryLink') as HTMLElement;
    const scoreCell = row.querySelector('.submissionStatus') as HTMLElement;

    if (nameCell && scoreCell) {
      const name = nameCell.innerText.trim();
      const scoreText = scoreCell.innerText.trim();
      
      const parts = scoreText.split('/');
      if (parts.length === 2) {
        const score = parseFloat(parts[0]);
        const maxScore = parseFloat(parts[1]);

        if (!isNaN(score) && !isNaN(maxScore)) {
          assignments.push({
            id: `assign-${index}`,
            name: name,
            score: score,
            maxScore: maxScore
          });
        }
      }
    }
  });

  // 3. CRITICAL STEP: Save to Chrome Storage
  if (assignments.length > 0) {
    const fingerprint = JSON.stringify({ courseName, assignments });
    if (fingerprint === lastSavedFingerprint) {
      return;
    }

    lastSavedFingerprint = fingerprint;
    console.log(`✅ Scraped ${assignments.length} grades for ${courseName}`);

    chrome.storage.local.set({
      [courseName]: assignments
    }, () => {
      console.log("💾 Data saved to Chrome Storage!");
    });
  }
}

function detectCourseTerm(titleElement: Element | null): string | null {
  const termPattern = /\b(Fall|Winter|Spring|Summer)\s+20\d{2}\b/i;
  const titleText = titleElement?.textContent ?? '';

  if (termPattern.test(titleText)) {
    return titleText.match(termPattern)?.[0] ?? null;
  }

  const headerText = titleElement
    ?.closest('.courseHeader, header, main')
    ?.textContent
    ?.replace(/\s+/g, ' ');
  const headerMatch = headerText?.match(termPattern)?.[0];

  if (headerMatch) {
    return headerMatch;
  }

  const nearbyText = [
    titleElement?.nextElementSibling?.textContent,
    titleElement?.parentElement?.textContent,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');

  return nearbyText.match(termPattern)?.[0] ?? null;
}

function scheduleScrape(delayMs = 250): void {
  window.clearTimeout(scrapeTimeout);
  scrapeTimeout = window.setTimeout(scrapeGradescope, delayMs);
}

scrapeGradescope();
[500, 1500, 3000].forEach((delayMs) => {
  window.setTimeout(scrapeGradescope, delayMs);
});

const observer = new MutationObserver(() => scheduleScrape());
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});
