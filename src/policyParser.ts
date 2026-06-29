import type { CategoryRule, GradingScheme, WeightedStrategy } from './types';

export type ParsedPolicy = {
  scheme: GradingScheme | null;
  source: 'detected-weight-table' | 'unknown';
  confidence: number;
  warnings: string[];
};

type ParsedWeightedRow = {
  categoryName: string;
  rule: CategoryRule;
  rawName: string;
  notes: string;
};

const MIN_EXPECTED_WEIGHT = 0.95;
const MAX_EXPECTED_WEIGHT = 1.05;

export function parseCoursePolicyText(policyText: string): ParsedPolicy {
  const lines = normalizePolicyLines(policyText);
  const rows = parseWeightedRows(lines);
  const warnings = detectPolicyWarnings(policyText);

  if (rows.length === 0) {
    return {
      scheme: null,
      source: 'unknown',
      confidence: 0,
      warnings: ['No weighted grading table was detected.'],
    };
  }

  const rules = Object.fromEntries(
    rows.map((row) => [row.categoryName, row.rule]),
  ) as WeightedStrategy['rules'];
  const totalWeight = Object.values(rules).reduce((sum, rule) => sum + rule.weight, 0);

  if (totalWeight < MIN_EXPECTED_WEIGHT || totalWeight > MAX_EXPECTED_WEIGHT) {
    warnings.push(`Detected weights add to ${(totalWeight * 100).toFixed(1)}%, not 100%.`);
  }

  const duplicateCategories = findDuplicateCategories(rows.map((row) => row.categoryName));
  if (duplicateCategories.length > 0) {
    warnings.push(`Multiple rows mapped to: ${duplicateCategories.join(', ')}.`);
  }

  return {
    scheme: {
      type: 'WEIGHTED',
      rules,
      redemptions: detectRedemptions(policyText),
    },
    source: 'detected-weight-table',
    confidence: scoreWeightedPolicyConfidence(rows, totalWeight, warnings),
    warnings,
  };
}

function normalizePolicyLines(policyText: string): string[] {
  return policyText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseWeightedRows(lines: string[]): ParsedWeightedRow[] {
  const tableRows = parseKnownComponentRows(lines);

  if (tableRows.length > 0) {
    return tableRows;
  }

  return lines.flatMap((line) => {
    if (!looksLikeWeightedRow(line)) {
      return [];
    }

    const match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)%\s*(.*)$/);
    if (!match) {
      return [];
    }

    const [, rawName, rawWeight, notes] = match;
    const categoryName = normalizeCategoryName(rawName);
    if (!categoryName) {
      return [];
    }

    return [{
      categoryName,
      rawName,
      notes,
      rule: {
        weight: Number(rawWeight) / 100,
        dropLowest: detectDropLowestCount(`${rawName} ${notes}`),
      },
    }];
  });
}

function parseKnownComponentRows(lines: string[]): ParsedWeightedRow[] {
  const componentPattern = /(Project Checkpoints|Midterm Exam|Final Exam|Homework|Projects|Labs|Discussions|Attendance)\s+(\d+(?:\.\d+)?)%/gi;
  const tableLine = lines.find((line) => /component\s+weight/i.test(line));

  if (!tableLine) {
    return [];
  }

  return Array.from(tableLine.matchAll(componentPattern)).flatMap((match) => {
    const rawName = match[1];
    const rawWeight = match[2];
    const categoryName = normalizeCategoryName(rawName);

    if (!categoryName) {
      return [];
    }

    const notes = getComponentNotes(tableLine, match.index ?? 0, componentPattern);

    return [{
      categoryName,
      rawName,
      notes,
      rule: {
        weight: Number(rawWeight) / 100,
        dropLowest: detectDropLowestCount(`${rawName} ${notes}`),
      },
    }];
  });
}

function getComponentNotes(
  tableLine: string,
  currentIndex: number,
  componentPattern: RegExp,
): string {
  const nextMatch = Array.from(tableLine.matchAll(componentPattern))
    .find((match) => (match.index ?? 0) > currentIndex);
  const nextIndex = nextMatch?.index ?? tableLine.length;

  return tableLine.slice(currentIndex, nextIndex);
}

function looksLikeWeightedRow(line: string): boolean {
  const lowerLine = line.toLowerCase();

  return /\d+(?:\.\d+)?%/.test(line)
    && !lowerLine.startsWith('component ')
    && !lowerLine.startsWith('weight ')
    && Boolean(normalizeCategoryName(line));
}

function normalizeCategoryName(rawName: string): string | null {
  const lowerName = rawName.toLowerCase();

  if (lowerName.includes('checkpoint')) return 'Checkpoints';
  if (lowerName.includes('final')) return 'Final';
  if (lowerName.includes('midterm') || lowerName.includes('exam')) return 'Midterms';
  if (lowerName.includes('project')) return 'Projects';
  if (lowerName.includes('lab')) return 'Labs';
  if (lowerName.includes('homework') || lowerName.includes('hw')) return 'Homework';
  if (lowerName.includes('discussion')) return 'Discussions';
  if (lowerName.includes('attendance')) return 'Attendance';

  return null;
}

function detectDropLowestCount(text: string): number | undefined {
  const lowerText = text.toLowerCase();

  if (!lowerText.includes('drop') && !lowerText.includes('dropped')) {
    return undefined;
  }

  const digitMatch = lowerText.match(/(?:drop|dropped)\s+(?:the\s+)?(?:lowest\s+)?(\d+)/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  if (lowerText.includes('lowest')) {
    return 1;
  }

  return undefined;
}

function detectRedemptions(policyText: string): WeightedStrategy['redemptions'] {
  const lowerText = policyText.toLowerCase();

  if (!lowerText.includes('redemption') && !lowerText.includes('replace')) {
    return undefined;
  }

  if (!lowerText.includes('final') || !lowerText.includes('midterm')) {
    return undefined;
  }

  return [{
    id: 'final-replaces-midterm',
    name: 'Final replaces midterm if higher',
    sourceCategory: 'Final',
    targetCategory: 'Midterms',
    conditionType: 'REPLACE_IF_HIGHER',
  }];
}

function detectPolicyWarnings(policyText: string): string[] {
  const lowerText = policyText.toLowerCase();
  const warnings: string[] = [];

  if (lowerText.includes('redemption')) {
    warnings.push('Redemption policy detected. The parser records it, but the calculator does not apply it yet.');
  }

  if (lowerText.includes('slip day') || lowerText.includes('late')) {
    warnings.push('Late or slip-day policy detected. This does not affect current grade calculation yet.');
  }

  if (lowerText.includes('project 4') || lowerText.includes('each for projects')) {
    warnings.push('Uneven project subweights detected. Category-level weighting may be approximate.');
  }

  if (lowerText.includes('extra credit')) {
    warnings.push('Extra credit policy detected. Extra credit is not modeled yet.');
  }

  return warnings;
}

function scoreWeightedPolicyConfidence(
  rows: ParsedWeightedRow[],
  totalWeight: number,
  warnings: string[],
): number {
  let score = 0.5;

  if (rows.length >= 3) score += 0.2;
  if (totalWeight >= MIN_EXPECTED_WEIGHT && totalWeight <= MAX_EXPECTED_WEIGHT) score += 0.2;
  if (warnings.length === 0) score += 0.1;

  return Math.min(score, 1);
}

function findDuplicateCategories(categoryNames: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  categoryNames.forEach((categoryName) => {
    if (seen.has(categoryName)) {
      duplicates.add(categoryName);
    }
    seen.add(categoryName);
  });

  return Array.from(duplicates);
}
