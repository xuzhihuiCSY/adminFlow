import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const PROGRAMS_PATH = path.join(DATA_DIR, "programs.json");
const WINDOWS_PATH = path.join(DATA_DIR, "application-windows.json");
const REPORT_PATH = path.join(DATA_DIR, "program-audit-report.json");

const LINK_CONCURRENCY = 8;
const PAGE_CONCURRENCY = 4;
const TIMEOUT_MS = 12_000;
const PROTECTED_STATUSES = new Set([401, 403, 429]);
const DEADLINE_LINK_KINDS = ["program", "admission"];
const MAX_EVIDENCE_PER_PROGRAM = 6;

const programs = await readJson(PROGRAMS_PATH);
const applicationWindows = await readJson(WINDOWS_PATH);

const uniqueLinks = collectUniqueLinks(programs);
const linkResults = await checkLinks(uniqueLinks);
const linkResultsByUrl = new Map(linkResults.map((result) => [result.url, result]));
const deadlineEvidence = await collectDeadlineEvidence(programs);

const programAudits = programs.map((program) => ({
  id: program.id,
  school: program.school,
  program: program.program,
  currentApplicationWindows: applicationWindows[program.id] ?? [],
  links: Object.fromEntries(
    Object.entries(program.links).map(([kind, url]) => [
      kind,
      summarizeLink(url, linkResultsByUrl.get(url))
    ])
  ),
  deadlineEvidence: deadlineEvidence.get(program.id) ?? []
}));

const brokenLinks = linkResults.filter((result) => result.statusCategory === "broken");
const protectedLinks = linkResults.filter((result) => result.statusCategory === "protected");
const programsWithEvidence = programAudits.filter((audit) => audit.deadlineEvidence.length > 0);
const programsMissingEvidence = programAudits
  .filter((audit) => audit.deadlineEvidence.length === 0)
  .map((audit) => ({
    id: audit.id,
    school: audit.school,
    program: audit.program
  }));

const report = {
  lastChecked: new Date().toISOString(),
  summary: {
    programsChecked: programs.length,
    uniqueLinksChecked: linkResults.length,
    okLinks: linkResults.filter((result) => result.statusCategory === "ok").length,
    protectedOrRateLimitedLinks: protectedLinks.length,
    brokenLinks: brokenLinks.length,
    programsWithDeadlineEvidence: programsWithEvidence.length,
    programsMissingDeadlineEvidence: programsMissingEvidence.length
  },
  linkAudit: {
    brokenLinks,
    protectedOrRateLimitedLinks: protectedLinks
  },
  deadlineAudit: {
    note:
      "Deadline evidence is extracted from public program and admission pages for human review. It is not automatically written to application-windows.json.",
    programsMissingEvidence
  },
  programs: programAudits
};

await writeJson(REPORT_PATH, report);

console.log(
  `Checked ${linkResults.length} unique links: ${brokenLinks.length} broken, ${protectedLinks.length} protected/rate-limited.`
);
console.log(
  `Collected deadline evidence for ${programsWithEvidence.length} of ${programs.length} programs.`
);

function collectUniqueLinks(programs) {
  const byUrl = new Map();

  for (const program of programs) {
    for (const [kind, url] of Object.entries(program.links ?? {})) {
      if (!isHttpUrl(url)) {
        continue;
      }

      const sources = byUrl.get(url) ?? [];
      sources.push(`${program.id}:${kind}`);
      byUrl.set(url, sources);
    }
  }

  return Array.from(byUrl, ([url, sources]) => ({ url, sources }));
}

async function checkLinks(items) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      results.push(await checkLink(item));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(LINK_CONCURRENCY, items.length) }, () => worker())
  );

  return results.sort((left, right) => left.url.localeCompare(right.url));
}

async function checkLink(item) {
  const headResult = await request(item.url, "HEAD");

  if (headResult.statusCategory === "ok" || headResult.status !== 405) {
    return { ...item, ...headResult };
  }

  const getResult = await request(item.url, "GET");
  return { ...item, ...getResult };
}

