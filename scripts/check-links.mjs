import fs from "node:fs";

const programs = JSON.parse(fs.readFileSync("data/programs.json", "utf8"));
const schools = JSON.parse(fs.readFileSync("data/schools.json", "utf8"));

const CONCURRENCY = 8;
const TIMEOUT_MS = 12_000;
const OK_STATUSES = new Set([401, 403, 405, 429]);
const verbose = process.argv.includes("--verbose");

const links = collectLinks();
const results = await runChecks(links);
const broken = results.filter((result) => !result.ok);

for (const result of verbose ? results : broken) {
  const marker = result.ok ? "ok" : "fail";
  const status = result.status ? ` ${result.status}` : "";
  const error = result.error ? ` ${result.error}` : "";
  console.log(`[${marker}]${status}${error} ${result.url} (${result.sources.join("; ")})`);
}

console.log("");
console.log(`Checked ${results.length} unique links.`);
console.log(`Failures: ${broken.length}`);

if (broken.length > 0) {
  process.exitCode = 1;
}

function collectLinks() {
  const byUrl = new Map();

  for (const program of programs) {
    for (const [kind, url] of Object.entries(program.links)) {
      addLink(byUrl, url, `${program.id}:${kind}`);
    }
  }

  for (const [school, profile] of Object.entries(schools)) {
    addLink(byUrl, profile.sourceUrl, `${school}:profile`);
  }

  return Array.from(byUrl, ([url, sources]) => ({ url, sources }));
}

function addLink(byUrl, url, source) {
  if (!url || typeof url !== "string") {
    return;
  }

  const normalized = url.trim();

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    return;
  }

  const sources = byUrl.get(normalized) ?? [];
  sources.push(source);
  byUrl.set(normalized, sources);
}

async function runChecks(items) {
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
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker())
  );

  return results.sort((left, right) => left.url.localeCompare(right.url));
}

async function checkLink(item) {
  const headResult = await request(item.url, "HEAD");

  if (headResult.ok || headResult.status === 405) {
    return { ...item, ...headResult };
  }

  const getResult = await request(item.url, "GET");

  return { ...item, ...getResult };
}

async function request(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "User-Agent":
          "Mozilla/5.0 AdmitFlow link checker (+https://localhost/admitflow)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow",
      signal: controller.signal
    });

    return {
      ok: isAcceptableStatus(response.status),
      status: response.status,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isAcceptableStatus(status) {
  if (status >= 200 && status < 400) {
    return true;
  }

  return OK_STATUSES.has(status);
}
