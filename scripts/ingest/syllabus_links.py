"""
Syllabus link ingest.

Parses an HTML snapshot of the Stern syllabilist page (e.g.
https://web-apps-shib.stern.nyu.edu/syllabi/syllabilist/g/fa26) and writes
the per-course syllabus URL into public.courses.syllabus_url.

The page is Shibboleth-protected, so the ingest can't fetch it. Workflow:

    1. Log into NYU in your browser, visit the syllabilist URL.
    2. File -> Save Page As -> scripts/ingest/data/<term>_syllabi.html
    3. Run this script.

Each <tr> on the page looks like:

    <tr>
      <td><A id="ACCT-GB.2103.M1">ACCT-GB.2103.M1</A></td>
      <td><a href="https://web-apps-shib.stern.nyu.edu/syllabi/get_syllabus/ACCT-GB.2103/M1/1268"
             target="_BLANK">Financial Statement Analysis</a></td>
      <td>Accounting</td>
      <td>Gode</td>
      <td>Submitted</td>
    </tr>

We extract (subject, catalog, section) from col 1 and the href from col 2,
then PATCH each matching row in public.courses (matched on the same triple).

Usage:
    python syllabus_links.py --html scripts/ingest/data/fa26_syllabi.html --dry-run
    python syllabus_links.py --html scripts/ingest/data/fa26_syllabi.html
    python syllabus_links.py --html ... --sql-out fa26_syllabus_links.sql

For Spring 2027: same script, new HTML snapshot.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


# subject = uppercase letters/digits, dash, uppercase letters (e.g. ACCT-GB, COR1-GB)
# catalog = digits
# section = alphanumerics (M1, M2, 01, V1, ...)
COURSE_ID_RE = re.compile(r"^([A-Z][A-Z0-9]+-[A-Z]+)\.(\d+)\.([A-Z0-9]+)$")


# ---- HTML parsing -----------------------------------------------------

class SyllabusListParser(HTMLParser):
    """Walks the syllabilist table and yields (subject, catalog, section, url) tuples.

    The page nests an <a id="..."> inside col-1 <td> and an <a href="..."> inside
    col-2 <td>. We watch <tr>/<td>/<a> nesting and capture the col-1 text plus the
    col-2 href, emitting one record per <tr>.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.records: list[dict[str, str]] = []

        self._in_tr = False
        self._td_index = -1            # 0-based index of <td> within current <tr>
        self._in_a = False
        self._cur_a_href: str | None = None
        self._cur_a_text_parts: list[str] = []

        self._cur_course_id: str | None = None
        self._cur_url: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_dict = {k.lower(): v for k, v in attrs}
        if tag == "tr":
            self._in_tr = True
            self._td_index = -1
            self._cur_course_id = None
            self._cur_url = None
        elif tag == "td" and self._in_tr:
            self._td_index += 1
        elif tag == "a" and self._in_tr:
            self._in_a = True
            self._cur_a_href = attr_dict.get("href")
            self._cur_a_text_parts = []

    def handle_data(self, data: str) -> None:
        if self._in_a:
            self._cur_a_text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._in_a:
            text = "".join(self._cur_a_text_parts).strip()
            href = self._cur_a_href
            if self._td_index == 0 and COURSE_ID_RE.match(text):
                self._cur_course_id = text
            elif self._td_index == 1 and href:
                self._cur_url = href
            self._in_a = False
            self._cur_a_href = None
            self._cur_a_text_parts = []
        elif tag == "tr" and self._in_tr:
            if self._cur_course_id and self._cur_url:
                m = COURSE_ID_RE.match(self._cur_course_id)
                if m:
                    self.records.append({
                        "subject":      m.group(1),
                        "catalog":      m.group(2),
                        "section":      m.group(3),
                        "syllabus_url": self._cur_url,
                    })
            self._in_tr = False
            self._td_index = -1


def parse_html(html_path: Path) -> list[dict[str, str]]:
    text = html_path.read_text(encoding="utf-8", errors="replace")
    p = SyllabusListParser()
    p.feed(text)
    p.close()
    return p.records


# ---- Output modes -----------------------------------------------------

