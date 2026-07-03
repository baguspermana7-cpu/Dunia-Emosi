#!/usr/bin/env python3
"""v56.0 B-289 — TOTAL Pokemon sprite/database audit ("cek total").

Cross-checks every Pokemon data source against the local HD sprite bundle:
  1. assets/Pokemon/pokemon-db.json           (PvP random-team roster)
  2. window.POKE_IDS in games/data/poke-sprite-cdn.js (shared slug->id map)
  3. POKEMON_DB entries in game.js            (index SPA battles)
Gates (exit 1 on any failure):
  A. every roster (id, slug) has its local file  NNNN_<underscored-slug>.webp
  B. NO duplicate 4-digit id-prefixes in pokemondb_hd_alt2/ (the Gen-9 corruption signature)
  C. the three data sources agree on id<->slug (no drift)
  D. every local file maps back to a roster slug (no orphan/mystery files)

Run: python3 tools/audit-pokemon-sprites.py
"""
import json
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "assets/Pokemon/pokemondb_hd_alt2")
DB = os.path.join(ROOT, "assets/Pokemon/pokemon-db.json")
CDN_JS = os.path.join(ROOT, "games/data/poke-sprite-cdn.js")
GAME_JS = os.path.join(ROOT, "game.js")


def underscored(slug: str) -> str:
    if slug == "nidoran-f":
        return "nidoranf"
    if slug == "nidoran-m":
        return "nidoranm"
    return slug.replace("-", "_")


def load_poke_ids() -> dict:
    src = open(CDN_JS, encoding="utf-8").read()
    m = re.search(r"const POKE_IDS = (\{.*?\});", src, re.S)
    return json.loads(m.group(1)) if m else {}


def load_game_db() -> dict:
    src = open(GAME_JS, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"\{id:(\d+),name:'[^']*',slug:'([a-z0-9-]+)'", src):
        out.setdefault(m.group(2), int(m.group(1)))
    return out


def main() -> None:
    roster = json.load(open(DB, encoding="utf-8"))
    poke_ids = load_poke_ids()
    game_db = load_game_db()
    files = set(f for f in os.listdir(DIR) if f.endswith(".webp"))
    errors = []

    # A — roster -> local file
    for e in roster:
        want = "%04d_%s.webp" % (e["id"], underscored(e["slug"]))
        if want not in files:
            errors.append("A missing local file: %s (id %s)" % (want, e["id"]))

    # B — duplicate id prefixes
    c = Counter(f[:4] for f in files)
    for pfx, n in sorted(c.items()):
        if n > 1:
            errors.append("B duplicate id-prefix %s: %s" %
                          (pfx, ", ".join(sorted(f for f in files if f.startswith(pfx)))))

    # C — cross-source id<->slug agreement
    roster_map = {e["slug"]: e["id"] for e in roster}
    for slug, pid in roster_map.items():
        if slug in poke_ids and poke_ids[slug] != pid:
            errors.append("C POKE_IDS drift: %s roster=%s cdnjs=%s" % (slug, pid, poke_ids[slug]))
        if slug in game_db and game_db[slug] != pid:
            errors.append("C game.js drift: %s roster=%s gamejs=%s" % (slug, pid, game_db[slug]))
    for slug in poke_ids:
        if slug not in roster_map:
            errors.append("C POKE_IDS orphan slug (not in roster): %s" % slug)

    # D — local files map back to a roster entry
    valid = set("%04d_%s.webp" % (e["id"], underscored(e["slug"])) for e in roster)
    for f in sorted(files - valid):
        errors.append("D orphan local file: %s" % f)

    print("roster=%d  POKE_IDS=%d  game.js=%d  local files=%d" %
          (len(roster), len(poke_ids), len(game_db), len(files)))
    if errors:
        print("\n%d FAILURES:" % len(errors))
        for e in errors[:80]:
            print("  " + e)
        if len(errors) > 80:
            print("  ... and %d more" % (len(errors) - 80))
        sys.exit(1)
    print("OK — all rosters consistent, every entry has exactly one correct local sprite")


if __name__ == "__main__":
    main()
