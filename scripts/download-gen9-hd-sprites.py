#!/usr/bin/env python3
"""
Download HD WebP sprites for Gen 9 Pokemon (IDs 924-1025) that are missing
from assets/Pokemon/pokemondb_hd_alt2/.

Source: PokeAPI official-artwork (1000×1000 RGBA PNG, hosted on GitHub raw).
Output: 630×630 RGBA WebP at the exact path/filename the game expects.

Usage:
  python3 scripts/download-gen9-hd-sprites.py            # download missing
  python3 scripts/download-gen9-hd-sprites.py --force    # re-download all
  python3 scripts/download-gen9-hd-sprites.py --dry-run  # list only

After running, hard-refresh the game — HD sprites should load for all the
previously-missing Gen 9 Pokemon (fidough → hydrapple).
"""

import argparse
import io
import os
import sys
import time
import urllib.request

try:
    from PIL import Image
except ImportError:
    sys.exit("PIL/Pillow is required: pip install Pillow")

# Same map used by game.js POKE_IDS — only Gen 9 slugs (IDs 924-1025).
# Slugs match the game's POKE_IDS keys exactly (hyphenated where canonical).
GEN9_SLUGS = {
    924: 'fidough',         925: 'dachsbun',        926: 'smoliv',
    927: 'dolliv',          928: 'arboliva',        929: 'squawkabilly',
    930: 'nacli',           931: 'naclstack',       932: 'garganacl',
    933: 'charcadet',       934: 'armarouge',       935: 'ceruledge',
    936: 'tadbulb',         937: 'bellibolt',       938: 'wattrel',
    939: 'kilowattrel',     940: 'maschiff',        941: 'mabosstiff',
    942: 'shroodle',        943: 'grafaiai',        944: 'bramblin',
    945: 'brambleghast',    946: 'toedscool',       947: 'toedscruel',
    948: 'klawf',           949: 'capsakid',        950: 'scovillain',
    951: 'rellor',          952: 'rabsca',          953: 'flittle',
    954: 'espathra',        955: 'tinkatink',       956: 'tinkatuff',
    957: 'tinkaton',        958: 'wiglett',         959: 'wugtrio',
    960: 'bombirdier',      961: 'finizen',         962: 'palafin',
    963: 'varoom',          964: 'revavroom',       965: 'cyclizar',
    966: 'orthworm',        967: 'glimmet',         968: 'glimmora',
    969: 'greavard',        970: 'houndstone',      971: 'flamigo',
    972: 'cetoddle',        973: 'cetitan',         974: 'veluza',
    975: 'dondozo',         976: 'tatsugiri',       977: 'annihilape',
    978: 'clodsire',        979: 'farigiraf',       980: 'dudunsparce',
    981: 'kingambit',       982: 'great-tusk',      983: 'scream-tail',
    984: 'brute-bonnet',    985: 'flutter-mane',    986: 'slither-wing',
    987: 'sandy-shocks',    988: 'iron-treads',     989: 'iron-bundle',
    990: 'iron-hands',      991: 'iron-jugulis',    992: 'iron-moth',
    993: 'iron-thorns',     994: 'frigibax',        995: 'arctibax',
    996: 'baxcalibur',      997: 'gimmighoul',      998: 'gholdengo',
    999: 'wo-chien',        1000: 'chien-pao',      1001: 'ting-lu',
    1002: 'chi-yu',         1003: 'roaring-moon',   1004: 'iron-valiant',
    1005: 'koraidon',       1006: 'miraidon',       1007: 'walking-wake',
    1008: 'iron-leaves',    1009: 'dipplin',        1010: 'poltchageist',
    1011: 'sinistcha',      1012: 'okidogi',        1013: 'munkidori',
    1014: 'fezandipiti',    1015: 'ogerpon',        1016: 'gouging-fire',
    1017: 'raging-bolt',    1018: 'iron-boulder',   1019: 'iron-crown',
    1020: 'terapagos',      1021: 'pecharunt',      1022: 'ursaluna-bloodmoon',
    1023: 'bloodmoon-ursaluna',  1024: 'archaludon',  1025: 'hydrapple',
}

