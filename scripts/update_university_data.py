from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from utils import DATA_DIR, is_http_url, normalize_name, read_json, today_iso, utc_now, write_json

CWUR_URL = "https://cwur.org/2026.php"
CWUR_BASE_URL = "https://cwur.org/"

SCHOOL_ALIASES = {
    "MIT": "Massachusetts Institute of Technology",
    "UC Berkeley": "University of California, Berkeley",
    "UCLA": "University of California, Los Angeles",
    "UC Irvine": "University of California, Irvine",
    "UC San Diego": "University of California, San Diego",
    "Georgia Tech": "Georgia Institute of Technology",
    "UT Austin": "University of Texas at Austin",
    "UIUC": "University of Illinois at Urbana-Champaign",
    "UW": "University of Washington",
}


def main() -> None:
    programs = read_json(DATA_DIR / "programs.json")
    schools = read_json(DATA_DIR / "schools.json")
    application_windows = read_json(DATA_DIR / "application-windows.json")
    current_rankings = read_json(DATA_DIR / "school-rankings.json")

    validation = validate_catalog(programs, schools, application_windows)
    if validation["errors"]:
        for error in validation["errors"]:
            print(f"[error] {error}")
        raise SystemExit(1)

    cwur_rows = fetch_cwur_rows(CWUR_URL)
    ranking_result = update_rankings(current_rankings, cwur_rows, programs)
    write_json(DATA_DIR / "school-rankings.json", ranking_result["rankings_payload"])

    report = {
        "lastChecked": utc_now(),
        "catalog": {
            "programs": len(programs),
            "schools": len(schools),
            "applicationWindowEntries": len(application_windows),
            "rankingEntries": len(ranking_result["rankings_payload"]["rankings"]),
        },
        "cwur": {
            "sourceUrl": CWUR_URL,
            "rowsFetched": len(cwur_rows),
            "matchedSchools": len(ranking_result["matched_schools"]),
            "unmatchedProgramSchools": ranking_result["unmatched_program_schools"],
            "updatedRankingKeys": ranking_result["updated_ranking_keys"],
        },
        "validation": validation,
    }
    write_json(DATA_DIR / "update-report.json", report)

    print(f"Catalog validated: {len(programs)} programs, {len(schools)} schools.")
    print(
        f"CWUR rows fetched: {len(cwur_rows)}; "
        f"matched program schools: {len(ranking_result['matched_schools'])}."
    )
    if ranking_result["unmatched_program_schools"]:
        print(f"Unmatched program schools: {', '.join(ranking_result['unmatched_program_schools'])}")


