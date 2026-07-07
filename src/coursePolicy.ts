import { parseCoursePolicyText, type ParsedPolicy } from './policyParser';

export type CoursePolicyResult = ParsedPolicy & {
  url: string | null;
  attemptedUrls: string[];
};

type DscCourseRepo = {
  name: string;
  homepage: string | null;
  has_pages: boolean;
  pushed_at: string | null;
  updated_at: string | null;
  default_branch: string;
};

export function extractDscCourseCode(courseName: string): string | null {
  const match = courseName
    .toLowerCase()
    .match(/(?:^|[^a-z0-9])dsc[_\s-]*(\d{1,3}[a-z]?)(?=$|[^a-z0-9])/);
  return match ? `dsc${match[1]}` : null;
}

export function getPolicyCandidateUrls(courseName: string, manualUrl?: string): string[] {
  const courseCode = extractDscCourseCode(courseName);
  const urls = [
    manualUrl,
    ...(courseCode ? buildCourseCodeUrls(courseCode) : []),
  ].filter(Boolean) as string[];

  return Array.from(new Set(urls));
}

export async function discoverCoursePolicy(
  courseName: string,
  manualUrl?: string,
): Promise<CoursePolicyResult> {
  const attemptedUrls = await getVerifiedPolicyCandidateUrls(courseName, manualUrl);
  let bestResult: CoursePolicyResult | null = null;

  for (const url of attemptedUrls) {
    try {
      const policyText = await fetchReadableText(url);
      const parsedPolicy = parseCoursePolicyText(policyText);
      const result = {
        ...parsedPolicy,
        url,
        attemptedUrls,
      };

      if (parsedPolicy.scheme && parsedPolicy.confidence >= 0.7) {
        return result;
      }

      if (!bestResult || parsedPolicy.confidence > bestResult.confidence) {
        bestResult = result;
      }
    } catch (error) {
      bestResult ??= {
        scheme: null,
        source: 'unknown',
        confidence: 0,
        url: null,
        attemptedUrls,
        warnings: [],
      };
      bestResult.warnings.push(`${url}: ${getErrorMessage(error)}`);
    }
  }

  return bestResult ?? {
    scheme: null,
    source: 'unknown',
    confidence: 0,
    url: null,
    attemptedUrls,
    warnings: ['No course policy URL candidates were available.'],
  };
}

export function parseManualCoursePolicyText(policyText: string): CoursePolicyResult {
  return {
    ...parseCoursePolicyText(policyText),
    url: null,
    attemptedUrls: ['manual syllabus text'],
  };
}

async function getVerifiedPolicyCandidateUrls(
  courseName: string,
  manualUrl?: string,
): Promise<string[]> {
  const courseCode = extractDscCourseCode(courseName);
  const manualUrls = manualUrl ? [manualUrl] : [];
  const githubUrls = courseCode
    ? await getGithubCoursePolicyUrls(courseName, courseCode)
    : [];
  const fallbackUrls = getPolicyCandidateUrls(courseName);

  return uniqueUrls([...manualUrls, ...fallbackUrls, ...githubUrls]);
}

async function fetchReadableText(url: string, followLinkedPolicies = true): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const linkedPolicyTexts = followLinkedPolicies
    ? await Promise.all(
      extractLinkedPolicyUrls(html, url).map(async (linkedUrl) => {
        try {
          return await fetchReadableText(linkedUrl, false);
        } catch {
          return '';
        }
      }),
    )
    : [];

  return [
    htmlToText(html),
    ...linkedPolicyTexts,
  ].filter(Boolean).join('\n');
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|tr|td|th|h1|h2|h3|h4|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');
}

