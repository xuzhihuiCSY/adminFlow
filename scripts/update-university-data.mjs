import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const CWUR_URL = "https://cwur.org/2026.php";
const CWUR_BASE_URL = "https://cwur.org/";

const SCHOOL_ALIASES = {
  "MIT": "Massachusetts Institute of Technology",
  "UC Berkeley": "University of California, Berkeley",
  "UCLA": "University of California, Los Angeles",
  "UC Irvine": "University of California, Irvine",
  "UC San Diego": "University of California, San Diego",
  "Georgia Tech": "Georgia Institute of Technology",
  "UT Austin": "University of Texas at Austin",
  "UIUC": "University of Illinois at Urbana-Champaign",
  "UW": "University of Washington"
};

const today = new Date().toISOString().slice(0, 10);

const programsPath = dataPath("programs.json");
const schoolsPath = dataPath("schools.json");
const windowsPath = dataPath("application-windows.json");
const rankingsPath = dataPath("school-rankings.json");
const reportPath = dataPath("update-report.json");

const programs = await readJson(programsPath);
const schools = await readJson(schoolsPath);
const applicationWindows = await readJson(windowsPath);
const currentRankings = await readJson(rankingsPath);

const validation = validateCatalog({ programs, schools, applicationWindows });
if (validation.errors.length > 0) {
  for (const error of validation.errors) {
    console.error(`[error] ${error}`);
  }
  process.exit(1);
}

const cwurRows = await fetchCwurRows(CWUR_URL);
const rankingResult = updateRankings(currentRankings, cwurRows, programs);
await writeJson(rankingsPath, rankingResult.rankingsPayload);

const report = {
  lastChecked: new Date().toISOString(),
  catalog: {
    programs: programs.length,
    schools: Object.keys(schools).length,
    applicationWindowEntries: Object.keys(applicationWindows).length,
    rankingEntries: Object.keys(rankingResult.rankingsPayload.rankings).length
  },
  cwur: {
    sourceUrl: CWUR_URL,
    rowsFetched: cwurRows.length,
    matchedSchools: rankingResult.matchedSchools.length,
    unmatchedProgramSchools: rankingResult.unmatchedProgramSchools,
    updatedRankingKeys: rankingResult.updatedRankingKeys
  },
  validation
};

await writeJson(reportPath, report);

console.log(`Catalog validated: ${programs.length} programs, ${Object.keys(schools).length} schools.`);
console.log(`CWUR rows fetched: ${cwurRows.length}; matched program schools: ${rankingResult.matchedSchools.length}.`);
if (rankingResult.unmatchedProgramSchools.length > 0) {
  console.log(`Unmatched program schools: ${rankingResult.unmatchedProgramSchools.join(", ")}`);
}

function dataPath(filename) {
  return path.join(DATA_DIR, filename);
}

async function readJson(filename) {
  const text = await fs.readFile(filename, "utf8");
  return JSON.parse(text);
}