def validate_catalog(
    programs: list[dict[str, Any]],
    schools: dict[str, dict[str, Any]],
    application_windows: dict[str, list[dict[str, Any]]],
) -> dict[str, list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    ids: set[str] = set()
    school_names = set(schools.keys())
    used_schools: set[str] = set()

    for program in programs:
        program_id = program.get("id")
        label = program_id or "(missing id)"

        if not isinstance(program_id, str) or not program_id:
            errors.append("Program is missing a string id.")
            continue

        if program_id in ids:
            errors.append(f"Duplicate program id: {program_id}")
        ids.add(program_id)

        school = program.get("school")
        if not school or school not in school_names:
            errors.append(f"{label} references missing school profile: {school}")
        else:
            used_schools.add(school)

        if program_id not in application_windows:
            errors.append(f"{label} is missing application windows.")

        links = program.get("links") or {}
        for key in ("program", "admission", "international", "apply"):
            if not is_http_url(links.get(key)):
                errors.append(f"{label} has invalid {key} link.")

    for program_id, windows in application_windows.items():
        if program_id not in ids:
            warnings.append(f"Application windows exist for unknown program id: {program_id}")

        if not isinstance(windows, list) or not windows:
            errors.append(f"{program_id} must have at least one application window.")
            continue

        for window in windows:
            if not isinstance(window.get("intake"), str) or not window["intake"]:
                errors.append(f"{program_id} has a window without intake.")
            if window.get("opens") is not None and not is_month_day(window.get("opens")):
                errors.append(f"{program_id} has invalid opens value: {window.get('opens')}")
            if not is_month_day(window.get("deadline")):
                errors.append(f"{program_id} has invalid deadline value: {window.get('deadline')}")

    for school, profile in schools.items():
        if school not in used_schools:
            warnings.append(f"School profile is not used by any program: {school}")
        if profile.get("schoolType") not in {"Public", "Private"}:
            errors.append(f"{school} has invalid schoolType: {profile.get('schoolType')}")
        if not is_http_url(profile.get("sourceUrl")):
            errors.append(f"{school} has invalid sourceUrl.")

    return {"errors": errors, "warnings": warnings}


def is_month_day(value: Any) -> bool:
    if not isinstance(value, str) or re.match(r"^\d{2}-\d{2}$", value) is None:
        return False

    month, day = [int(part) for part in value.split("-")]
    if month < 1 or month > 12 or day < 1 or day > 31:
        return False

    month_lengths = {1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31}
    return day <= month_lengths[month]


def fetch_cwur_rows(url: str) -> list[dict[str, Any]]:
    response = requests.get(
        url,
        headers={
            "User-Agent": "AdmitFlow data updater (+https://admit-flow.com)",
            "Accept": "text/html,application/xhtml+xml",
        },
        timeout=20,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    rows: list[dict[str, Any]] = []

    for table_row in soup.select("tr"):
        cells = table_row.find_all("td")
        if len(cells) < 9:
            continue

        institution_link = cells[1].find("a")
        if not institution_link:
            continue

        world_rank = first_number(cells[0].get_text(" ", strip=True))
        institution = institution_link.get_text(" ", strip=True)
        location = cells[2].get_text(" ", strip=True)
        national_rank = first_number(cells[3].get_text(" ", strip=True))
        score_text = cells[8].get_text(" ", strip=True)

        try:
            score = float(score_text)
        except ValueError:
            continue

        if not world_rank or location != "USA" or not national_rank:
            continue

        rows.append(
            {
                "institution": institution,
                "normalizedInstitution": normalize_name(institution),
                "worldRank": world_rank,
                "nationalRank": national_rank,
                "score": score,
                "sourceUrl": urljoin(CWUR_BASE_URL, institution_link.get("href", "")),
            }
        )

    if not rows:
        raise RuntimeError("CWUR parser did not find any USA ranking rows.")

    return rows


def update_rankings(
    current_rankings: dict[str, Any],
    cwur_rows: list[dict[str, Any]],
    programs: list[dict[str, Any]],
) -> dict[str, Any]:
    rows_by_name = {row["normalizedInstitution"]: row for row in cwur_rows}
    program_schools = sorted({program["school"] for program in programs})
    existing_entries = current_rankings.get("rankings") or {}
    updated_rankings: dict[str, dict[str, Any]] = {}
    matched_schools: list[str] = []
    unmatched_program_schools: list[str] = []
    updated_ranking_keys: list[str] = []

    for school in program_schools:
        existing = existing_entries.get(school)
        candidates = [
            existing.get("sourceInstitution") if isinstance(existing, dict) else None,
            SCHOOL_ALIASES.get(school),
            school,
        ]
        row = next((rows_by_name.get(normalize_name(candidate)) for candidate in candidates if candidate), None)

        if not row:
            unmatched_program_schools.append(school)
            if existing:
                updated_rankings[school] = existing
            continue

        next_entry = {
            "sourceInstitution": row["institution"],
            "worldRank": row["worldRank"],
            "nationalRank": row["nationalRank"],
            "score": row["score"],
            "sourceUrl": row["sourceUrl"],
        }
        updated_rankings[school] = next_entry
        matched_schools.append(school)

        if existing != next_entry:
            updated_ranking_keys.append(school)

    for school, entry in existing_entries.items():
        if school not in updated_rankings:
            updated_rankings[school] = entry

    sorted_rankings = dict(
        sorted(
            updated_rankings.items(),
            key=lambda item: (
                item[1].get("worldRank", 999999),
                item[1].get("sourceInstitution", ""),
            ),
        )
    )

    return {
        "rankings_payload": {
            "source": {
                **(current_rankings.get("source") or {}),
                "name": "Center for World University Rankings (CWUR)",
                "edition": "2026 Global 2000",
                "url": CWUR_URL,
                "country": "USA",
                "updated": today_iso(),
            },
            "rankings": sorted_rankings,
        },
        "matched_schools": matched_schools,
        "unmatched_program_schools": unmatched_program_schools,
        "updated_ranking_keys": updated_ranking_keys,
    }


def first_number(value: str) -> int | None:
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else None


if __name__ == "__main__":
    main()
