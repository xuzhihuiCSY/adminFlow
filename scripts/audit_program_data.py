from __future__ import annotations

import argparse
import re
from collections import Counter
from typing import Any

import requests
import urllib3
from bs4 import BeautifulSoup
from urllib3.exceptions import InsecureRequestWarning

from utils import DATA_DIR, is_http_url, read_json, truncate, utc_now, write_json

PROGRAMS_PATH = DATA_DIR / "programs.json"
WINDOWS_PATH = DATA_DIR / "application-windows.json"
REPORT_PATH = DATA_DIR / "program-audit-report.json"
OVERRIDES_PATH = DATA_DIR / "link-overrides.json"
CATALOG_META_PATH = DATA_DIR / "catalog-meta.json"

TIMEOUT_SECONDS = 12
PROTECTED_STATUSES = {401, 403, 429}
DEADLINE_LINK_KINDS = ("program", "admission")
MAX_EVIDENCE_PER_PROGRAM = 6
DEADLINE_POSITIVE_TERMS = (
    "deadline",
    "due",
    "closes",
    "close",
    "apply by",
    "last day to apply",
)
NON_APPLICATION_DATE_TERMS = (
    "admitted",
    "after this deadline",
    "arts supplement",
    "candidate's reply",
    "classes begin",
    "copyright",
    "decision notification",
    "decision release",
    "engineering programs",
    "deposit",
    "document deadline",
    "documents deadline",
    "duolingo",
    "fafsa",
    "financial aid",
    "fellowship",
    "gmat",
    "gre",
    "housing",
    "ielts",
    "intent to enroll",
    "last modified",
    "last updated",
    "national deadline",
    "notification",
    "open house",
    "orientation",
    "phd applicants",
    "reply date",
    "scholarship",
    "test completed",
    "toefl",
    "transcript",
    "veterinary nursing",
)
SOFT_NON_APPLICATION_DATE_TERMS = (
    "available",
    "begins",
    "opening",
    "opens",
)
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 AdmitFlow data auditor (+https://admit-flow.com)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def main() -> None:
    args = parse_args()
    programs = read_json(PROGRAMS_PATH)
    application_windows = read_json(WINDOWS_PATH)
    link_overrides = load_link_overrides()
    previous_report = read_json(REPORT_PATH) if REPORT_PATH.exists() else None
    selected_program_ids = select_program_ids(programs, previous_report, args)
    audit_mode = "program-id" if args.program_id else args.mode

    program_audits = {
        audit["id"]: audit
        for audit in (previous_report or {}).get("programs", [])
        if isinstance(audit, dict) and audit.get("id")
    }
    audited_program_ids: list[str] = []
    for program in programs:
        if selected_program_ids is not None and program["id"] not in selected_program_ids:
            continue

        current_windows = application_windows.get(program["id"], [])
        link_audit = audit_program_links(program, link_overrides, args.use_browser_fallback)
        evidence = collect_program_deadline_evidence(program)
        program_audits[program["id"]] = build_program_audit(program, current_windows, link_audit, evidence)
        audited_program_ids.append(program["id"])

    ordered_program_audits = [
        program_audits[program["id"]]
        for program in programs
        if program["id"] in program_audits
    ]
    link_results = flatten_program_link_results(ordered_program_audits)
    unique_link_results = summarize_unique_link_results(link_results)
    broken_links = [result for result in unique_link_results if result["statusCategory"] == "broken"]
    protected_links = [result for result in unique_link_results if result["statusCategory"] == "protected"]
    verified_protected_links = [
        result for result in unique_link_results if result["statusCategory"] == "protected-valid"
    ]
    programs_with_evidence = [audit for audit in ordered_program_audits if audit["deadlineEvidence"]]
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
        for audit in ordered_program_audits
        if audit["deadlineComparison"]["recommendedAction"] == "review"
    ]
    programs_missing_evidence = [
        {
            "id": audit["id"],
            "school": audit["school"],
            "program": audit["program"],
        }
        for audit in ordered_program_audits
        if not audit["deadlineEvidence"]
    ]

    report = {
        "lastChecked": utc_now(),
        "auditMode": audit_mode,
        "auditedPrograms": audited_program_ids,
        "summary": {
            "programsChecked": len(ordered_program_audits),
            "programsAuditedThisRun": len(audited_program_ids),
            "uniqueLinksChecked": len(unique_link_results),
            "programLinkChecks": len(link_results),
            "okLinks": len([result for result in unique_link_results if result["statusCategory"] == "ok"]),
            "verifiedProtectedLinks": len(verified_protected_links),
            "protectedOrRateLimitedLinks": len(protected_links),
            "brokenLinks": len(broken_links),
            "programsWithDeadlineEvidence": len(programs_with_evidence),
            "programsMissingDeadlineEvidence": len(programs_missing_evidence),
            "programsNeedingDeadlineReview": len(programs_needing_deadline_review),
        },
        "linkAudit": {
            "brokenLinks": broken_links,
            "protectedOrRateLimitedLinks": protected_links,
            "verifiedProtectedLinks": verified_protected_links,
        },
        "deadlineAudit": {
            "note": (
                "Deadline evidence is extracted from public program and admission pages for human review. "
                "It is not automatically written to application-windows.json."
            ),
            "programsMissingEvidence": programs_missing_evidence,
            "programsNeedingReview": programs_needing_deadline_review,
        },
        "programs": ordered_program_audits,
    }
    write_json(REPORT_PATH, report)
    write_catalog_meta(report)

    print(
        f"Checked {len(unique_link_results)} unique links across {len(link_results)} program link checks: "
        f"{len(broken_links)} broken, {len(protected_links)} protected/rate-limited, "
        f"{len(verified_protected_links)} verified protected."
    )
    print(f"Audited {len(audited_program_ids)} programs this run using mode: {audit_mode}.")
    print(f"Collected deadline evidence for {len(programs_with_evidence)} of {len(programs)} programs.")
    print(f"Flagged {len(programs_needing_deadline_review)} programs for deadline review.")


