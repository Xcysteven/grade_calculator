import { describe, expect, it } from 'vitest';
import { extractLinkedPolicyUrls } from './coursePolicy';

describe('extractLinkedPolicyUrls', () => {
  it('keeps same-site syllabus links and public Google Doc syllabi', () => {
    const links = extractLinkedPolicyUrls(`
      <a href="/syllabus/">Syllabus</a>
      <a href="https://docs.google.com/document/d/abc123/edit">Course grading policy</a>
    `, 'https://dsc140a.com/');

    expect(links).toEqual([
      'https://dsc140a.com/syllabus/',
      'https://docs.google.com/document/d/abc123/export?format=txt',
    ]);
  });

  it('drops external university policy links that are not course syllabi', () => {
    const links = extractLinkedPolicyUrls(`
      <a href="https://www.google.com/url?q=http%3A%2F%2Facademicintegrity.ucsd.edu%2Fprocess%2Fpolicy.html">
        Academic integrity policy
      </a>
      <a href="https://senate.ucsd.edu/Operating-Procedures/Senate-Manual/Appendices/2/">
        Senate policy
      </a>
      <a href="https://dsc80.com/syllabus/">Course syllabus</a>
    `, 'https://dsc80.com/');

    expect(links).toEqual(['https://dsc80.com/syllabus/']);
  });
});
