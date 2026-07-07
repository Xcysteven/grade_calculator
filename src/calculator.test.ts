import { describe, expect, it } from 'vitest';
import { groupAssignmentsByCategory } from './calculator';
import { parseCoursePolicyText } from './policyParser';
import type { Assignment, GradingScheme } from './types';

describe('groupAssignmentsByCategory', () => {
  it('maps DSC20 Gradescope names into detected syllabus categories', () => {
    const scheme = weightedSchemeFrom(`
      Component Weight Notes
      Skill Tests 55% see schedule and redemption policy above
      Participation 15% 5 weeks x 3% each
      Weekly Learning/Practice 30% labs, homework, readings, lecture quizzes
    `);

    const groups = groupAssignmentsByCategory(assignments([
      'Midterm_V1',
      'project',
      'hw09',
      'lab09',
      'Campuswire participation',
    ]), scheme);

    expect(groupNames(groups)).toEqual({
      Participation: ['Campuswire participation'],
      'Skill Tests': ['Midterm_V1'],
      'Weekly Learning/Practice': ['project', 'hw09', 'lab09'],
    });
  });

  it('maps DSC80 Exam 01 and Exam 02 into midterm and final categories', () => {
    const scheme = weightedSchemeFrom(`
      Component Weight Notes
      Labs 20% 2.5% per lab, lowest dropped
      Projects 25% 5% each for Projects 1-3, 10% for Project 4
      Project Checkpoints 5% 1% each
      Midterm Exam 20% see the Redemption Policy above
      Final Exam 30%
    `);

    const groups = groupAssignmentsByCategory(assignments([
      'Exam 01',
      'Exam 02',
      'Project 02 - Checkpoint',
      'Lab 08',
    ]), scheme);

    expect(groupNames(groups)).toEqual({
      Checkpoints: ['Project 02 - Checkpoint'],
      Final: ['Exam 02'],
      Labs: ['Lab 08'],
      Midterms: ['Exam 01'],
    });
  });

  it('maps DSC106 project-specific names before generic project names', () => {
    const scheme = weightedSchemeFrom(`
      Component Weight Notes
      Participation 8% 1% per week, 2 lowest weeks dropped
      Labs 8% 1% per lab
      Project 1 10%
      Project 2 15% 14% for submission, 1% for peer review
      Project 3 15% 14% for submission, 1% for peer review
      Project Checkpoints 4% 1% for Project 1 and 2 checkpoints, 2% for Project 3 checkpoint
      Final Project 40% 1% proposal, 2% prototype, 10% video, 20% final submission
    `);

    const groups = groupAssignmentsByCategory(assignments([
      'Final project deliverables',
      'Project 3 Peer Review',
      'Project 1',
      'Lab 8',
      'SETs + Final Survey',
    ]), scheme);

    expect(groupNames(groups)).toEqual({
      'Final Project': ['Final project deliverables'],
      Labs: ['Lab 8'],
      Participation: ['SETs + Final Survey'],
      'Project 1': ['Project 1'],
      'Project 3': ['Project 3 Peer Review'],
    });
  });

  it('maps DSC140B credit-system assignment names', () => {
    const scheme = requiredScheme(parseCoursePolicyText(`
      By default, your course grade is based entirely on exams (90% of your grade) and the final project (10% of your grade).
      By completing optional assignments, however, you can earn credits that reduce the weight of the exams.
      There will be a total of 40 credits available throughout the quarter.
      Homeworks: the total value of all homework problems will add up to 24 credits, distributed across 8 homeworks.
      Quizzes: each quiz you pass earns you 1.5 credits. There will be 8 quizzes throughout the quarter, for a total of 12 possible credits.
      Attendance: each lecture you attend earns you 0.25 credits, to a maximum of 4 credits total.
    `));

    const groups = groupAssignmentsByCategory(assignments([
      'Midterm_V1',
      'Final Project',
      'HW 1',
      'Quiz 1',
      'Lecture Attendance 1',
    ]), scheme);

    expect(groupNames(groups)).toEqual({
      Attendance: ['Lecture Attendance 1'],
      Exams: ['Midterm_V1'],
      'Final Project': ['Final Project'],
      Homework: ['HW 1'],
      Quizzes: ['Quiz 1'],
    });
  });
});

function weightedSchemeFrom(policyText: string): GradingScheme {
  return requiredScheme(parseCoursePolicyText(policyText));
}

function requiredScheme(parsed: ReturnType<typeof parseCoursePolicyText>): GradingScheme {
  if (!parsed.scheme) {
    throw new Error('Expected parsed grading scheme');
  }

  return parsed.scheme;
}

function assignments(names: string[]): Assignment[] {
  return names.map((name, index) => ({
    id: String(index),
    name,
    score: 1,
    maxScore: 1,
  }));
}

function groupNames(groups: Record<string, Assignment[]>): Record<string, string[]> {
  const entries: Array<[string, string[]]> = Object.entries(groups).map(([name, groupAssignments]) => [
    name,
    groupAssignments.map((assignment) => assignment.name),
  ]);

  return Object.fromEntries(entries.sort(([nameA], [nameB]) => nameA.localeCompare(nameB)));
}
