import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const schoolsPath = path.join(root, "data", "schools.json");
const scorecardPath = path.join(
  root,
  "data",
  "scorecard-most-recent",
  "Most-Recent-Cohorts-Institution.csv"
);

const aliases = {
  MIT: ["Massachusetts Institute of Technology"],
  "UC Berkeley": ["University of California-Berkeley"],
  "UC Davis": ["University of California-Davis"],
  UCLA: ["University of California-Los Angeles"],
  "UC Irvine": ["University of California-Irvine"],
  "UC San Diego": ["University of California-San Diego"],
  "UC Santa Barbara": ["University of California-Santa Barbara"],
  "UC Santa Cruz": ["University of California-Santa Cruz"],
  "Cal Poly Pomona": ["California State Polytechnic University-Pomona"],
  "Cal Poly San Luis Obispo": ["California Polytechnic State University-San Luis Obispo"],
  "Cal State East Bay": ["California State University-East Bay"],
  "Cal State Fullerton": ["California State University-Fullerton"],
  "Cal State Long Beach": ["California State University-Long Beach"],
  "Cal State Monterey Bay": ["California State University-Monterey Bay"],
  "Cal State Northridge": ["California State University-Northridge"],
  "Fresno State": ["California State University-Fresno"],
  "Sacramento State": ["California State University-Sacramento"],
  "Arizona State University": ["Arizona State University Campus Immersion"],
  "Georgia Tech": ["Georgia Institute of Technology-Main Campus"],
  "UT Austin": ["The University of Texas at Austin"],
  "UNC Chapel Hill": ["University of North Carolina at Chapel Hill"],
  "Ohio State University": ["Ohio State University-Main Campus"],
  "Purdue University": ["Purdue University-Main Campus"],
  "Penn State": ["Pennsylvania State University-Main Campus"],
  "Rutgers University": ["Rutgers University-New Brunswick"],
  "University of Maryland": ["University of Maryland-College Park"],
  "University of Michigan": ["University of Michigan-Ann Arbor"],
  "University of Minnesota Twin Cities": ["University of Minnesota-Twin Cities"],
  "University of Virginia": ["University of Virginia-Main Campus"],
  "University of Washington": ["University of Washington-Seattle Campus"],
  "Texas A&M University": ["Texas A&M University-College Station"],
  Caltech: ["California Institute of Technology"],
  "Columbia University": ["Columbia University in the City of New York"],
  "University of Illinois Urbana-Champaign": ["University of Illinois Urbana-Champaign"],
  "University at Buffalo": ["University at Buffalo"],
  "Indiana University Bloomington": ["Indiana University-Bloomington"],
  "Virginia Tech": ["Virginia Polytechnic Institute and State University"],
  "University of Pittsburgh": ["University of Pittsburgh-Pittsburgh Campus"]
};

const fields = [
  "UNITID",
  "INSTNM",
  "CITY",
  "STABBR",
  "TUITIONFEE_OUT",
  "TUITIONFEE_IN",
  "COSTT4_A",
  "NPT4_PUB",
  "NPT4_PRIV",
  "UGDS",
  "UGDS_NRA",
  "ADM_RATE",
  "PCTPELL",
  "MN_EARN_WNE_P10",
  "C150_4",
  "RET_FT4"
];

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bthe\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function numberOrNull(value) {
  if (!value || value === "NULL" || value === "PrivacySuppressed") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentOrNull(value) {
  const number = numberOrNull(value);
  return number === null ? null : Math.round(number * 1000) / 10;
}

function readScorecardRows() {
  const csv = fs.readFileSync(scorecardPath, "utf8");
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const indexes = Object.fromEntries(fields.map((field) => [field, header.indexOf(field)]));
  const rows = new Map();

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      fields.map((field) => [field, values[indexes[field]] ?? ""])
    );
    rows.set(normalize(row.INSTNM), row);
  }

  return rows;
}

function findRow(rows, school) {
  const candidates = [school, ...(aliases[school] ?? [])];

  for (const candidate of candidates) {
    const row = rows.get(normalize(candidate));
    if (row) {
      return row;
    }
  }

  return null;
}

function toScorecardProfile(row) {
  const unitId = row.UNITID;
  const estimatedAttendance = numberOrNull(row.COSTT4_A);
  const averageNetPrice = numberOrNull(row.NPT4_PUB) ?? numberOrNull(row.NPT4_PRIV);

  return {
    unitId,
    sourceInstitution: row.INSTNM,
    sourceLabel: `College Scorecard: ${row.INSTNM}`,
    sourceUrl: `https://collegescorecard.ed.gov/school/?${unitId}-${encodeURIComponent(row.INSTNM)}`,
    updated: "2026-06-10",
    tuitionOutOfState: numberOrNull(row.TUITIONFEE_OUT),
    tuitionInState: numberOrNull(row.TUITIONFEE_IN),
    estimatedAttendance,
    averageGrantAid:
      estimatedAttendance !== null && averageNetPrice !== null
        ? Math.max(0, estimatedAttendance - averageNetPrice)
        : null,
    undergraduateSize: numberOrNull(row.UGDS),
    internationalStudentRate: percentOrNull(row.UGDS_NRA),
    admissionRate: percentOrNull(row.ADM_RATE),
    pellGrantRate: percentOrNull(row.PCTPELL),
    meanEarnings10Years: numberOrNull(row.MN_EARN_WNE_P10),
    completionRate: percentOrNull(row.C150_4),
    retentionRate: percentOrNull(row.RET_FT4)
  };
}

const schools = JSON.parse(fs.readFileSync(schoolsPath, "utf8"));
const rows = readScorecardRows();
const unmatched = [];

for (const school of Object.keys(schools)) {
  const row = findRow(rows, school);

  if (!row) {
    unmatched.push(school);
    continue;
  }

  schools[school].scorecard = toScorecardProfile(row);
}

fs.writeFileSync(schoolsPath, `${JSON.stringify(schools, null, 2)}\n`);

console.log(`Updated ${Object.keys(schools).length - unmatched.length} school profiles.`);
if (unmatched.length > 0) {
  console.log(`Unmatched: ${unmatched.join(", ")}`);
}
