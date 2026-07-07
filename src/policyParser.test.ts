import { describe, expect, it } from 'vitest';
import { parseManualCoursePolicyText } from './coursePolicy';
import { parseCoursePolicyText } from './policyParser';

describe('parseCoursePolicyText', () => {
  it('parses DSC10 component tables', () => {
    const parsed = parseCoursePolicyText(`
      Component Weight Notes
      Lab Assignments 22% drop lowest score
      Homework Assignments 35% drop lowest score
      Quiz 3%
      Midterm Project 10%
      Midterm Exam 10%
      Final Exam 20%
    `);

    expectWeightedRules(parsed, {
      Labs: 0.22,
      Homework: 0.35,
      Quizzes: 0.03,
      'Midterm Project': 0.1,
      Midterms: 0.1,
      Final: 0.2,
    });
    expect(parsed.scheme?.type === 'WEIGHTED' && parsed.scheme.rules.Labs.dropLowest).toBe(1);
    expect(parsed.scheme?.type === 'WEIGHTED' && parsed.scheme.rules.Homework.dropLowest).toBe(1);
  });

  it('parses DSC20 component tables', () => {
    const parsed = parseCoursePolicyText(`
      Component Weight Notes
      Skill Tests 55% see schedule and redemption policy above
      Participation 15% 5 weeks x 3% each
      Weekly Learning/Practice 30% labs, homework, readings, lecture quizzes
    `);

    expectWeightedRules(parsed, {
      'Skill Tests': 0.55,
      Participation: 0.15,
      'Weekly Learning/Practice': 0.3,
    });
  });

  it('parses DSC40B leading-percent grading lists', () => {
    const parsed = parseCoursePolicyText(`
      We'll be using the following grading scheme:
      * 8%: Labs
      * 14%: Homeworks
      * 5%: "Super Homework"
      * 23%: Midterm 01 (or Redemption Midterm 01, whichever is larger)
      * 23%: Midterm 02 (or Redemption Midterm 02, whichever is larger)
      * 23%: Midterm 03 (or Redemption Midterm 03, whichever is larger)
      * 4%: Discussions
      * 1% (Extra Credit): Lecture Participation
    `);

    expectWeightedRules(parsed, {
      Labs: 0.08,
      Homework: 0.14,
      'Super Homework': 0.05,
      Midterms: 0.69,
      Discussions: 0.04,
    });
  });

  it('parses DSC80 component tables', () => {
    const parsed = parseCoursePolicyText(`
      Component Weight Notes
      Labs 20% 2.5% per lab, lowest dropped
      Projects 25% 5% each for Projects 1-3, 10% for Project 4
      Project Checkpoints 5% 1% each
      Midterm Exam 20% see the Redemption Policy above
      Final Exam 30%
    `);

    expectWeightedRules(parsed, {
      Labs: 0.2,
      Projects: 0.25,
      Checkpoints: 0.05,
      Midterms: 0.2,
      Final: 0.3,
    });
  });

  it('parses DSC106 component tables', () => {
    const parsed = parseCoursePolicyText(`
      Component Weight Notes
      Participation 8% 1% per week, 2 lowest weeks dropped
      Labs 8% 1% per lab
      Project 1 10%
      Project 2 15% 14% for submission, 1% for peer review
      Project 3 15% 14% for submission, 1% for peer review
      Project Checkpoints 4% 1% for Project 1 and 2 checkpoints, 2% for Project 3 checkpoint
      Final Project 40% 1% proposal, 2% prototype, 10% video, 20% final submission
    `);

    expectWeightedRules(parsed, {
      Participation: 0.08,
      Labs: 0.08,
      'Project 1': 0.1,
      'Project 2': 0.15,
      'Project 3': 0.15,
      Checkpoints: 0.04,
      'Final Project': 0.4,
    });
  });

  it('parses DSC140A pasted Google Doc text', () => {
    const parsed = parseManualCoursePolicyText(`
      Grading
      * Homework (10%): Credit/No Credit. Assigned weekly.
      * Quizzes (30%): Best 3 out of 4.
      * Midterm (25%): To be taken in-person on week 6.
      * Final (35%): Will include midterm redo + material from weeks 6-10.
    `);

    expectWeightedRules(parsed, {
      Homework: 0.1,
      Quizzes: 0.3,
      Midterms: 0.25,
      Final: 0.35,
    });
    expect(parsed.scheme?.type === 'WEIGHTED' && parsed.scheme.rules.Quizzes.dropLowest).toBe(1);
    expect(parsed.attemptedUrls).toEqual(['manual syllabus text']);
  });

  it('parses DSC140B credit-system policy', () => {
    const parsed = parseCoursePolicyText(`
      By default, your course grade is based entirely on exams (90% of your grade) and the final project (10% of your grade).
      By completing optional assignments, however, you can earn credits that reduce the weight of the exams.
      There will be a total of 40 credits available throughout the quarter.
      Homeworks: the total value of all homework problems will add up to 24 credits, distributed across 8 homeworks.
      Quizzes: each quiz you pass earns you 1.5 credits. There will be 8 quizzes throughout the quarter, for a total of 12 possible credits.
      Attendance: each lecture you attend earns you 0.25 credits, to a maximum of 4 credits total.
    `);

    expect(parsed.source).toBe('detected-credit-system');
    expect(parsed.scheme?.type).toBe('CREDIT_SYSTEM');
    if (parsed.scheme?.type !== 'CREDIT_SYSTEM') {
      throw new Error('Expected credit-system scheme');
    }
    expect(parsed.scheme.baseExamWeight).toBe(0.9);
    expect(parsed.scheme.projectWeight).toBe(0.1);
    expect(parsed.scheme.maxCredits).toBe(40);
    expect(parsed.scheme.creditSources.map((source) => source.name)).toEqual([
      'Homework',
      'Quizzes',
      'Attendance',
    ]);
  });
});

function expectWeightedRules(
  parsed: ReturnType<typeof parseCoursePolicyText>,
  expectedRules: Record<string, number>,
): void {
  expect(parsed.source).toBe('detected-weight-table');
  expect(parsed.scheme?.type).toBe('WEIGHTED');
  if (parsed.scheme?.type !== 'WEIGHTED') {
    throw new Error('Expected weighted scheme');
  }

  expect(Object.keys(parsed.scheme.rules).sort()).toEqual(Object.keys(expectedRules).sort());
  Object.entries(expectedRules).forEach(([name, expectedWeight]) => {
    expect(parsed.scheme?.type === 'WEIGHTED' && parsed.scheme.rules[name].weight)
      .toBeCloseTo(expectedWeight);
  });
}
