import type { Assignment, CategoryRule, GradingScheme, WeightedStrategy } from './types';

export type CategoryGrade = {
  name: string;
  count: number;
  droppedCount: number;
  totalScore: number;
  totalMax: number;
  percent: number;
  weight: number;
  weightedPercent: number;
};

export type GradeResult = {
  percent: number;
  totalScore: number;
  totalMax: number;
  countedWeight: number;
  strategyType: GradingScheme['type'];
  categories: CategoryGrade[];
  warnings: string[];
};

export function categorizeAssignmentName(name: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('checkpoint')) return 'Checkpoints';
  if (lowerName.includes('midterm')) return 'Midterms';
  if (lowerName.includes('final exam')) return 'Final';
  if (lowerName.includes('project')) return 'Projects';
  if (lowerName.includes('lab')) return 'Labs';
  if (lowerName.includes('exam')) return 'Midterms';
  if (lowerName.includes('homework') || lowerName.includes('hw')) return 'Homework';
  if (lowerName.includes('quiz') || lowerName.includes('test')) return 'Homework';
  if (lowerName.includes('discussion')) return 'Discussions';
  if (lowerName.includes('attendance')) return 'Attendance';

  return 'Other';
}

export function groupAssignmentsByCategory(
  assignments: Assignment[],
  scheme?: GradingScheme,
): Record<string, Assignment[]> {
  return assignments.reduce<Record<string, Assignment[]>>((groups, assignment) => {
    const categoryName = getSchemeCategoryName(assignment.name, scheme)
      ?? categorizeAssignmentName(assignment.name);
    groups[categoryName] ??= [];
    groups[categoryName].push(assignment);
    return groups;
  }, {});
}

export function buildEqualWeightScheme(categoryNames: string[]): WeightedStrategy {
  const uniqueCategoryNames = Array.from(new Set(categoryNames)).sort();
  const weight = uniqueCategoryNames.length > 0 ? 1 / uniqueCategoryNames.length : 0;

  return {
    type: 'WEIGHTED',
    rules: Object.fromEntries(
      uniqueCategoryNames.map((categoryName) => [categoryName, { weight } satisfies CategoryRule]),
    ),
  };
}

export function calculateGradeFromAssignments(
  assignments: Assignment[],
  scheme?: GradingScheme,
): GradeResult {
  const categories = groupAssignmentsByCategory(assignments, scheme);
  const gradingScheme = scheme ?? buildEqualWeightScheme(Object.keys(categories));

  return calculateGrade(categories, gradingScheme);
}

function getSchemeCategoryName(assignmentName: string, scheme?: GradingScheme): string | null {
  if (scheme?.type !== 'WEIGHTED') {
    return null;
  }

  const normalizedAssignmentName = normalizeMatcherText(assignmentName);
  const matches = Object.entries(scheme.rules).flatMap(([categoryName, rule]) =>
    (rule.assignmentMatchers ?? []).flatMap((matcher) => {
      const normalizedMatcher = normalizeMatcherText(matcher);

      return normalizedAssignmentName.includes(normalizedMatcher)
        ? [{ categoryName, matcherLength: normalizedMatcher.length }]
        : [];
    }),
  );

  return matches.sort((a, b) => b.matcherLength - a.matcherLength)[0]?.categoryName ?? null;
}

function normalizeMatcherText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function calculateGrade(
  categories: Record<string, Assignment[]>,
  scheme: GradingScheme,
): GradeResult {
  switch (scheme.type) {
    case 'WEIGHTED':
      return calculateWeightedGrade(categories, scheme);
    case 'TOTAL_POINTS':
      return calculateTotalPointsGrade(categories);
    case 'CREDIT_SYSTEM':
      return unsupportedStrategyResult(categories, scheme.type);
  }
}

