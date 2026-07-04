from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
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
MONTHS = {
    "jan": "01",
    "january": "01",
    "feb": "02",
    "february": "02",
    "mar": "03",
    "march": "03",
    "apr": "04",
    "april": "04",
    "may": "05",
    "jun": "06",
    "june": "06",
    "jul": "07",
    "july": "07",
    "aug": "08",
    "august": "08",
    "sep": "09",
    "sept": "09",
    "september": "09",
    "oct": "10",
    "october": "10",
    "nov": "11",
    "november": "11",
    "dec": "12",
    "december": "12",
}

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

    program_audits = []
    for program in programs:
        current_windows = application_windows.get(program["id"], [])
        evidence = deadline_evidence.get(program["id"], [])
        program_audits.append(
            {
                "id": program["id"],
                "school": program["school"],
                "program": program["program"],
                "currentApplicationWindows": current_windows,
                "links": {
                    kind: summarize_link(url, link_results_by_url.get(url))
                    for kind, url in program.get("links", {}).items()
                },
                "deadlineEvidence": evidence,
                "deadlineComparison": compare_deadline_candidates(current_windows, evidence),
            }
        )

    broken_links = [result for result in link_results if result["statusCategory"] == "broken"]
    protected_links = [result for result in link_results if result["statusCategory"] == "protected"]
    programs_with_evidence = [audit for audit in program_audits if audit["deadlineEvidence"]]
    programs_needing_deadline_review = [
        {
            "id": audit["id"],
            "school": audit["school"],
            "program": audit["program"],
            "status": audit["deadlineComparison"]["status"],
            "confidence": audit["deadlineComparison"]["confidence"],
            "currentDeadlines": audit["deadlineComparison"]["currentDeadlines"],
            "detectedDeadlines": audit["deadlineComparison"]["detectedDeadlines"],
            "recommendedAction": audit["deadlineComparison"]["recommendedAction"],
        }
        for audit in program_audits
        if audit["deadlineComparison"]["recommendedAction"] == "review"
    ]
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
            "programsNeedingDeadlineReview": len(programs_needing_deadline_review),
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
            "programsNeedingReview": programs_needing_deadline_review,
        },
        "programs": program_audits,
    }
    write_json(REPORT_PATH, report)

    print(
        f"Checked {len(link_results)} unique links: "
        f"{len(broken_links)} broken, {len(protected_links)} protected/rate-limited."
    )
    print(f"Collected deadline evidence for {len(programs_with_evidence)} of {len(programs)} programs.")
    print(f"Flagged {len(programs_needing_deadline_review)} programs for deadline review.")


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


def compare_deadline_candidates(
    current_windows: list[dict[str, Any]],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    current_deadlines = sorted(
        {
            window.get("deadline")
            for window in current_windows
            if isinstance(window.get("deadline"), str)
        }
    )
    candidates = extract_date_candidates(evidence)
    detected_deadlines = sorted(
        [
            {
                "monthDay": month_day,
                "occurrences": count,
                "matchedCurrentRecord": month_day in current_deadlines,
            }
            for month_day, count in Counter(candidate["monthDay"] for candidate in candidates).items()
        ],
        key=lambda item: (-item["occurrences"], item["monthDay"]),
    )
    detected_month_days = {item["monthDay"] for item in detected_deadlines}
    matched_deadlines = sorted(set(current_deadlines) & detected_month_days)
    missing_current_deadlines = sorted(set(current_deadlines) - detected_month_days)
    new_candidate_deadlines = sorted(detected_month_days - set(current_deadlines))

    if not candidates:
        status = "no-date-candidates"
        confidence = "low"
        recommended_action = "watch"
    elif matched_deadlines and not new_candidate_deadlines:
        status = "matched"
        confidence = "high"
        recommended_action = "none"
    elif matched_deadlines and new_candidate_deadlines:
        status = "partial-match"
        confidence = "medium"
        recommended_action = "watch"
    else:
        status = "mismatch"
        confidence = "medium" if len(detected_month_days) <= 3 else "low"
        recommended_action = "review" if confidence == "medium" else "watch"

    return {
        "status": status,
        "confidence": confidence,
        "recommendedAction": recommended_action,
        "currentDeadlines": current_deadlines,
        "detectedDeadlines": detected_deadlines,
        "matchedDeadlines": matched_deadlines,
        "missingCurrentDeadlines": missing_current_deadlines,
        "newCandidateDeadlines": new_candidate_deadlines,
        "candidateSources": candidates[:12],
    }


def extract_date_candidates(evidence: list[dict[str, Any]]) -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()

    for item in evidence:
        if item.get("statusCategory") != "ok":
            continue

        for snippet in item.get("snippets", []):
            for raw_date, month_day in parse_month_day_candidates(snippet):
                key = (item["url"], raw_date, month_day)
                if key in seen:
                    continue

                seen.add(key)
                candidates.append(
                    {
                        "monthDay": month_day,
                        "rawDate": raw_date,
                        "source": item["source"],
                        "url": item["url"],
                        "snippet": snippet,
                    }
                )

    return candidates


def parse_month_day_candidates(text: str) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    month_name_pattern = re.compile(
        r"\b("
        r"Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|"
        r"Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
        r")\.?\s+(\d{1,2})(?:,\s*\d{4})?\b",
        re.I,
    )
    numeric_pattern = re.compile(r"\b(\d{1,2})/(\d{1,2})/(?:\d{2}|\d{4})\b")
    iso_pattern = re.compile(r"\b20\d{2}-(\d{2})-(\d{2})\b")

    for match in month_name_pattern.finditer(text):
        month = MONTHS.get(match.group(1).lower().rstrip("."))
        day = int(match.group(2))
        if month and is_valid_month_day(month, day):
            candidates.append((match.group(0), f"{month}-{day:02d}"))

    for match in numeric_pattern.finditer(text):
        month = int(match.group(1))
        day = int(match.group(2))
        if is_valid_month_day(f"{month:02d}", day):
            candidates.append((match.group(0), f"{month:02d}-{day:02d}"))

    for match in iso_pattern.finditer(text):
        month = int(match.group(1))
        day = int(match.group(2))
        if is_valid_month_day(f"{month:02d}", day):
            candidates.append((match.group(0), f"{month:02d}-{day:02d}"))

    return candidates


def is_valid_month_day(month: str, day: int) -> bool:
    month_number = int(month)
    month_lengths = {
        1: 31,
        2: 29,
        3: 31,
        4: 30,
        5: 31,
        6: 30,
        7: 31,
        8: 31,
        9: 30,
        10: 31,
        11: 30,
        12: 31,
    }
    return 1 <= month_number <= 12 and 1 <= day <= month_lengths[month_number]


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup.get_text(" ", strip=True)


if __name__ == "__main__":
    main()