async function collectDeadlineEvidence(programs) {
  const evidenceByProgramId = new Map();
  let index = 0;

  async function worker() {
    while (index < programs.length) {
      const program = programs[index];
      index += 1;
      const evidence = await collectProgramDeadlineEvidence(program);
      evidenceByProgramId.set(program.id, evidence);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(PAGE_CONCURRENCY, programs.length) }, () => worker())
  );

  return evidenceByProgramId;
}

async function collectProgramDeadlineEvidence(program) {
  const seen = new Set();
  const evidence = [];

  for (const kind of DEADLINE_LINK_KINDS) {
    const url = program.links?.[kind];

    if (!isHttpUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    const page = await fetchPageText(url);

    if (!page.ok) {
      evidence.push({
        source: kind,
        url,
        status: page.status,
        statusCategory: page.statusCategory,
        snippets: []
      });
      continue;
    }

    const snippets = extractDeadlineSnippets(page.text);

    if (snippets.length > 0) {
      evidence.push({
        source: kind,
        url,
        status: page.status,
        statusCategory: page.statusCategory,
        snippets
      });
    }

    if (evidence.reduce((count, item) => count + item.snippets.length, 0) >= MAX_EVIDENCE_PER_PROGRAM) {
      break;
    }
  }

  return trimProgramEvidence(evidence);
}

async function fetchPageText(url) {
  const result = await request(url, "GET");

  if (result.statusCategory !== "ok") {
    return result;
  }

  return result;
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "User-Agent": "Mozilla/5.0 AdmitFlow data auditor (+https://admit-flow.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow",
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") ?? "";
    const text =
      method === "GET" && contentType.includes("text/html")
        ? htmlToText(await response.text())
        : "";

    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      statusCategory: categorizeStatus(response.status),
      finalUrl: response.url,
      error: null,
      text
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusCategory: "broken",
      finalUrl: url,
      error: error instanceof Error ? error.message : String(error),
      text: ""
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeLink(url, result) {
  if (!result) {
    return {
      url,
      status: null,
      statusCategory: "unchecked",
      finalUrl: url,
      error: "No link result found"
    };
  }

  return {
    url,
    status: result.status,
    statusCategory: result.statusCategory,
    finalUrl: result.finalUrl,
    error: result.error
  };
}

function categorizeStatus(status) {
  if (status >= 200 && status < 400) {
    return "ok";
  }

  if (PROTECTED_STATUSES.has(status)) {
    return "protected";
  }

  return "broken";
}

function extractDeadlineSnippets(text) {
  const snippets = [];
  const normalized = text.replace(/\s+/g, " ").trim();
  const sentencePattern = /[^.!?;。！？；]{0,180}(?:deadline|due|apply by|applications? (?:close|open|due)|priority|round|Fall|Spring|Summer|Winter)[^.!?;。！？；]{0,180}/gi;
  const datePattern =
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b20\d{2}-\d{2}-\d{2}\b/i;

  for (const match of normalized.matchAll(sentencePattern)) {
    const snippet = match[0].trim();

    if (!datePattern.test(snippet)) {
      continue;
    }

    const compact = truncate(snippet, 260);

    if (!snippets.includes(compact)) {
      snippets.push(compact);
    }

    if (snippets.length >= MAX_EVIDENCE_PER_PROGRAM) {
      break;
    }
  }

  return snippets;
}

function trimProgramEvidence(evidence) {
  const trimmed = [];
  let remaining = MAX_EVIDENCE_PER_PROGRAM;

  for (const item of evidence) {
    const snippets = item.snippets.slice(0, remaining);
    remaining -= snippets.length;

    trimmed.push({
      ...item,
      snippets
    });

    if (remaining <= 0) {
      break;
    }
  }

  return trimmed;
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

async function readJson(filename) {
  const text = await fs.readFile(filename, "utf8");
  return JSON.parse(text);
}

async function writeJson(filename, value) {
  await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
