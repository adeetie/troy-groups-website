#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]

HTML_EXTS = {".html"}
CSS_EXTS = {".css"}
JS_EXTS = {".js"}

# Regexes to collect used classes/ids
RE_CLASS_ATTR = re.compile(r"class\s*=\s*\"([^\"]*)\"|class\s*=\s*'([^']*)'", re.I)
RE_ID_ATTR = re.compile(r"id\s*=\s*\"([^\"]*)\"|id\s*=\s*'([^']*)'", re.I)

# JS patterns
RE_JS_CLASSLIST = re.compile(r"classList\.(?:add|remove|toggle|contains)\(\s*(['\"])(.+?)\1\s*\)")
RE_JS_GETBYCLASS = re.compile(r"getElementsByClassName\(\s*(['\"])(.+?)\1\s*\)")
RE_JS_GETBYID = re.compile(r"getElementById\(\s*(['\"])(.+?)\1\s*\)")
RE_JS_QS = re.compile(r"querySelector(All)?\(\s*(['\"])(.+?)\2\s*\)")

# CSS token extraction
RE_SELECTOR_SPLIT = re.compile(r",")
RE_CLASS_TOKEN = re.compile(r"\\.([A-Za-z0-9_-]+)")
RE_ID_TOKEN = re.compile(r"#([A-Za-z0-9_-]+)")

KEEP_AT_RULES = ("@font-face", "@keyframes", "@-webkit-keyframes")


def collect_used_tokens() -> tuple[set[str], set[str]]:
    used_classes: set[str] = set()
    used_ids: set[str] = set()

    # HTML
    for dirpath, _, filenames in os.walk(ROOT):
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in HTML_EXTS:
                try:
                    t = p.read_text(encoding="utf-8")
                except Exception:
                    continue
                for m in RE_CLASS_ATTR.finditer(t):
                    s = (m.group(1) or m.group(2) or "").strip()
                    if not s:
                        continue
                    for c in re.split(r"\s+", s):
                        if c:
                            used_classes.add(c)
                for m in RE_ID_ATTR.finditer(t):
                    s = (m.group(1) or m.group(2) or "").strip()
                    if s:
                        used_ids.add(s)

    # JS
    for dirpath, _, filenames in os.walk(ROOT):
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in JS_EXTS:
                try:
                    t = p.read_text(encoding="utf-8")
                except Exception:
                    continue
                # classList.*('a b c') can contain multiple classes separated by space
                for m in RE_JS_CLASSLIST.finditer(t):
                    for c in re.split(r"\s+", m.group(2).strip()):
                        if c:
                            used_classes.add(c)
                for m in RE_JS_GETBYCLASS.finditer(t):
                    for c in re.split(r"\s+", m.group(2).strip()):
                        if c:
                            used_classes.add(c)
                for m in RE_JS_GETBYID.finditer(t):
                    s = m.group(2).strip()
                    if s:
                        used_ids.add(s)
                for m in RE_JS_QS.finditer(t):
                    sel = m.group(3)
                    # extract .class and #id from selectors
                    for c in RE_CLASS_TOKEN.findall(sel):
                        used_classes.add(c)
                    for i in RE_ID_TOKEN.findall(sel):
                        used_ids.add(i)
    return used_classes, used_ids


def filter_selectors(selector_text: str, used_classes: set[str], used_ids: set[str]) -> str | None:
    # Split by commas at top level (simple split is acceptable for typical CSS)
    parts = [s.strip() for s in selector_text.split(',')]
    kept: list[str] = []
    for sel in parts:
        # If selector contains no class or id, keep conservatively
        classes = set(RE_CLASS_TOKEN.findall(sel))
        ids = set(RE_ID_TOKEN.findall(sel))
        if not classes and not ids:
            kept.append(sel)
            continue
        # If any class or id in selector is used, keep
        if (classes & used_classes) or (ids & used_ids):
            kept.append(sel)
            continue
        # Otherwise, drop this selector
    if kept:
        return ", ".join(kept)
    return None


def purge_css_file(path: Path, used_classes: set[str], used_ids: set[str]) -> tuple[int, int, bool]:
    try:
        css = path.read_text(encoding="utf-8")
    except Exception:
        return 0, 0, False

    n = len(css)
    i = 0
    depth = 0
    result: list[str] = []
    changed = False

    def process_block(header: str, body: str) -> str:
        nonlocal changed
        h = header.strip()
        if any(h.startswith(k) for k in KEEP_AT_RULES):
            return header + "{" + body + "}"
        if h.startswith("@media") or h.startswith("@supports"):
            inner = purge_inner(body)
            if inner.strip():
                if inner != body:
                    changed = True
                return header + "{" + inner + "}"
            else:
                changed = True
                return ""
        # normal rule
        new_header = filter_selectors(header, used_classes, used_ids)
        if new_header:
            if new_header != header:
                changed = True
            return new_header + "{" + body + "}"
        else:
            changed = True
            return ""

    def purge_inner(s: str) -> str:
        j = 0
        d = 0
        hdr_buf: list[str] = []
        bod_buf: list[str] = []
        mode = 'sel'
        out_local: list[str] = []
        while j < len(s):
            ch = s[j]
            if ch == '{':
                d += 1
                if mode == 'sel':
                    mode = 'body'
                else:
                    bod_buf.append(ch)
                j += 1
                continue
            if ch == '}':
                if d == 1:
                    block = process_block(''.join(hdr_buf), ''.join(bod_buf))
                    if block:
                        out_local.append(block)
                    hdr_buf.clear(); bod_buf.clear(); mode = 'sel'
                    j += 1
                    d -= 1
                    continue
                if d > 1:
                    bod_buf.append(ch)
                j += 1
                if d > 0:
                    d -= 1
                continue
            if mode == 'sel':
                hdr_buf.append(ch)
            else:
                bod_buf.append(ch)
            j += 1
        return ''.join(out_local)

    purged = purge_inner(css)
    if changed:
        Path(path).write_text(purged, encoding='utf-8')
    return n, len(purged), changed


def main() -> int:
    used_classes, used_ids = collect_used_tokens()

    # Backup CSS files
    css_files: list[Path] = []
    for dirpath, _, filenames in os.walk(ROOT):
        for name in filenames:
            p = Path(dirpath) / name
            if p.suffix.lower() in CSS_EXTS:
                css_files.append(p)

    backup = ROOT / 'tools' / 'backups'
    backup.mkdir(parents=True, exist_ok=True)
    zip_path = backup / 'purge_css_backup.zip'
    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zf:
        for p in css_files:
            try:
                zf.write(p, arcname=str(p.relative_to(ROOT)))
            except Exception:
                pass

    total_before = 0
    total_after = 0
    changed_count = 0
    for p in css_files:
        b0, b1, ch = purge_css_file(p, used_classes, used_ids)
        total_before += b0
        total_after += b1
        if ch:
            changed_count += 1

    print(f"Used classes: {len(used_classes)}, ids: {len(used_ids)}")
    print(f"Processed {len(css_files)} CSS files; changed {changed_count}.")
    print(f"Bytes saved: {total_before - total_after}")
    print(f"Backup: {zip_path}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