function buildCourseCodeUrls(courseCode: string): string[] {
  const normalizedCourseCode = courseCode.toLowerCase();

  return [
    `https://${normalizedCourseCode}.com/syllabus/`,
    `https://${normalizedCourseCode}.com/syllabus.html`,
    `https://${normalizedCourseCode}.com/`,
    `https://${normalizedCourseCode}.org/syllabus/`,
    `https://${normalizedCourseCode}.org/syllabus.html`,
    `https://${normalizedCourseCode}.org/`,
    `https://dsc-courses.github.io/${normalizedCourseCode}/syllabus/`,
    `https://dsc-courses.github.io/${normalizedCourseCode}/syllabus.html`,
    `https://dsc-courses.github.io/${normalizedCourseCode}/`,
  ];
}

export function extractLinkedPolicyUrls(html: string, baseUrl: string): string[] {
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const links = Array.from(html.matchAll(linkPattern)).flatMap((match) => {
    const href = match[1];
    const linkText = htmlToText(match[2]).toLowerCase();

    if (!/syllabus|grading|policy/.test(linkText)) {
      return [];
    }

    const absoluteUrl = toAbsoluteUrl(href, baseUrl);
    if (!absoluteUrl) {
      return [];
    }

    const normalizedUrl = normalizeLinkedPolicyUrl(absoluteUrl);
    if (!shouldFetchLinkedPolicyUrl(normalizedUrl, baseUrl)) {
      return [];
    }

    return [normalizedUrl];
  });

  return uniqueUrls(links).filter((url) => url !== baseUrl);
}

function toAbsoluteUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function normalizeLinkedPolicyUrl(url: string): string {
  const googleRedirectTarget = getGoogleRedirectTarget(url);

  if (googleRedirectTarget) {
    return normalizeLinkedPolicyUrl(googleRedirectTarget);
  }

  const googleDocMatch = url.match(/https:\/\/docs\.google\.com\/document\/d\/([^/?#]+)/);

  if (googleDocMatch) {
    return `https://docs.google.com/document/d/${googleDocMatch[1]}/export?format=txt`;
  }

  return url;
}

function getGoogleRedirectTarget(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.endsWith('google.com') || parsedUrl.pathname !== '/url') {
      return null;
    }

    return parsedUrl.searchParams.get('q') ?? parsedUrl.searchParams.get('url');
  } catch {
    return null;
  }
}

function shouldFetchLinkedPolicyUrl(url: string, baseUrl: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const parsedBaseUrl = new URL(baseUrl);

    if (parsedUrl.origin === parsedBaseUrl.origin) {
      return true;
    }

    if (parsedUrl.hostname === 'docs.google.com' && parsedUrl.pathname.includes('/document/d/')) {
      return true;
    }

    return parsedUrl.hostname === 'dsc-courses.github.io'
      || (
        parsedUrl.hostname === 'raw.githubusercontent.com'
        && parsedUrl.pathname.startsWith('/dsc-courses/')
      );
  } catch {
    return false;
  }
}

async function getGithubCoursePolicyUrls(
  courseName: string,
  courseCode: string,
): Promise<string[]> {
  try {
    const repos = await fetchDscCourseRepos(courseCode);
    const rankedRepos = repos
      .filter((repo) => repoMatchesCourseCode(repo.name, courseCode))
      .sort((firstRepo, secondRepo) => (
        scoreRepoMatch(secondRepo, courseName) - scoreRepoMatch(firstRepo, courseName)
      ))
      .slice(0, 5);
    const urls = await Promise.all(rankedRepos.map(buildRepoPolicyUrls));

    return urls.flat();
  } catch {
    return [];
  }
}

