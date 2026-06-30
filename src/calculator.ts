import type {
  Assignment,
  CategoryRule,
  CreditSource,
  CreditStrategy,
  GradingScheme,
  WeightedStrategy,
} from './types';

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
  if (lowerName.includes('skill test')) return 'Skill Tests';
  if (lowerName.includes('midterm')) return 'Midterms';
  if (lowerName.includes('final exam')) return 'Final';
  if (lowerName.includes('project')) return 'Projects';
  if (lowerName.includes('lab')) return 'Labs';
  if (lowerName.includes('exam')) return 'Midterms';
  if (lowerName.includes('homework') || lowerName.includes('hw')) return 'Homework';
  if (lowerName.includes('quiz')) return 'Quizzes';
  if (lowerName.includes('test')) return 'Exams';
  if (lowerName.includes('assignment')) return 'Assignments';
  if (lowerName.includes('discussion')) return 'Discussions';
  if (lowerName.includes('attendance') || lowerName.includes('participation')) return 'Attendance';
  if (lowerName.includes('reading')) return 'Reading';

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
  if (!scheme || scheme.type === 'TOTAL_POINTS') {
    return null;
  }

  const normalizedAssignmentName = normalizeMatcherText(assignmentName);

  if (scheme.type === 'CREDIT_SYSTEM') {
    if (matchesAny(normalizedAssignmentName, scheme.projectMatchers ?? ['final project'])) {
      return 'Final Project';
    }

    if (matchesAny(normalizedAssignmentName, scheme.examMatchers ?? ['midterm', 'exam'])) {
      return 'Exams';
    }

    const creditSourceMatch = scheme.creditSources
      .flatMap((source) => (source.assignmentMatchers ?? [source.name]).map((matcher) => ({
        categoryName: source.name,
        matcherLength: normalizeMatcherText(matcher).length,
        normalizedMatcher: normalizeMatcherText(matcher),
      })))
      .filter((match) => normalizedAssignmentName.includes(match.normalizedMatcher))
      .sort((a, b) => b.matcherLength - a.matcherLength)[0];

    return creditSourceMatch?.categoryName ?? null;
  }

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

