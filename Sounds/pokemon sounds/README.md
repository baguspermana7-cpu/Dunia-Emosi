# Pokemon Licensed Sound Pipeline

Folder ini untuk memproses audio Pokemon yang Anda sediakan sendiri secara legal/licensed untuk testing pribadi.

Input saat ini:

- `/home/baguspermana7/Downloads/3DS - Pokemon Sun _ Moon - Miscellaneous - Attack Move Sound Effects.zip`
- Isi ZIP: attack move sound effects dari Pokemon Sun/Moon, bukan Pokemon cry/name voice.

Output:

- `attack-move-sfx-compressed/` - versi `.ogg` kecil dari sound jurus asli di ZIP.
- `pokemon-sfx-by-species/` - 1025 file `.ogg` final, satu file per Pokemon dari `POKEMON_DB`.
- `attack_move_sfx_manifest.csv` - daftar semua move SFX yang berhasil dikompres.
- `attack_move_sfx_manifest.json` - manifest lengkap move SFX.
- `attack_move_sfx_skipped.csv` - daftar entry ZIP yang gagal didecode/dikompres.
- `attack_move_sfx_skipped.json` - versi JSON daftar skipped.
- `pokemon_attack_sfx_manifest.csv` - mapping 1025 Pokemon dari `POKEMON_DB` ke file species final dan move source terbaik berdasarkan signature move/type.
- `pokemon_attack_sfx_manifest.json` - manifest lengkap mapping Pokemon.

Catatan penting:

- Tidak ada AI voice dan tidak ada suara buatan sendiri.
- Script tidak download internet. Semua audio diambil dari ZIP lokal yang Anda berikan.
- Karena ZIP ini berisi efek jurus, file Pikachu akan dimapping ke jurus seperti `Catastropika`, `10 Mil Volt Thunderbolt`, atau `Thunderbolt` jika tersedia, bukan suara Pikachu mengucapkan "Pikachu".
- Target ukuran output: sekitar 1-20 KB per `.ogg`; script akan gagal jika file species final di atas 20 KB.

Regenerate:

```bash
python3 "/home/baguspermana7/rz-work/Dunia-Emosi/Sounds/pokemon sounds/compress_licensed_attack_sfx.py" --overwrite
```