# PokeAPI official-artwork — 1000×1000 RGBA PNGs, GitHub-hosted (no rate limit issues)
ARTWORK_URL = (
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/'
    'sprites/pokemon/other/official-artwork/{id}.png'
)

# Filename convention to MATCH the game's expectation in poke-sprite-loader.js:
#   _slugToAlt2File(slug): hyphens → underscores (except nidoran-f/m → special)
def slug_to_filename(slug: str) -> str:
    if slug == 'nidoran-f':
        return 'nidoranf'
    if slug == 'nidoran-m':
        return 'nidoranm'
    return slug.replace('-', '_')


def output_path(pid: int, slug: str, out_dir: str) -> str:
    fname = f'{pid:04d}_{slug_to_filename(slug)}.webp'
    return os.path.join(out_dir, fname)


def fetch_with_retry(url: str, max_attempts: int = 3, timeout: int = 15) -> bytes:
    """Fetch URL with exponential backoff. Raises on final failure."""
    last_err = None
    for attempt in range(1, max_attempts + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Dunia-Emosi sprite-backfill/1.0 (educational kid game)'},
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status != 200:
                    raise RuntimeError(f'HTTP {resp.status}')
                return resp.read()
        except Exception as err:
            last_err = err
            if attempt < max_attempts:
                time.sleep(0.6 * attempt)  # 0.6s, 1.2s
    raise RuntimeError(f'failed after {max_attempts} attempts: {last_err}')


def process_one(pid: int, slug: str, out_dir: str, force: bool) -> tuple[str, str]:
    """Returns (status, detail). status ∈ {'ok','skip','fail'}."""
    out_path = output_path(pid, slug, out_dir)
    if os.path.exists(out_path) and not force:
        return ('skip', f'exists ({os.path.getsize(out_path)} B)')
    url = ARTWORK_URL.format(id=pid)
    try:
        raw = fetch_with_retry(url)
    except Exception as err:
        return ('fail', f'fetch failed: {err}')
    try:
        with Image.open(io.BytesIO(raw)) as src:
            src.load()
            if src.mode != 'RGBA':
                src = src.convert('RGBA')
            # Resize to 630×630 (game expects this for hpf-card layout)
            resized = src.resize((630, 630), Image.LANCZOS)
            # WebP with quality 88 — visually identical to source, ~30-50 KB typical
            resized.save(out_path, 'WEBP', quality=88, method=6)
        size = os.path.getsize(out_path)
        return ('ok', f'saved {size} B')
    except Exception as err:
        return ('fail', f'encode failed: {err}')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true',
                        help='re-download even if file exists')
    parser.add_argument('--dry-run', action='store_true',
                        help='print what would be downloaded, no network')
    parser.add_argument('--out',
                        default='assets/Pokemon/pokemondb_hd_alt2',
                        help='output directory (default: %(default)s)')
    args = parser.parse_args()

    out_dir = os.path.abspath(args.out)
    if not os.path.isdir(out_dir):
        sys.exit(f'output directory does not exist: {out_dir}')

    pending = []
    for pid, slug in sorted(GEN9_SLUGS.items()):
        if not args.force and os.path.exists(output_path(pid, slug, out_dir)):
            continue
        pending.append((pid, slug))

    print(f'Targets: {len(GEN9_SLUGS)} Gen 9 Pokemon. '
          f'Pending: {len(pending)} (use --force to overwrite).')
    if args.dry_run:
        for pid, slug in pending:
            print(f'  would fetch {pid:>4d} {slug}')
        return 0
    if not pending:
        print('Nothing to do.')
        return 0

    ok = skip = fail = 0
    for pid, slug in pending:
        status, detail = process_one(pid, slug, out_dir, args.force)
        marker = {'ok': '✓', 'skip': '·', 'fail': '✗'}[status]
        print(f'  {marker} {pid:>4d} {slug:<22s} {detail}')
        if status == 'ok':
            ok += 1
        elif status == 'skip':
            skip += 1
        else:
            fail += 1
        # Gentle rate-limit on GitHub raw (well under any documented limits)
        time.sleep(0.1)

    print(f'\nDone. ok={ok} skip={skip} fail={fail}')
    return 0 if fail == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
