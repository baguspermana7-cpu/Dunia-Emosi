#!/usr/bin/env python3
"""v56.0 B-289 — REBUILD the corrupted Gen-9 slice of assets/Pokemon/pokemondb_hd_alt2/.

The bundle's ids 0924-1025 (+564/565) were a merge of TWO numbering schemes: every id has
duplicate prefix files (e.g. 1000_chien_pao.webp AND 1000_gholdengo.webp) so content<->slug
is scrambled for the whole generation — that's why v54.31 blocklisted all of Gen 9 to the CDN.

This script makes the local bundle authoritative again:
  for each roster entry (assets/Pokemon/pokemon-db.json) with id >= 924 (+564,565):
    1. download the canonical sprite from img.pokemondb.net (HYPHENATED slug)
    2. convert to webp, save as  NNNN_<underscored-slug>.webp  (the app's naming)
    3. delete every OTHER file that shares the NNNN prefix or the slug (the scrambled dupes)
Failures are reported and leave the old files untouched for that id.

Run: python3 tools/fix-gen9-sprites.py           # do it
     python3 tools/fix-gen9-sprites.py --dry     # report only
"""
import io
import json
import os
import re
import sys
import time
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets/Pokemon/pokemondb_hd_alt2")
DB = os.path.join(ROOT, "assets/Pokemon/pokemon-db.json")
CDN = "https://img.pokemondb.net/sprites/home/normal/%s.png"
EXTRA_IDS = {564, 565}          # Tirtouga/Carracosta — mismatched per the v54.31 audit
GEN9_START = 924


def underscored(slug: str) -> str:
    return slug.replace("-", "_")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (DuniaEmosi asset fix)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main() -> None:
    dry = "--dry" in sys.argv
    roster = json.load(open(DB, encoding="utf-8"))
    targets = [e for e in roster if e["id"] >= GEN9_START or e["id"] in EXTRA_IDS]
    existing = os.listdir(DIR)
    ok, fail = 0, []
    for e in targets:
        pid, slug = e["id"], e["slug"]
        padded = "%04d" % pid
        fname = "%s_%s.webp" % (padded, underscored(slug))
        # every file that this id/slug should own after the fix
        stale = [f for f in existing
                 if f != fname and (f.startswith(padded + "_")
                                    or re.match(r"^\d{4}_%s\.webp$" % re.escape(underscored(slug)), f))]
        if dry:
            print("%s  <-  %s   (would remove: %s)" % (fname, CDN % slug, ", ".join(stale) or "-"))
            continue
        try:
            png = fetch(CDN % slug)
            im = Image.open(io.BytesIO(png)).convert("RGBA")
            im.save(os.path.join(DIR, fname), "WEBP", quality=90)
        except Exception as ex:
            fail.append((slug, str(ex)))
            print("FAIL %-24s %s" % (slug, ex))
            continue
        for f in stale:
            try:
                os.remove(os.path.join(DIR, f))
            except FileNotFoundError:
                pass
        ok += 1
        if ok % 20 == 0:
            print("  ...%d/%d" % (ok, len(targets)))
        time.sleep(0.15)          # be polite to the CDN
    print("\nrebuilt %d/%d sprites, %d failed" % (ok, len(targets), len(fail)))
    if fail:
        print("FAILED (old files left in place):")
        for s, m in fail:
            print("  %s: %s" % (s, m))
    # post-fix duplicate-prefix sanity
    from collections import Counter
    c = Counter(f[:4] for f in os.listdir(DIR) if f.endswith(".webp"))
    dups = sorted(k for k, n in c.items() if n > 1)
    print("duplicate id-prefixes remaining: %s" % (", ".join(dups) if dups else "NONE"))


if __name__ == "__main__":
    main()