async function fetchDscCourseRepos(courseCode: string): Promise<DscCourseRepo[]> {
  const pages = [1, 2, 3, 4, 5];
  const repoPages = await Promise.all(pages.map(async (page) => {
    const response = await fetch(
      `https://api.github.com/orgs/dsc-courses/repos?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json() as DscCourseRepo[];
  }));

  return repoPages.flat().filter((repo) => repoMatchesCourseCode(repo.name, courseCode));
}

async function buildRepoPolicyUrls(repo: DscCourseRepo): Promise<string[]> {
  const repoName = repo.name;
  const branch = repo.default_branch;
  const cname = await fetchRepoCname(repoName, branch);
  const homepageUrls = repo.homepage ? buildPolicyPageUrls(repo.homepage) : [];
  const cnameUrls = cname ? buildPolicyPageUrls(`https://${cname}`) : [];
  const githubPagesUrls = repo.has_pages
    ? buildPolicyPageUrls(`https://dsc-courses.github.io/${repoName}/`)
    : [];
  const rawPolicyUrls = [
    `https://raw.githubusercontent.com/dsc-courses/${repoName}/${branch}/syllabus.md`,
    `https://raw.githubusercontent.com/dsc-courses/${repoName}/${branch}/syllabus/index.md`,
    `https://raw.githubusercontent.com/dsc-courses/${repoName}/${branch}/README.md`,
    `https://raw.githubusercontent.com/dsc-courses/${repoName}/${branch}/index.md`,
  ];

  return uniqueUrls([...homepageUrls, ...cnameUrls, ...githubPagesUrls, ...rawPolicyUrls]);
}

async function fetchRepoCname(repoName: string, branch: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/dsc-courses/${repoName}/${branch}/CNAME`,
    );

    if (!response.ok) {
      return null;
    }

    const cname = (await response.text()).trim().split(/\s+/)[0];
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cname) ? cname : null;
  } catch {
    return null;
  }
}

function buildPolicyPageUrls(baseUrl: string): string[] {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return [
    `${normalizedBaseUrl}syllabus/`,
    `${normalizedBaseUrl}syllabus.html`,
    normalizedBaseUrl,
  ];
}

function repoMatchesCourseCode(repoName: string, courseCode: string): boolean {
  const normalizedRepoName = repoName.toLowerCase();
  const normalizedCourseCode = courseCode.toLowerCase();

  return normalizedRepoName === normalizedCourseCode
    || normalizedRepoName.startsWith(`${normalizedCourseCode}-`)
    || normalizedRepoName.startsWith(`${normalizedCourseCode}_`)
    || normalizedRepoName.startsWith(`${normalizedCourseCode}.`);
}

function scoreRepoMatch(repo: DscCourseRepo, courseName: string): number {
  const normalizedRepoName = repo.name.toLowerCase();
  const termHints = extractTermHints(courseName);
  let score = repo.has_pages ? 10 : 0;

  if (repo.homepage) {
    score += 10;
  }

  termHints.forEach((hint) => {
    if (normalizedRepoName.includes(hint)) {
      score += 100;
    }
  });

  return score + Date.parse(repo.pushed_at ?? repo.updated_at ?? '') / 1_000_000_000;
}

function extractTermHints(courseName: string): string[] {
  const lowerCourseName = courseName.toLowerCase();
  const compactTermMatch = lowerCourseName.match(/(?:^|[^a-z0-9])(fa|wi|sp|su)[_-]?(\d{2})(?=$|[^a-z0-9])/);
  const year = lowerCourseName.match(/(?:^|[^a-z0-9])(20\d{2})(?=$|[^a-z0-9])/)?.[1]
    ?? (compactTermMatch ? `20${compactTermMatch[2]}` : null);
  const termCode = compactTermMatch?.[1] ?? getTermCode(lowerCourseName);

  if (!year || !termCode) {
    return [];
  }

  return [
    `${year}-${termCode}`,
    `${termCode}${year.slice(2)}`,
  ];
}

function getTermCode(courseName: string): string | null {
  if (/\b(fall|fa)\b/.test(courseName)) return 'fa';
  if (/\b(winter|wi)\b/.test(courseName)) return 'wi';
  if (/\b(spring|sp)\b/.test(courseName)) return 'sp';
  if (/\b(summer|su)\b/.test(courseName)) return 'su';

  return null;
}

function uniqueUrls(urls: string[]): string[] {
  return Array.from(new Set(urls.filter(Boolean)));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown fetch error';
}