function matchesAny(normalizedAssignmentName: string, matchers: string[]): boolean {
  return matchers.some((matcher) => normalizedAssignmentName.includes(normalizeMatcherText(matcher)));
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
      return calculateCreditSystemGrade(categories, scheme);
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

function calculateCreditSystemGrade(
  categories: Record<string, Assignment[]>,
  scheme: CreditStrategy,
): GradeResult {
  const warnings = [
    'Credit-system policy detected. Homework, quiz, and attendance credits reduce exam weight.',
  ];
  const examAssignments = categories.Exams ?? [];
  const projectAssignments = categories['Final Project'] ?? [];
  const examPercent = averageAssignmentPercent(examAssignments);
  const projectTotals = calculateTotals(projectAssignments);
  const projectPercent = projectTotals.totalMax > 0
    ? (projectTotals.totalScore / projectTotals.totalMax) * 100
    : 0;
  const creditGrades = scheme.creditSources.map((source) => {
    const assignments = categories[source.name] ?? [];
    const maxCredits = getSourceMaxCredits(source);
    const earnedCredits = Math.min(calculateEarnedCredits(assignments, source), maxCredits);

    return {
      name: source.name,
      count: assignments.filter((assignment) => !assignment.dropped).length,
      droppedCount: assignments.filter((assignment) => assignment.dropped).length,
      totalScore: earnedCredits,
      totalMax: maxCredits,
      percent: maxCredits > 0 ? (earnedCredits / maxCredits) * 100 : 0,
      weight: maxCredits / 100,
      weightedPercent: earnedCredits,
    };
  });
  const earnedCredits = Math.min(
    creditGrades.reduce((sum, category) => sum + category.totalScore, 0),
    scheme.maxCredits,
  );
  const earnedCreditWeight = earnedCredits / 100;
  const examWeight = Math.max(scheme.baseExamWeight - earnedCreditWeight, 0);
  const examTotals = calculateTotals(examAssignments);
  const examGrade: CategoryGrade = {
    name: 'Exams',
    count: examAssignments.filter((assignment) => !assignment.dropped).length,
    droppedCount: examAssignments.filter((assignment) => assignment.dropped).length,
    totalScore: examTotals.totalScore,
    totalMax: examTotals.totalMax,
    percent: examPercent,
    weight: examWeight,
    weightedPercent: examPercent * examWeight,
  };
  const projectGrade: CategoryGrade = {
    name: 'Final Project',
    count: projectAssignments.filter((assignment) => !assignment.dropped).length,
    droppedCount: projectAssignments.filter((assignment) => assignment.dropped).length,
    totalScore: projectTotals.totalScore,
    totalMax: projectTotals.totalMax,
    percent: projectPercent,
    weight: scheme.projectWeight,
    weightedPercent: projectPercent * scheme.projectWeight,
  };
  const requiredGrades = [examGrade, projectGrade];
  const countedRequiredGrades = requiredGrades.filter((category) => category.totalMax > 0);
  const countedRequiredWeight = countedRequiredGrades.reduce((sum, category) => sum + category.weight, 0);
  const requiredWeightedPercent = countedRequiredGrades.reduce(
    (sum, category) => sum + category.weightedPercent,
    0,
  );
  const countedWeight = countedRequiredWeight + earnedCreditWeight;
  const categoriesWithoutRules = Object.keys(categories).filter((categoryName) => (
    categoryName !== 'Exams'
    && categoryName !== 'Final Project'
    && !scheme.creditSources.some((source) => source.name === categoryName)
  ));

  if (categoriesWithoutRules.length > 0) {
    warnings.push(`No grading rule for: ${categoriesWithoutRules.join(', ')}.`);
  }

  const extraCategoryGrades = categoriesWithoutRules.map((categoryName) => {
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
  const allAssignments = Object.values(categories).flat();
  const allTotals = calculateTotals(allAssignments);

  return {
    percent: countedWeight > 0
      ? (requiredWeightedPercent + earnedCredits) / countedWeight
      : 0,
    totalScore: allTotals.totalScore,
    totalMax: allTotals.totalMax,
    countedWeight,
    strategyType: 'CREDIT_SYSTEM',
    categories: [
      examGrade,
      projectGrade,
      ...creditGrades,
      ...extraCategoryGrades,
    ].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name)),
    warnings,
  };
}

function calculateEarnedCredits(assignments: Assignment[], source: CreditSource): number {
  const eligibleAssignments = assignments.filter((assignment) => !assignment.dropped);
  const mode = source.creditMode ?? (source.isPassFail ? 'pass-fail' : 'score');
  const passThreshold = source.passThreshold ?? 0.7;

  if (mode === 'pass-fail') {
    return eligibleAssignments.reduce((sum, assignment) => (
      assignmentPercent(assignment) >= passThreshold ? sum + source.valuePerItem : sum
    ), 0);
  }

  if (mode === 'completion') {
    return eligibleAssignments.reduce((sum, assignment) => (
      assignment.score > 0 ? sum + source.valuePerItem : sum
    ), 0);
  }

  return eligibleAssignments.reduce((sum, assignment) => sum + assignment.score, 0);
}

function getSourceMaxCredits(source: CreditSource): number {
  return source.maxCredits ?? source.maxItems * source.valuePerItem;
}

function averageAssignmentPercent(assignments: Assignment[]): number {
  const eligibleAssignments = assignments.filter((assignment) => !assignment.dropped && assignment.maxScore > 0);

  if (eligibleAssignments.length === 0) {
    return 0;
  }

  return eligibleAssignments.reduce(
    (sum, assignment) => sum + assignmentPercent(assignment) * 100,
    0,
  ) / eligibleAssignments.length;
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