def write_catalog_meta(report: dict[str, Any]) -> None:
    summary = report["summary"]

    write_json(
        CATALOG_META_PATH,
        {
            "lastVerified": report["lastChecked"],
            "sourceSummary": "Official program, admissions, international student, and application pages are checked where available.",
            "summary": {
                "programsChecked": summary["programsChecked"],
                "brokenLinks": summary["brokenLinks"],
                "protectedOrRateLimitedLinks": summary["protectedOrRateLimitedLinks"],
                "verifiedProtectedLinks": summary.get("verifiedProtectedLinks", 0),
                "programsNeedingDeadlineReview": summary["programsNeedingDeadlineReview"],
            },
        },
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit AdmitFlow program links and deadline evidence")
    parser.add_argument(
        "--mode",
        choices=["all", "issues"],
        default="all",
        help="Audit every program, or only programs that were problematic in the previous report.",
    )
    parser.add_argument(
        "--program-id",
        action="append",
        default=[],
        help="Audit only the given program id. Can be passed multiple times.",
    )
    parser.add_argument(
        "--use-browser-fallback",
        action="store_true",
        help="Try a Playwright browser check for protected links when Playwright is installed.",
    )
    return parser.parse_args()


def select_program_ids(
    programs: list[dict[str, Any]],
    previous_report: dict[str, Any] | None,
    args: argparse.Namespace,
) -> set[str] | None:
    if args.program_id:
        known_ids = {program["id"] for program in programs}
        requested_ids = set(args.program_id)
        unknown_ids = sorted(requested_ids - known_ids)
        if unknown_ids:
            raise SystemExit(f"Unknown program id(s): {', '.join(unknown_ids)}")
        return requested_ids

    if args.mode == "all":
        return None

    if not previous_report:
        raise SystemExit("No previous data/program-audit-report.json found. Run with --mode all first.")

    issue_ids = collect_issue_program_ids(previous_report)
    if not issue_ids:
        print("No issue programs found in previous report.")

    return issue_ids


def collect_issue_program_ids(report: dict[str, Any]) -> set[str]:
    issue_ids: set[str] = set()

    for program in report.get("programs", []):
        if not isinstance(program, dict):
            continue

        if program.get("issueReasons") or has_legacy_issue(program):
            issue_ids.add(program["id"])

    return issue_ids


def has_legacy_issue(program: dict[str, Any]) -> bool:
    has_link_issue = any(
        link.get("statusCategory") in {"broken", "protected", "invalid"}
        for link in (program.get("links") or {}).values()
        if isinstance(link, dict)
    )
    needs_deadline_review = (
        (program.get("deadlineComparison") or {}).get("recommendedAction") == "review"
    )
    return has_link_issue or needs_deadline_review


def load_link_overrides() -> dict[str, dict[str, Any]]:
    if not OVERRIDES_PATH.exists():
        return {}

    data = read_json(OVERRIDES_PATH)
    overrides: dict[str, dict[str, Any]] = {}

    for item in data.get("protectedValidLinks", []):
        if not isinstance(item, dict) or not is_http_url(item.get("url")):
            continue
        overrides[item["url"]] = item

    return overrides


def audit_program_links(
    program: dict[str, Any],
    link_overrides: dict[str, dict[str, Any]],
    use_browser_fallback: bool,
) -> dict[str, dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}

    for kind, url in (program.get("links") or {}).items():
        if not is_http_url(url):
            results[kind] = {
                "url": url,
                "status": None,
                "statusCategory": "invalid",
                "finalUrl": url,
                "error": "Invalid or missing HTTP URL",
            }
            continue

        source = f"{program['id']}:{kind}"
        results[kind] = check_link(url, source, link_overrides, use_browser_fallback)

    return results


def check_link(
    url: str,
    source: str,
    link_overrides: dict[str, dict[str, Any]],
    use_browser_fallback: bool,
) -> dict[str, Any]:
    head_result = request_url(url, "HEAD")

    if head_result["statusCategory"] == "ok":
        return {"url": url, "source": source, **strip_response_text(head_result)}

    get_result = request_url(url, "GET")
    if get_result["statusCategory"] == "protected":
        override = get_verified_protected_override(url, source, link_overrides)
        if override:
            return {
                "url": url,
                "source": source,
                **strip_response_text(mark_verified_protected(get_result, override)),
            }

        if use_browser_fallback:
            browser_result = check_link_with_browser(url)
            if browser_result:
                return {
                    "url": url,
                    "source": source,
                    **strip_response_text(browser_result),
                }

    return {"url": url, "source": source, **strip_response_text(get_result)}


def get_verified_protected_override(
    url: str,
    source: str,
    link_overrides: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    override = link_overrides.get(url)
    if not override:
        return None

    sources = override.get("sources") or []
    if sources and source not in sources:
        return None

    return override


def mark_verified_protected(result: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    return {
        **result,
        "ok": True,
        "statusCategory": "protected-valid",
        "error": None,
        "verification": {
            "method": "manual-override",
            "verifiedAt": override.get("verifiedAt"),
            "reason": override.get("reason"),
        },
    }


def check_link_with_browser(url: str) -> dict[str, Any] | None:
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            response = page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT_SECONDS * 1000)
            final_url = page.url
            browser.close()

        if response and 200 <= response.status < 400:
            return {
                "ok": True,
                "status": response.status,
                "statusCategory": "protected-valid",
                "finalUrl": final_url,
                "error": None,
                "text": "",
                "verification": {
                    "method": "browser-fallback",
                    "verifiedAt": utc_now(),
                    "reason": "Protected link opened successfully in a browser check.",
                },
            }
    except PlaywrightError:
        return None

    return None


def build_program_audit(
    program: dict[str, Any],
    current_windows: list[dict[str, Any]],
    link_audit: dict[str, dict[str, Any]],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    deadline_comparison = compare_deadline_candidates(current_windows, evidence)

    return {
        "id": program["id"],
        "school": program["school"],
        "program": program["program"],
        "currentApplicationWindows": current_windows,
        "links": link_audit,
        "deadlineEvidence": evidence,
        "deadlineComparison": deadline_comparison,
        "issueReasons": get_program_issue_reasons(link_audit, evidence, deadline_comparison),
    }


def flatten_program_link_results(program_audits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for audit in program_audits:
        for kind, link in audit["links"].items():
            results.append(
                {
                    **link,
                    "programId": audit["id"],
                    "school": audit["school"],
                    "program": audit["program"],
                    "kind": kind,
                }
            )

    return results


def summarize_unique_link_results(link_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_url: dict[str, dict[str, Any]] = {}

    for result in link_results:
        url = result["url"]
        current = by_url.get(url)
        source = f"{result['programId']}:{result['kind']}"

        if not current:
            by_url[url] = {
                "url": url,
                "sources": [source],
                "status": result["status"],
                "statusCategory": result["statusCategory"],
                "finalUrl": result["finalUrl"],
                "error": result["error"],
                "verification": result.get("verification"),
            }
            continue

        current["sources"].append(source)
        if status_priority(result["statusCategory"]) > status_priority(current["statusCategory"]):
            current.update(
                {
                    "status": result["status"],
                    "statusCategory": result["statusCategory"],
                    "finalUrl": result["finalUrl"],
                    "error": result["error"],
                    "verification": result.get("verification"),
                }
            )

    return sorted(by_url.values(), key=lambda result: result["url"])


def strip_response_text(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": result["ok"],
        "status": result["status"],
        "statusCategory": result["statusCategory"],
        "finalUrl": result["finalUrl"],
        "error": result["error"],
        "verification": result.get("verification"),
    }


def status_priority(status_category: str) -> int:
    return {
        "ok": 0,
        "protected-valid": 0,
        "protected": 1,
        "invalid": 2,
        "broken": 3,
    }.get(status_category, 3)


def get_program_issue_reasons(
    link_audit: dict[str, dict[str, Any]],
    evidence: list[dict[str, Any]],
    deadline_comparison: dict[str, Any],
) -> list[str]:
    reasons: list[str] = []

    for kind, link in link_audit.items():
        status_category = link.get("statusCategory")
        if status_category in {"broken", "protected", "invalid"}:
            reasons.append(f"{kind}-link-{status_category}")

    if deadline_comparison.get("recommendedAction") == "review":
        reasons.append("deadline-review")

    return reasons


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
        return response_to_result(send_request(url, method), method)
    except requests.exceptions.SSLError as error:
        if "CERTIFICATE_VERIFY_FAILED" not in str(error):
            return request_error_result(url, error)

        urllib3.disable_warnings(InsecureRequestWarning)
        try:
            result = response_to_result(send_request(url, method, verify=False), method)
            result["error"] = "TLS certificate verification failed; retried without verification."
            return result
        except requests.RequestException as retry_error:
            return request_error_result(url, retry_error)
    except requests.RequestException as error:
        return request_error_result(url, error)


def send_request(url: str, method: str, verify: bool = True) -> requests.Response:
    return requests.request(
        method,
        url,
        headers=HEADERS,
        allow_redirects=True,
        timeout=TIMEOUT_SECONDS,
        verify=verify,
    )


def response_to_result(response: requests.Response, method: str) -> dict[str, Any]:
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


def request_error_result(url: str, error: requests.RequestException) -> dict[str, Any]:
    return {
        "ok": False,
        "status": None,
        "statusCategory": "broken",
        "finalUrl": url,
        "error": str(error),
        "text": "",
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
                if not is_application_deadline_candidate(snippet, raw_date):
                    continue

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


def is_application_deadline_candidate(snippet: str, raw_date: str) -> bool:
    normalized_snippet = re.sub(r"\s+", " ", snippet).lower()
    raw = raw_date.lower()
    date_index = normalized_snippet.find(raw)
    if date_index < 0:
        return False

    positive_start = max(0, date_index - 60)
    positive_end = min(len(normalized_snippet), date_index + len(raw) + 60)
    negative_start = max(0, date_index - 60)
    negative_end = min(len(normalized_snippet), date_index + len(raw) + 60)
    positive_context = normalized_snippet[positive_start:positive_end]
    negative_context = normalized_snippet[negative_start:negative_end]

    has_local_positive = any(term in negative_context for term in DEADLINE_POSITIVE_TERMS)

    if any(term in negative_context for term in NON_APPLICATION_DATE_TERMS):
        return False

    if not has_local_positive and any(term in negative_context for term in SOFT_NON_APPLICATION_DATE_TERMS):
        return False

    return any(term in positive_context for term in DEADLINE_POSITIVE_TERMS)


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