function calculateWeightedGrade(
  categories: Record<string, Assignment[]>,
  scheme: WeightedStrategy,
): GradeResult {
  const warnings: string[] = [];

  if (scheme.redemptions && scheme.redemptions.length > 0) {
    warnings.push('Redemption policy detected, but redemption is not applied yet.');
  }

  const categoryGrades = Object.entries(scheme.rules).map(([categoryName, rule]) => {
    const assignments = categories[categoryName] ?? [];
    const { countedAssignments, droppedCount } = applyDropLowest(assignments, rule.dropLowest ?? 0);
    const totals = calculateTotals(countedAssignments);
    const percent = totals.totalMax > 0 ? (totals.totalScore / totals.totalMax) * 100 : 0;

    return {
      name: categoryName,
      count: countedAssignments.length,
      droppedCount,
      totalScore: totals.totalScore,
      totalMax: totals.totalMax,
      percent,
      weight: rule.weight,
      weightedPercent: percent * rule.weight,
    };
  });

  const categoriesWithoutRules = Object.keys(categories).filter(
    (categoryName) => !scheme.rules[categoryName],
  );

  if (categoriesWithoutRules.length > 0) {
    warnings.push(`No grading rule for: ${categoriesWithoutRules.join(', ')}`);
  }

  const unweightedCategoryGrades = categoriesWithoutRules.map((categoryName) => {
    const assignments = categories[categoryName];
    const totals = calculateTotals(assignments);
    const percent = totals.totalMax > 0 ? (totals.totalScore / totals.totalMax) * 100 : 0;

    return {
      name: categoryName,
      count: assignments.length,
      droppedCount: assignments.filter((assignment) => assignment.dropped).length,
      totalScore: totals.totalScore,
      totalMax: totals.totalMax,
      percent,
      weight: 0,
      weightedPercent: 0,
    };
  });

  const countedCategories = categoryGrades.filter((category) => category.totalMax > 0);
  const countedWeight = countedCategories.reduce((sum, category) => sum + category.weight, 0);
  const weightedPercent = countedCategories.reduce(
    (sum, category) => sum + category.weightedPercent,
    0,
  );
  const totals = calculateTotals(Object.values(categories).flat());

  return {
    percent: countedWeight > 0 ? weightedPercent / countedWeight : 0,
    totalScore: totals.totalScore,
    totalMax: totals.totalMax,
    countedWeight,
    strategyType: scheme.type,
    categories: [...categoryGrades, ...unweightedCategoryGrades].sort(
      (a, b) => b.weight - a.weight || a.name.localeCompare(b.name),
    ),
    warnings,
  };
}

function calculateTotalPointsGrade(categories: Record<string, Assignment[]>): GradeResult {
  const assignments = Object.values(categories).flat().filter((assignment) => !assignment.dropped);
  const totals = calculateTotals(assignments);
  const categoryGrades = Object.entries(categories).map(([categoryName, categoryAssignments]) => {
    const countedAssignments = categoryAssignments.filter((assignment) => !assignment.dropped);
    const categoryTotals = calculateTotals(countedAssignments);
    const percent = categoryTotals.totalMax > 0
      ? (categoryTotals.totalScore / categoryTotals.totalMax) * 100
      : 0;

    return {
      name: categoryName,
      count: countedAssignments.length,
      droppedCount: categoryAssignments.length - countedAssignments.length,
      totalScore: categoryTotals.totalScore,
      totalMax: categoryTotals.totalMax,
      percent,
      weight: categoryTotals.totalMax,
      weightedPercent: categoryTotals.totalScore,
    };
  });

  return {
    percent: totals.totalMax > 0 ? (totals.totalScore / totals.totalMax) * 100 : 0,
    totalScore: totals.totalScore,
    totalMax: totals.totalMax,
    countedWeight: totals.totalMax,
    strategyType: 'TOTAL_POINTS',
    categories: categoryGrades.sort((a, b) => b.totalMax - a.totalMax),
    warnings: [],
  };
}

function unsupportedStrategyResult(
  categories: Record<string, Assignment[]>,
  strategyType: GradingScheme['type'],
): GradeResult {
  const totals = calculateTotals(Object.values(categories).flat());

  return {
    percent: 0,
    totalScore: totals.totalScore,
    totalMax: totals.totalMax,
    countedWeight: 0,
    strategyType,
    categories: [],
    warnings: [`${strategyType} calculation is not implemented yet.`],
  };
}

function applyDropLowest(
  assignments: Assignment[],
  dropLowest: number,
): { countedAssignments: Assignment[]; droppedCount: number } {
  const eligibleAssignments = assignments.filter((assignment) => !assignment.dropped);

  if (dropLowest <= 0) {
    return {
      countedAssignments: eligibleAssignments,
      droppedCount: assignments.length - eligibleAssignments.length,
    };
  }

  const lowestFirst = [...eligibleAssignments].sort(
    (a, b) => assignmentPercent(a) - assignmentPercent(b),
  );
  const droppedIds = new Set(lowestFirst.slice(0, dropLowest).map((assignment) => assignment.id));
  const countedAssignments = eligibleAssignments.filter((assignment) => !droppedIds.has(assignment.id));

  return {
    countedAssignments,
    droppedCount: assignments.length - countedAssignments.length,
  };
}

function assignmentPercent(assignment: Assignment): number {
  return assignment.maxScore > 0 ? assignment.score / assignment.maxScore : 0;
}

function calculateTotals(assignments: Assignment[]) {
  return assignments.reduce(
    (totals, assignment) => ({
      totalScore: totals.totalScore + assignment.score,
      totalMax: totals.totalMax + assignment.maxScore,
    }),
    { totalScore: 0, totalMax: 0 },
  );
}
