import type { Assignment } from '../types';

console.log("🚀 UCSD Grade Dashboard: Content Script Active");

function scrapeGradescope() {
  // 1. Get the Course Name
  const titleElement = document.querySelector('.courseHeader--title, h1');
  const courseName = titleElement?.textContent?.trim() || "Unknown Course";

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
    console.log(`✅ Scraped ${assignments.length} grades for ${courseName}`);

    chrome.storage.local.set({
      [courseName]: assignments
    }, () => {
      console.log("💾 Data saved to Chrome Storage!");
    });
  }
}

// Run the scraper
scrapeGradescope();