async function writeJson(filename, value) {
  await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function validateCatalog({ programs, schools, applicationWindows }) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const schoolNames = new Set(Object.keys(schools));
  const usedSchools = new Set();

  for (const program of programs) {
    const label = program?.id ?? "(missing id)";

    if (!program?.id || typeof program.id !== "string") {
      errors.push("Program is missing a string id.");
      continue;
    }

    if (ids.has(program.id)) {
      errors.push(`Duplicate program id: ${program.id}`);
    }
    ids.add(program.id);

    if (!program.school || !schoolNames.has(program.school)) {
      errors.push(`${label} references missing school profile: ${program.school}`);
    } else {
      usedSchools.add(program.school);
    }

    if (!applicationWindows[program.id]) {
      errors.push(`${label} is missing application windows.`);
    }

    for (const key of ["program", "admission", "international", "apply"]) {
      const url = program.links?.[key];
      if (!isHttpUrl(url)) {
        errors.push(`${label} has invalid ${key} link.`);
      }
    }
  }

  for (const [programId, windows] of Object.entries(applicationWindows)) {
    if (!ids.has(programId)) {
      warnings.push(`Application windows exist for unknown program id: ${programId}`);
    }

    if (!Array.isArray(windows) || windows.length === 0) {
      errors.push(`${programId} must have at least one application window.`);
      continue;
    }

    for (const window of windows) {
      if (!window.intake || typeof window.intake !== "string") {
        errors.push(`${programId} has a window without intake.`);
      }

      if (window.opens !== null && !isMonthDay(window.opens)) {
        errors.push(`${programId} has invalid opens value: ${window.opens}`);
      }

      if (!isMonthDay(window.deadline)) {
        errors.push(`${programId} has invalid deadline value: ${window.deadline}`);
      }
    }
  }

  for (const [school, profile] of Object.entries(schools)) {
    if (!usedSchools.has(school)) {
      warnings.push(`School profile is not used by any program: ${school}`);
    }

    if (!["Public", "Private"].includes(profile.schoolType)) {
      errors.push(`${school} has invalid schoolType: ${profile.schoolType}`);
    }

    if (!isHttpUrl(profile.sourceUrl)) {
      errors.push(`${school} has invalid sourceUrl.`);
    }
  }

  return { errors, warnings };
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

function isMonthDay(value) {
  if (typeof value !== "string" || !/^\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(2024, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function fetchCwurRows(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AdmitFlow data updater (+https://admit-flow.com)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CWUR rankings: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const rows = [];
  const rowPattern = /<tr>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html))) {
    const cells = Array.from(rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi), (match) => match[1]);
    if (cells.length < 9) {
      continue;
    }

    const rank = firstNumber(stripHtml(cells[0]));
    const institutionLink = cells[1].match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const location = stripHtml(cells[2]);
    const nationalRank = firstNumber(stripHtml(cells[3]));
    const score = Number(stripHtml(cells[8]));

    if (!rank || !institutionLink || location !== "USA" || !nationalRank || Number.isNaN(score)) {
      continue;
    }

    const href = decodeHtml(institutionLink[1]);
    const institution = stripHtml(institutionLink[2]);

    rows.push({
      institution,
      normalizedInstitution: normalizeName(institution),
      worldRank: rank,
      nationalRank,
      score,
      sourceUrl: new URL(href, CWUR_BASE_URL).href
    });
  }

  if (rows.length === 0) {
    throw new Error("CWUR parser did not find any USA ranking rows.");
  }

  return rows;
}

function updateRankings(currentRankings, cwurRows, programs) {
  const rowsByName = new Map(cwurRows.map((row) => [row.normalizedInstitution, row]));
  const programSchools = Array.from(new Set(programs.map((program) => program.school))).sort();
  const existingEntries = currentRankings.rankings ?? {};
  const updatedRankings = {};
  const matchedSchools = [];
  const unmatchedProgramSchools = [];
  const updatedRankingKeys = [];

  for (const school of programSchools) {
    const existing = existingEntries[school];
    const candidates = [
      existing?.sourceInstitution,
      SCHOOL_ALIASES[school],
      school
    ].filter(Boolean);

    const row = candidates
      .map((candidate) => rowsByName.get(normalizeName(candidate)))
      .find(Boolean);

    if (!row) {
      unmatchedProgramSchools.push(school);
      if (existing) {
        updatedRankings[school] = existing;
      }
      continue;
    }

    const nextEntry = {
      sourceInstitution: row.institution,
      worldRank: row.worldRank,
      nationalRank: row.nationalRank,
      score: row.score,
      sourceUrl: row.sourceUrl
    };

    updatedRankings[school] = nextEntry;
    matchedSchools.push(school);

    if (JSON.stringify(existing) !== JSON.stringify(nextEntry)) {
      updatedRankingKeys.push(school);
    }
  }

  for (const [school, entry] of Object.entries(existingEntries)) {
    if (!updatedRankings[school]) {
      updatedRankings[school] = entry;
    }
  }

  const sortedRankings = Object.fromEntries(
    Object.entries(updatedRankings).sort(([, left], [, right]) => {
      return left.worldRank - right.worldRank || left.sourceInstitution.localeCompare(right.sourceInstitution);
    })
  );

  return {
    rankingsPayload: {
      source: {
        ...(currentRankings.source ?? {}),
        name: "Center for World University Rankings (CWUR)",
        edition: "2026 Global 2000",
        url: CWUR_URL,
        country: "USA",
        updated: today
      },
      rankings: sortedRankings
    },
    matchedSchools,
    unmatchedProgramSchools,
    updatedRankingKeys
  };
}

function firstNumber(value) {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function stripHtml(value) {
  return decodeHtml(String(value).replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&ndash;|&mdash;/g, "-");
}

function normalizeName(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
