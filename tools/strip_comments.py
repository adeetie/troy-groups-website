#!/usr/bin/env python3
import os
import re
import sys
import time
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
EXTS = {".html", ".css", ".js"}

HTML_COMMENT_RE = re.compile(r"<!--[\s\S]*?-->")
CSS_COMMENT_RE = re.compile(r"/\*[^*]*\*+(?:[^/*][^*]*\*+)*/", re.S)


def strip_html_comments(text: str) -> str:
    return HTML_COMMENT_RE.sub("", text)


def strip_css_comments(text: str) -> str:
    return CSS_COMMENT_RE.sub("", text)


def strip_js_comments(text: str) -> str:
    out = []
    i = 0
    n = len(text)
    in_s = in_d = in_b = False
    esc = False

    while i < n:
        ch = text[i]

        # Inside string literals: single, double, or backtick
        if in_s or in_d or in_b:
            out.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            else:
                if in_s and ch == "'":
                    in_s = False
                elif in_d and ch == '"':
                    in_d = False
                elif in_b and ch == '`':
                    in_b = False
            i += 1
            continue

        # Not in a string: check for comments
        if ch == "/" and i + 1 < n:
            nxt = text[i + 1]
            # Line comment
            if nxt == "/":
                i += 2
                # skip until end of line, keep the newline
                while i < n and text[i] not in "\r\n":
                    i += 1
                # Preserve newline if present
                if i < n:
                    out.append("\n")
                    # skip \r as well
                    if text[i] == "\r" and i + 1 < n and text[i + 1] == "\n":
                        i += 2
                    else:
                        i += 1
                continue
            # Block comment
            if nxt == "*":
                i += 2
                while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                    i += 1
                i = min(i + 2, n)
                continue

        # Not a comment and not in string: handle string starts
        if ch == "'":
            in_s = True
            out.append(ch)
            i += 1
            continue
        if ch == '"':
            in_d = True
            out.append(ch)
            i += 1
            continue
        if ch == '`':
            in_b = True
            out.append(ch)
            i += 1
            continue

        # Normal char
        out.append(ch)
        i += 1

    return "".join(out)


def process_file(path: Path) -> tuple[int, int, str, bool]:
    """
    Returns (orig_bytes, new_bytes, relpath, changed)
    """
    rel = str(path.relative_to(ROOT))
    try:
        data = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # skip binary or unknown encodings
        return (0, 0, rel, False)

    orig = data
    if path.suffix == ".html":
        data = strip_html_comments(data)
    elif path.suffix == ".css":
        data = strip_css_comments(data)
    elif path.suffix == ".js":
        data = strip_js_comments(data)

    changed = data != orig
    if changed:
        path.write_text(data, encoding="utf-8")
    return (len(orig), len(data), rel, changed)


def main() -> int:
    ts = time.strftime("%Y%m%d_%H%M%S")
    backup_dir = ROOT / "tools" / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_zip = backup_dir / f"comments_backup_{ts}.zip"

    files: list[Path] = []
    for dirpath, _, filenames in os.walk(ROOT):
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in EXTS:
                files.append(p)

    # Create backup of originals
    with ZipFile(backup_zip, "w", compression=ZIP_DEFLATED) as zf:
        for p in files:
            try:
                zf.write(p, arcname=str(p.relative_to(ROOT)))
            except Exception:
                # ignore files that can't be archived
                pass

    total_before = total_after = changed_count = 0
    for p in files:
        b0, b1, rel, changed = process_file(p)
        total_before += b0
        total_after += b1
        if changed:
            changed_count += 1

    saved = total_before - total_after
    print("Comment cleanup complete.")
    print(f"Processed {len(files)} files; changed {changed_count}.")
    print(f"Bytes saved: {saved}")
    print(f"Backup created: {backup_zip}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
