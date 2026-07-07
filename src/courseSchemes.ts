import type { GradingScheme } from './types';

const DSC80_SCHEME: GradingScheme = {
  type: 'WEIGHTED',
  rules: {
    Labs: { weight: 0.2, dropLowest: 1, assignmentMatchers: ['lab'] },
    Projects: { weight: 0.25, assignmentMatchers: ['project'] },
    Checkpoints: { weight: 0.05, assignmentMatchers: ['checkpoint'] },
    Midterms: { weight: 0.2, assignmentMatchers: ['exam 01', 'exam 1', 'midterm'] },
    Final: { weight: 0.3, assignmentMatchers: ['exam 02', 'exam 2', 'final exam'] },
  },
  redemptions: [
    {
      id: 'final-replaces-midterm',
      name: 'Final replaces midterm if higher',
      sourceCategory: 'Final',
      targetCategory: 'Midterms',
      conditionType: 'REPLACE_IF_HIGHER',
    },
  ],
};

const DSC20_SCHEME: GradingScheme = {
  type: 'WEIGHTED',
  rules: {
    'Skill Tests': {
      weight: 0.55,
      assignmentMatchers: ['skill test', 'exam', 'midterm', 'final'],
    },
    Participation: {
      weight: 0.15,
      assignmentMatchers: ['participation', 'campuswire', 'office hours'],
    },
    'Weekly Learning/Practice': {
      weight: 0.3,
      assignmentMatchers: [
        'checkpoint',
        'homework',
        'hw',
        'lab',
        'lecture quiz',
        'practice',
        'project',
        'quiz',
        'reading',
      ],
    },
  },
  redemptions: [
    {
      id: 'skill-test-redemption',
      name: 'Final skill test can redeem earlier skill tests',
      sourceCategory: 'Skill Tests',
      targetCategory: 'Skill Tests',
      conditionType: 'REPLACE_IF_HIGHER',
    },
  ],
};

export function getKnownCourseScheme(courseName: string): GradingScheme | undefined {
  const courseCode = extractDscCourseCode(courseName);

  if (courseCode === 'dsc20') {
    return DSC20_SCHEME;
  }

  if (courseCode === 'dsc80') {
    return DSC80_SCHEME;
  }

  return undefined;
}

export function getKnownCoursePolicyUrl(courseName: string): string | undefined {
  const courseCode = extractDscCourseCode(courseName);

  if (courseCode === 'dsc20') {
    return 'https://dsc20.org/syllabus/';
  }

  if (courseCode === 'dsc80') {
    return 'https://dsc80.com/syllabus/';
  }

  return undefined;
}

function extractDscCourseCode(courseName: string): string | null {
  const match = courseName
    .toLowerCase()
    .match(/(?:^|[^a-z0-9])dsc[_\s-]*(\d{1,3}[a-z]?)(?=$|[^a-z0-9])/);

  return match ? `dsc${match[1]}` : null;
}