def summarize(records: list[dict[str, str]]) -> None:
    print(f"\nParsed {len(records)} (subject, catalog, section, url) tuples.")
    by_subject = Counter(r["subject"] for r in records)
    print("\nBy subject:")
    for subj, n in by_subject.most_common():
        print(f"  {subj:<10} {n}")


def sql_literal(v: Any) -> str:
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def emit_sql(records: list[dict[str, str]], out_path: Path) -> None:
    """Write one UPDATE per record. Rows that don't match are no-ops."""
    lines = [
        "-- Auto-generated by scripts/ingest/syllabus_links.py - do not hand-edit.",
    ]
    for r in records:
        lines.append(
            "UPDATE public.courses SET syllabus_url = "
            f"{sql_literal(r['syllabus_url'])} WHERE subject = "
            f"{sql_literal(r['subject'])} AND catalog = "
            f"{sql_literal(r['catalog'])} AND section = "
            f"{sql_literal(r['section'])};"
        )
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote {len(records)} UPDATE statements to {out_path}")


def patch_via_supabase(records: list[dict[str, str]]) -> None:
    """PATCH each row via PostgREST. Reports matched vs. unmatched counts.

    Uses stdlib urllib to avoid the supabase-py dependency chain
    (matches the approach in fall_2026.py).
    """
    import urllib.error
    import urllib.parse
    import urllib.request

    try:
        from dotenv import load_dotenv  # type: ignore
    except ImportError:
        sys.exit(
            "Missing deps. From scripts/ingest/ run:\n"
            "    python -m pip install -r requirements.txt"
        )

    here = Path(__file__).parent
    load_dotenv(here / ".env")
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit(
            "Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "in scripts/ingest/.env (see README.md)."
        )

    base = f"{url.rstrip('/')}/rest/v1/courses"
    matched = 0
    unmatched: list[str] = []

    for r in records:
        qs = urllib.parse.urlencode({
            "subject": f"eq.{r['subject']}",
            "catalog": f"eq.{r['catalog']}",
            "section": f"eq.{r['section']}",
        })
        endpoint = f"{base}?{qs}"
        payload = json.dumps({"syllabus_url": r["syllabus_url"]}).encode("utf-8")

        req = urllib.request.Request(
            endpoint,
            data=payload,
            method="PATCH",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            },
        )
        try:
            with urllib.request.urlopen(req) as resp:
                body = json.loads(resp.read().decode("utf-8") or "[]")
                if body:
                    matched += 1
                else:
                    unmatched.append(f"{r['subject']}.{r['catalog']}.{r['section']}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            sys.exit(
                f"\nPATCH failed for {r['subject']}.{r['catalog']}.{r['section']} "
                f"(HTTP {e.code}): {err_body}"
            )

    print(f"\nPatched {matched}/{len(records)} courses.")
    if unmatched:
        print(f"\n{len(unmatched)} syllabilist entries had no matching course row "
              f"(course was dropped, section renamed, etc.):")
        for cid in unmatched[:20]:
            print(f"  {cid}")
        if len(unmatched) > 20:
            print(f"  ... +{len(unmatched) - 20} more")


# ---- Entrypoint -------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Syllabus link ingest.")
    parser.add_argument(
        "--html",
        default=str(Path(__file__).parent / "data" / "fa26_syllabi.html"),
        help="Path to the saved syllabilist HTML "
             "(default: scripts/ingest/data/fa26_syllabi.html).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse and summarize, but don't write anywhere.",
    )
    parser.add_argument(
        "--sql-out", metavar="FILE",
        help="Emit UPDATE statements to FILE instead of patching directly.",
    )
    args = parser.parse_args()

    html_path = Path(args.html)
    if not html_path.exists():
        sys.exit(f"HTML not found: {html_path}")

    print(f"Reading {html_path}")
    records = parse_html(html_path)
    summarize(records)

    if args.dry_run:
        print("\n(dry-run - no writes)")
        return

    if args.sql_out:
        emit_sql(records, Path(args.sql_out))
        return

    patch_via_supabase(records)


if __name__ == "__main__":
    main()
