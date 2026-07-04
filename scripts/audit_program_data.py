from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests
from bs4 import BeautifulSoup

from utils import DATA_DIR, is_http_url, read_json, truncate, utc_now, write_json

PROGRAMS_PATH = DATA_DIR / "programs.json"
WINDOWS_PATH = DATA_DIR / "application-windows.json"
REPORT_PATH = DATA_DIR / "program-audit-report.json"

LINK_CONCURRENCY = 8
PAGE_CONCURRENCY = 4
TIMEOUT_SECONDS = 12
PROTECTED_STATUSES = {401, 403, 429}
DEADLINE_LINK_KINDS = ("program", "admission")
MAX_EVIDENCE_PER_PROGRAM = 6

SESSION = requests.Session()
HEADERS = {
    "User-Agent": "Mozilla/5.0 AdmitFlow data auditor (+https://admit-flow.com)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def main() -> None:
    programs = read_json(PROGRAMS_PATH)
    application_windows = read_json(WINDOWS_PATH)

    unique_links = collect_unique_links(programs)
    link_results = check_links(unique_links)
    link_results_by_url = {result["url"]: result for result in link_results}
    deadline_evidence = collect_deadline_evidence(programs)

    program_audits = [
        {
            "id": program["id"],
            "school": program["school"],
            "program": program["program"],
            "currentApplicationWindows": application_windows.get(program["id"], []),
            "links": {
                kind: summarize_link(url, link_results_by_url.get(url))
                for kind, url in program.get("links", {}).items()
            },
            "deadlineEvidence": deadline_evidence.get(program["id"], []),
        }
        for program in programs
    ]

    broken_links = [result for result in link_results if result["statusCategory"] == "broken"]
    protected_links = [result for result in link_results if result["statusCategory"] == "protected"]
    programs_with_evidence = [audit for audit in program_audits if audit["deadlineEvidence"]]
    programs_missing_evidence = [
        {
            "id": audit["id"],
            "school": audit["school"],
            "program": audit["program"],
        }
        for audit in program_audits
        if not audit["deadlineEvidence"]
    ]

    report = {
        "lastChecked": utc_now(),
        "summary": {
            "programsChecked": len(programs),
            "uniqueLinksChecked": len(link_results),
            "okLinks": len([result for result in link_results if result["statusCategory"] == "ok"]),
            "protectedOrRateLimitedLinks": len(protected_links),
            "brokenLinks": len(broken_links),
            "programsWithDeadlineEvidence": len(programs_with_evidence),
            "programsMissingDeadlineEvidence": len(programs_missing_evidence),
        },
        "linkAudit": {
            "brokenLinks": broken_links,
            "protectedOrRateLimitedLinks": protected_links,
        },
        "deadlineAudit": {
            "note": (
                "Deadline evidence is extracted from public program and admission pages for human review. "
                "It is not automatically written to application-windows.json."
            ),
            "programsMissingEvidence": programs_missing_evidence,
        },
        "programs": program_audits,
    }
    write_json(REPORT_PATH, report)

    print(
        f"Checked {len(link_results)} unique links: "
        f"{len(broken_links)} broken, {len(protected_links)} protected/rate-limited."
    )
    print(f"Collected deadline evidence for {len(programs_with_evidence)} of {len(programs)} programs.")


def collect_unique_links(programs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_url: dict[str, list[str]] = {}

    for program in programs:
        for kind, url in (program.get("links") or {}).items():
            if not is_http_url(url):
                continue

            by_url.setdefault(url, []).append(f"{program['id']}:{kind}")

    return [{"url": url, "sources": sources} for url, sources in by_url.items()]


def check_links(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    with ThreadPoolExecutor(max_workers=min(LINK_CONCURRENCY, len(items) or 1)) as executor:
        results = list(executor.map(check_link, items))

    return sorted(results, key=lambda result: result["url"])


def check_link(item: dict[str, Any]) -> dict[str, Any]:
    head_result = request_url(item["url"], "HEAD")

    if head_result["statusCategory"] == "ok" or head_result["status"] != 405:
        return {**item, **head_result}

    get_result = request_url(item["url"], "GET")
    return {**item, **get_result}


def collect_deadline_evidence(programs: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    evidence_by_program_id: dict[str, list[dict[str, Any]]] = {}

    with ThreadPoolExecutor(max_workers=min(PAGE_CONCURRENCY, len(programs) or 1)) as executor:
        futures = {
            executor.submit(collect_program_deadline_evidence, program): program["id"]
            for program in programs
        }
        for future in as_completed(futures):
            evidence_by_program_id[futures[future]] = future.result()

    return evidence_by_program_id


def collect_program_deadline_evidence(program: dict[str, Any]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    evidence: list[dict[str, Any]] = []

    for kind in DEADLINE_LINK_KINDS:
        url = (program.get("links") or {}).get(kind)

        if not is_http_url(url) or url in seen:
            continue

        seen.add(url)
        page = fetch_page_text(url)

        if not page["ok"]:
            evidence.append(
                {
                    "source": kind,
                    "url": url,
                    "status": page["status"],
                    "statusCategory": page["statusCategory"],
                    "snippets": [],
                }
            )
            continue

        snippets = extract_deadline_snippets(page["text"])

        if snippets:
            evidence.append(
                {
                    "source": kind,
                    "url": url,
                    "status": page["status"],
                    "statusCategory": page["statusCategory"],
                    "snippets": snippets,
                }
            )

        if sum(len(item["snippets"]) for item in evidence) >= MAX_EVIDENCE_PER_PROGRAM:
            break

    return trim_program_evidence(evidence)


def fetch_page_text(url: str) -> dict[str, Any]:
    return request_url(url, "GET")


def request_url(url: str, method: str) -> dict[str, Any]:
    try:
        response = SESSION.request(
            method,
            url,
            headers=HEADERS,
            allow_redirects=True,
            timeout=TIMEOUT_SECONDS,
        )
        content_type = response.headers.get("content-type", "")
        text = html_to_text(response.text) if method == "GET" and "text/html" in content_type else ""

        return {
            "ok": 200 <= response.status_code < 400,
            "status": response.status_code,
            "statusCategory": categorize_status(response.status_code),
            "finalUrl": response.url,
            "error": None,
            "text": text,
        }
    except requests.RequestException as error:
        return {
            "ok": False,
            "status": None,
            "statusCategory": "broken",
            "finalUrl": url,
            "error": str(error),
            "text": "",
        }


def summarize_link(url: str, result: dict[str, Any] | None) -> dict[str, Any]:
    if not result:
        return {
            "url": url,
            "status": None,
            "statusCategory": "unchecked",
            "finalUrl": url,
            "error": "No link result found",
        }

    return {
        "url": url,
        "status": result["status"],
        "statusCategory": result["statusCategory"],
        "finalUrl": result["finalUrl"],
        "error": result["error"],
    }


def categorize_status(status: int) -> str:
    if 200 <= status < 400:
        return "ok"
    if status in PROTECTED_STATUSES:
        return "protected"
    return "broken"


def extract_deadline_snippets(text: str) -> list[str]:
    snippets: list[str] = []
    normalized = re.sub(r"\s+", " ", text).strip()
    sentence_pattern = re.compile(
        r"[^.!?;。！？；]{0,180}"
        r"(?:deadline|due|apply by|applications? (?:close|open|due)|priority|round|Fall|Spring|Summer|Winter)"
        r"[^.!?;。！？；]{0,180}",
        re.I,
    )
    date_pattern = re.compile(
        r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|"
        r"Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?"
        r"\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b|\b20\d{2}-\d{2}-\d{2}\b",
        re.I,
    )

    for match in sentence_pattern.finditer(normalized):
        snippet = match.group(0).strip()
        if not date_pattern.search(snippet):
            continue

        compact = truncate(snippet, 260)
        if compact not in snippets:
            snippets.append(compact)

        if len(snippets) >= MAX_EVIDENCE_PER_PROGRAM:
            break

    return snippets


def trim_program_evidence(evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    trimmed: list[dict[str, Any]] = []
    remaining = MAX_EVIDENCE_PER_PROGRAM

    for item in evidence:
        snippets = item["snippets"][:remaining]
        remaining -= len(snippets)
        trimmed.append({**item, "snippets": snippets})

        if remaining <= 0:
            break

    return trimmed


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup.get_text(" ", strip=True)


if __name__ == "__main__":
    main()
