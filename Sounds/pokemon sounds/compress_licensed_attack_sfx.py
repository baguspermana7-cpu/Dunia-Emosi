#!/usr/bin/env python3
"""Compress licensed local Pokemon attack SFX and map them to local Pokemon DB.

No internet download. No AI/generated voice. This script only transforms the ZIP
file supplied by the project owner.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path


THIS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = THIS_DIR.parents[1]
GAME_JS = PROJECT_ROOT / "game.js"
DEFAULT_ZIP = Path("/home/baguspermana7/Downloads/3DS - Pokemon Sun _ Moon - Miscellaneous - Attack Move Sound Effects.zip")
OUT_ROOT = THIS_DIR / "attack-move-sfx-compressed"
POKEMON_OUT_ROOT = THIS_DIR / "pokemon-sfx-by-species"
MOVE_CSV = THIS_DIR / "attack_move_sfx_manifest.csv"
MOVE_JSON = THIS_DIR / "attack_move_sfx_manifest.json"
SKIPPED_CSV = THIS_DIR / "attack_move_sfx_skipped.csv"
SKIPPED_JSON = THIS_DIR / "attack_move_sfx_skipped.json"
POKEMON_CSV = THIS_DIR / "pokemon_attack_sfx_manifest.csv"
POKEMON_JSON = THIS_DIR / "pokemon_attack_sfx_manifest.json"
MAX_BYTES = 20 * 1024

REGION_BY_GEN = {
    1: "Kanto",
    2: "Johto",
    3: "Hoenn",
    4: "Sinnoh",
    5: "Unova",
    6: "Kalos",
    7: "Alola",
    8: "Galar-Hisui",
    9: "Paldea-Kitakami-Blueberry",
}

TYPE_KEYWORDS = {
    "electric": ["volt", "thunder", "electro", "spark", "charge beam", "discharge", "zap", "catastropika"],
    "fire": ["fire", "flame", "flare", "burn", "ember", "inferno", "heat", "blast burn", "blue flare"],
    "water": ["water", "aqua", "bubble", "hydro", "surf", "scald", "brine", "dive"],
    "grass": ["leaf", "grass", "seed", "solar", "absorb", "vine", "petal", "bloom", "frenzy plant", "wood"],
    "ice": ["ice", "icy", "blizzard", "freeze", "frost", "avalanche"],
    "fighting": ["punch", "kick", "combat", "fighting", "karate", "focus", "arm thrust", "brick break", "low sweep"],
    "poison": ["poison", "acid", "sludge", "toxic", "venom", "venoshock", "baneful"],
    "ground": ["earth", "ground", "mud", "sand", "dig", "bulldoze", "magnitude"],
    "flying": ["air", "aerial", "fly", "flying", "wing", "gust", "hurricane", "brave bird", "acrobatics"],
    "psychic": ["psychic", "psy", "confusion", "mind", "teleport", "future sight", "extrasensory"],
    "bug": ["bug", "x-scissor", "fury cutter", "signal beam", "attack order", "infestation", "string"],
    "rock": ["rock", "stone", "ancient power", "power gem", "accelerock", "continental"],
    "ghost": ["ghost", "shadow", "phantom", "hex", "ominous", "astonish", "night shade"],
    "dragon": ["dragon", "draco", "outrage", "clanging", "core enforcer"],
    "dark": ["dark", "night", "bite", "crunch", "foul", "assurance", "thief", "sucker"],
    "steel": ["steel", "iron", "metal", "gyro", "flash cannon", "anchor shot", "corkscrew"],
    "fairy": ["fairy", "moon", "dazzling", "kiss", "charm", "play rough", "disarming", "twinkle"],
    "normal": ["tackle", "quick attack", "body slam", "hyper beam", "swift", "scratch", "take down", "barrage"],
}

TYPE_PREFERRED_MOVES = {
    "electric": ["Catastropika", "10 Mil Volt Thunderbolt", "Thunderbolt", "Volt Tackle", "Electro Ball", "Discharge", "Thunder Shock"],
    "fire": ["Blast Burn", "Flamethrower", "Fire Blast", "Flare Blitz", "Flame Burst", "Ember", "Heat Wave"],
    "water": ["Hydro Pump", "Surf", "Water Gun", "Aqua Tail", "Water Pulse", "Scald", "Aqua Jet"],
    "grass": ["Frenzy Plant", "Solar Beam", "Leaf Blade", "Razor Leaf", "Seed Bomb", "Vine Whip", "Absorb"],
    "ice": ["Blizzard", "Ice Beam", "Icicle Crash", "Icy Wind", "Ice Punch", "Aurora Beam"],
    "fighting": ["Close Combat", "Focus Blast", "Brick Break", "Arm Thrust 1hit", "Low Sweep", "Power-Up Punch"],
    "poison": ["Sludge Bomb", "Poison Jab", "Acid Spray", "Acid", "Toxic", "Venoshock"],
    "ground": ["Earthquake", "Earth Power", "Bulldoze", "Dig", "Mud Bomb", "Mud Shot"],
    "flying": ["Brave Bird", "Air Slash", "Aerial Ace", "Air Cutter", "Hurricane", "Wing Attack"],
    "psychic": ["Psystrike", "Psychic", "Psyshock", "Psybeam", "Confusion", "Future Sight"],
    "bug": ["Bug Buzz", "X-Scissor", "Bug Bite", "Signal Beam", "Fury Cutter", "Attack Order"],
    "rock": ["Stone Edge", "Rock Slide", "Rock Throw", "Accelerock", "Power Gem", "Ancient Power"],
    "ghost": ["Shadow Ball", "Shadow Sneak", "Hex", "Astonish", "Ominous Wind", "Night Shade"],
    "dragon": ["Draco Meteor", "Dragon Pulse", "Dragon Claw", "Outrage", "Dragon Breath", "Clanging Scales"],
    "dark": ["Dark Pulse", "Crunch", "Bite", "Night Slash", "Foul Play", "Assurance"],
    "steel": ["Flash Cannon", "Iron Head", "Iron Tail", "Metal Claw", "Gyro Ball", "Anchor Shot"],
    "fairy": ["Moonblast", "Dazzling Gleam", "Play Rough", "Draining Kiss", "Disarming Voice", "Charm"],
    "normal": ["Hyper Beam", "Quick Attack", "Body Slam", "Swift", "Tackle", "Scratch", "Take Down"],
}

SIGNATURE_BY_SLUG = {
    "pikachu": ["Catastropika", "10 Mil Volt Thunderbolt", "Thunderbolt", "Electro Ball"],
    "raichu": ["Thunderbolt", "Electro Ball", "Discharge"],
    "charizard": ["Blast Burn", "Flamethrower", "Fire Blast"],
    "charmander": ["Ember", "Flame Burst", "Flamethrower"],
    "charmeleon": ["Flamethrower", "Flame Burst", "Fire Fang"],
    "squirtle": ["Water Gun", "Aqua Jet", "Water Pulse"],
    "wartortle": ["Water Pulse", "Aqua Tail", "Water Gun"],
    "blastoise": ["Hydro Pump", "Surf", "Water Pulse"],
    "bulbasaur": ["Vine Whip", "Razor Leaf", "Absorb"],
    "ivysaur": ["Razor Leaf", "Seed Bomb", "Energy Ball"],
    "venusaur": ["Frenzy Plant", "Solar Beam", "Petal Dance"],
    "eevee": ["Extreme Evoboost", "Quick Attack", "Swift"],
    "mewtwo": ["Psystrike", "Psychic", "Psyshock"],
    "mew": ["Psychic", "Metronome", "Aura Sphere"],
    "snorlax": ["Body Slam", "Heavy Slam", "Hyper Beam"],
    "gengar": ["Shadow Ball", "Hex", "Astonish"],
    "jigglypuff": ["Disarming Voice", "Sing", "Play Rough"],
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse_pokemon_db() -> list[dict[str, object]]:
    text = GAME_JS.read_text(encoding="utf-8")
    match = re.search(r"const\s+POKEMON_DB\s*=\s*\[(.*?)\]\s*\n\s*const\s+TYPE_COLORS", text, flags=re.S)
    if not match:
        raise RuntimeError(f"Could not locate POKEMON_DB in {GAME_JS}")

    rows: list[dict[str, object]] = []
    for entry in re.finditer(r"\{([^{}]+)\}", match.group(1)):
        raw = entry.group(1)
        item: dict[str, object] = {}
        for key, quoted, number in re.findall(r"(\w+):(?:'([^']*)'|(\d+))", raw):
            item[key] = int(number) if number else quoted.replace("&#39;", "'")
        if {"id", "name", "slug", "type", "gen", "tier"}.issubset(item):
            rows.append(item)
    rows.sort(key=lambda p: int(p["id"]))
    return rows


def infer_move_type(move_name: str) -> str:
    lower = move_name.lower()
    scores: dict[str, int] = {}
    for type_name, keywords in TYPE_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                scores[type_name] = scores.get(type_name, 0) + len(kw)
    if not scores:
        return "normal"
    return max(scores.items(), key=lambda item: item[1])[0]


def clean_move_name(member_name: str) -> str:
    return Path(member_name).stem.strip()


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def encode_micro_sfx(input_path: Path, output_path: Path) -> None:
    configs = [
        ("1.15", "18k"),
        ("1.35", "20k"),
        ("0.95", "16k"),
        ("0.74", "12k"),
        ("0.58", "10k"),
    ]
    last_error: Exception | None = None
    for duration, bitrate in configs:
        fade_start = max(0.08, float(duration) - 0.12)
        filter_variants = [
            (
                "silenceremove=start_periods=1:start_duration=0.015:start_threshold=-48dB,"
                f"atrim=0:{duration},asetpts=PTS-STARTPTS,"
                f"afade=t=out:st={fade_start:.2f}:d=0.10,volume=1.15"
            ),
            f"atrim=0:{duration},asetpts=PTS-STARTPTS,afade=t=out:st={fade_start:.2f}:d=0.10,volume=1.15",
        ]
        for filters in filter_variants:
            cmd = [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(input_path),
                "-map",
                "0:a:0",
                "-vn",
                "-map_metadata",
                "-1",
                "-af",
                filters,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "libopus",
                "-b:a",
                bitrate,
                "-vbr",
                "on",
                "-compression_level",
                "10",
                "-application",
                "audio",
                str(output_path),
            ]
            try:
                subprocess.run(cmd, check=True, capture_output=True, text=True)
                size = output_path.stat().st_size
                if 1024 <= size <= MAX_BYTES:
                    return
                if size < 1024:
                    continue
                if size > MAX_BYTES:
                    continue
            except Exception as exc:  # pragma: no cover - diagnostics only
                last_error = exc

    if output_path.exists() and 0 < output_path.stat().st_size <= MAX_BYTES:
        return
    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to encode {input_path}")


def compress_zip(zip_path: Path, limit: int, overwrite: bool) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    if not zip_path.exists():
        raise FileNotFoundError(zip_path)
    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, object]] = []
    skipped: list[dict[str, object]] = []
    used_slugs: set[str] = set()
    with zipfile.ZipFile(zip_path) as zf:
        members = [m for m in zf.infolist() if not m.is_dir() and m.filename.lower().endswith((".mp3", ".wav", ".ogg"))]
        members.sort(key=lambda m: m.filename.lower())
        if limit:
            members = members[:limit]

        for index, member in enumerate(members, start=1):
            move_name = clean_move_name(member.filename)
            move_type = infer_move_type(move_name)
            base_slug = slugify(move_name)
            move_slug = base_slug
            suffix = 2
            while move_slug in used_slugs:
                move_slug = f"{base_slug}-{suffix}"
                suffix += 1
            used_slugs.add(move_slug)

            type_dir = OUT_ROOT / move_type
            type_dir.mkdir(parents=True, exist_ok=True)
            output_path = type_dir / f"{move_slug}.ogg"

            if overwrite or not output_path.exists():
                with tempfile.TemporaryDirectory() as tmp:
                    input_path = Path(tmp) / Path(member.filename).name
                    input_path.write_bytes(zf.read(member))
                    try:
                        encode_micro_sfx(input_path, output_path)
                    except Exception as exc:
                        skipped.append(
                            {
                                "move_name": move_name,
                                "source_file": member.filename,
                                "source_bytes": member.file_size,
                                "error": str(exc),
                            }
                        )
                        if output_path.exists():
                            output_path.unlink()
                        continue

            rows.append(
                {
                    "index": index,
                    "move_name": move_name,
                    "move_slug": move_slug,
                    "inferred_type": move_type,
                    "source_zip": str(zip_path),
                    "source_file": member.filename,
                    "source_bytes": member.file_size,
                    "compressed_file": output_path.relative_to(THIS_DIR).as_posix(),
                    "compressed_bytes": output_path.stat().st_size,
                    "compressed_duration_seconds": round(ffprobe_duration(output_path), 3),
                }
            )
    return rows, skipped


def write_csv_json(csv_path: Path, json_path: Path, rows: list[dict[str, object]]) -> None:
    if not rows:
        csv_path.write_text("", encoding="utf-8")
        json_path.write_text("[]\n", encoding="utf-8")
        return
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    json_path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build_indexes(move_rows: list[dict[str, object]]) -> tuple[dict[str, dict[str, object]], dict[str, list[dict[str, object]]]]:
    by_name = {str(r["move_name"]).lower(): r for r in move_rows}
    by_type: dict[str, list[dict[str, object]]] = {}
    for row in move_rows:
        by_type.setdefault(str(row["inferred_type"]), []).append(row)
    for rows in by_type.values():
        rows.sort(key=lambda r: ((" part " in str(r["move_name"]).lower()), str(r["move_name"]).lower()))
    return by_name, by_type


def find_move(candidates: list[str], by_name: dict[str, dict[str, object]]) -> dict[str, object] | None:
    for candidate in candidates:
        exact = by_name.get(candidate.lower())
        if exact:
            return exact
    for candidate in candidates:
        needle = candidate.lower()
        matches = [row for name, row in by_name.items() if needle in name]
        if matches:
            matches.sort(key=lambda r: ((" part " in str(r["move_name"]).lower()), len(str(r["move_name"]))))
            return matches[0]
    return None


def choose_move(
    pokemon: dict[str, object],
    move_rows: list[dict[str, object]],
    by_name: dict[str, dict[str, object]],
    by_type: dict[str, list[dict[str, object]]],
) -> tuple[dict[str, object], str]:
    slug = str(pokemon["slug"])
    primary_type = str(pokemon["type"])
    secondary_type = str(pokemon.get("type2", ""))

    signature = SIGNATURE_BY_SLUG.get(slug)
    if signature:
        found = find_move(signature, by_name)
        if found:
            return found, "signature"

    for type_name in [primary_type, secondary_type, "normal"]:
        if not type_name:
            continue
        preferred = TYPE_PREFERRED_MOVES.get(type_name, [])
        found = find_move(preferred, by_name)
        if found:
            return found, f"type-preferred:{type_name}"
        pool = by_type.get(type_name)
        if pool:
            digest = hashlib.sha256(f"{pokemon['id']}:{slug}:{type_name}".encode("utf-8")).hexdigest()
            return pool[int(digest[:8], 16) % len(pool)], f"type-pool:{type_name}"

    digest = hashlib.sha256(f"{pokemon['id']}:{slug}".encode("utf-8")).hexdigest()
    return move_rows[int(digest[:8], 16) % len(move_rows)], "fallback-hash"


def copy_species_sfx(pokemon: dict[str, object], move: dict[str, object], overwrite: bool) -> Path:
    gen = int(pokemon["gen"])
    region = REGION_BY_GEN.get(gen, f"Gen-{gen}")
    species_dir = POKEMON_OUT_ROOT / f"gen-{gen}-{slugify(region)}"
    species_dir.mkdir(parents=True, exist_ok=True)
    target = species_dir / f"{int(pokemon['id']):04d}_{pokemon['slug']}__{move['move_slug']}.ogg"
    source = THIS_DIR / str(move["compressed_file"])
    if overwrite or not target.exists():
        shutil.copyfile(source, target)
    size = target.stat().st_size
    if size > MAX_BYTES:
        raise RuntimeError(f"{target} is {size} bytes, above max {MAX_BYTES}")
    return target


def build_pokemon_manifest(move_rows: list[dict[str, object]], overwrite: bool) -> list[dict[str, object]]:
    pokemon_rows = parse_pokemon_db()
    by_name, by_type = build_indexes(move_rows)
    rows: list[dict[str, object]] = []
    for pokemon in pokemon_rows:
        move, reason = choose_move(pokemon, move_rows, by_name, by_type)
        species_file = copy_species_sfx(pokemon, move, overwrite)
        gen = int(pokemon["gen"])
        rows.append(
            {
                "id": int(pokemon["id"]),
                "name": str(pokemon["name"]),
                "slug": str(pokemon["slug"]),
                "generation": gen,
                "region": REGION_BY_GEN.get(gen, f"Gen-{gen}"),
                "type": str(pokemon["type"]),
                "type2": str(pokemon.get("type2", "")),
                "tier": int(pokemon.get("tier", 1)),
                "assigned_move": str(move["move_name"]),
                "assigned_move_type": str(move["inferred_type"]),
                "assignment_reason": reason,
                "sfx_file": species_file.relative_to(THIS_DIR).as_posix(),
                "sfx_bytes": species_file.stat().st_size,
                "source_move_file": str(move["compressed_file"]),
            }
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, default=DEFAULT_ZIP)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg and ffprobe are required")

    if args.overwrite:
        shutil.rmtree(OUT_ROOT, ignore_errors=True)
        shutil.rmtree(POKEMON_OUT_ROOT, ignore_errors=True)

    move_rows, skipped_rows = compress_zip(args.zip, args.limit, args.overwrite)
    if not move_rows:
        raise RuntimeError("No valid move SFX could be compressed from the ZIP")
    write_csv_json(MOVE_CSV, MOVE_JSON, move_rows)
    write_csv_json(SKIPPED_CSV, SKIPPED_JSON, skipped_rows)
    pokemon_rows = build_pokemon_manifest(move_rows, args.overwrite)
    write_csv_json(POKEMON_CSV, POKEMON_JSON, pokemon_rows)

    sizes = [int(r["compressed_bytes"]) for r in move_rows]
    print(f"moves={len(move_rows)}")
    print(f"skipped_moves={len(skipped_rows)}")
    print(f"pokemon_mappings={len(pokemon_rows)}")
    print(f"move_manifest={MOVE_CSV}")
    print(f"pokemon_manifest={POKEMON_CSV}")
    print(f"size_min={min(sizes)} size_max={max(sizes)} size_avg={sum(sizes) // len(sizes)}")
    print(f"below_1kb={sum(1 for s in sizes if s < 1024)} above_20kb={sum(1 for s in sizes if s > MAX_BYTES)}")
    species_files = list(POKEMON_OUT_ROOT.rglob("*.ogg"))
    species_sizes = [p.stat().st_size for p in species_files]
    print(f"pokemon_sfx_files={len(species_files)}")
    print(f"pokemon_size_min={min(species_sizes)} pokemon_size_max={max(species_sizes)}")
    pikachu = next((r for r in pokemon_rows if r["slug"] == "pikachu"), None)
    if pikachu:
        print(f"pikachu={pikachu['assigned_move']} -> {pikachu['sfx_file']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
