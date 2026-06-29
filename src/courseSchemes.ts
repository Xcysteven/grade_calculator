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

export function getKnownCourseScheme(courseName: string): GradingScheme | undefined {
  if (/\bdsc\s*80\b/i.test(courseName)) {
    return DSC80_SCHEME;
  }

  return undefined;
}
