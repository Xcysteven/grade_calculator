// src/content/index.ts
import type { Assignment } from '../types';

console.log("UCSD Grade Dashboard: Content Script Active");

function scrapeGradescope() {
  const rows = document.querySelectorAll('tbody tr');

  if (rows.length === 0) {
    console.log("No assignment rows found.");
    return;
  }

  const assignments: Assignment[] = [];

  rows.forEach((row, index) => {
    const nameCell = row.querySelector('.table--primaryLink') as HTMLElement;
    const scoreCell = row.querySelector('.submissionStatus') as HTMLElement;

    if (nameCell && scoreCell) {
      const name = nameCell.innerText.trim() || "Unknown Assignment";
      const scoreText = scoreCell.innerText.trim(); 
      
      console.log(`Row ${index}: Found "${name}" with score text "${scoreText}"`);

      // 3. Parse the score
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

  // 4. Final Report
  if (assignments.length > 0) {
    console.log("✅ SUCCESS! Scraped Assignments:", assignments);
    // Next step: We will save 'assignments' to Chrome Storage here.
  } else {
    console.log("⚠️ Found rows, but couldn't extract numbers. Check the logs above!");
  }
}

// Run the scraper
scrapeGradescope();