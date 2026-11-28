# Dunia Emosi picture/icon audit (read-only), 2026-11-28

Tree: /home/baguspermana7/rz-work/wt-dunia-cine. Scratch: /tmp/claude-1000/-home-baguspermana7/a238e02f-dc84-4433-82d2-f824a5e649b7/scratchpad/audit/

Gates run (read-only): `node tools/test-uae-data.mjs` 1268 passed / 0 failed; `node tools/test-uae-engines.mjs` 33 / 0; `node tools/qa-local-refs.mjs` 1125/1125. All green, and none of them catches the findings below (they check that a file exists, not that the picture is right or complete).

Method: contact sheets of every picture next to its name (125 UAE signs, 330 G27 words, 72 G28 cards, 102 distinct emoji of index.html mapped by EmojiMap), compared against the data files; sign captions cross-checked against the Wikipedia gallery "Road signs in the United Arab Emirates" (raw wikitext): 117 of 125 captions identical, the rest are spelling/format variants (listed in U-09).

## Verdict by scope

1. UAE signs: all 125 files exist, all 125 are used by the gallery, every sign image matches its English and Indonesian name (zero wrong-sign pairs). All 50 signed questions show a sign that matches the question's subject. Problems are in a few question/sign pairings, one drawn stand-in, alt text and an empty `<script src="">`.
2. G27 Ejaan Inggris: 330 words, 330 pictures, 0 missing files, 0 duplicate pictures, 0 emoji characters. But ~25 pictures are cropped sprite-sheet cells (flat-cut edges, stray fragments of the neighbouring sprite) and 2 categories use Fluent Emoji art.
3. G28 Stinky and Dirty: 88 sprites, all resolve, 0 emoji characters. One card (LIS-10) answers with three emotion faces whose chins are cut off.
4. index.html: ~240 lines of source emoji are swapped at runtime by EmojiMap / DuniaIcons. The swap is the accuracy risk: 8 of the 102 mapped emoji show the wrong object.

## Findings

| id | severity | page | evidence | concrete fix |
|---|---|---|---|---|
| G-01 | HIGH | G27 ejaan-inggris (clothes, body, sports, vehicles, emotion) | Cropped sprite cells, the picture is cut by the crop box: assets/db/words2/054.webp (racket, bottom flat-cut), 056 (skates: one boot, cut), 059 (hoop: part of a board), 043 (pants), 044 (skirt), 050 (jacket), 051 (tie), 049 (scarf), 041 (tongue = lips with a cut-off tongue); assets/db/words/047 (neck), 051 (arm = a bare bent elbow, reads as a V shape). Stray fragments of the next sprite: assets/db/vehicles/060.webp (rocket, black blob under it) and 023.webp (tractor, black arc above it). See crop1.png in the scratch folder. Wired by games/data/spelling-data.js picPath, shown in games/ejaan-inggris.js:334 `.wpic`. | Re-crop these 13 cells from the sheet with padding (tools/crop-emoji-grid.py or crop-ui-sheet.py), or swap each for an existing lib/ cartoon (lib/things/*, lib/clothes). Then add a gate that fails when a sprite touches the bottom/left/right edge of its canvas with opaque pixels. |
| G-02 | HIGH | G27 ejaan-inggris, categories At Home and Al-Qur'an | games/data/spelling-data.js lines 3-7: "they use Fluent Emoji pictures (MIT)". Contact sheet sp/sheet01.png: 15 words in assets/spelling/obj/ are emoji art, a different style from the cartoon sets: bowl, soap, teapot, candle, sponge, bathtub, television, quran, kaaba, camel, beads, mosque, desert, prayer, sunrise. desert shows a cactus on a sunset tile (Arabian desert = dunes); prayer is a pair of emoji hands. | Owner rule is "jangan pakai emoji": redraw these 15 as cartoon art in the style of assets/db/lib (full object, outline, no tile). At minimum fix desert (dunes, not a cactus) and prayer. |
| G-03 | HIGH | G28 stinky-dirty card LIS-10 (Perasaan) | games/data/sd-cards.js:112; the answer images are db:emo/1, 2, 3 (assets/db/emo/001-003.webp). emo.png: all three faces are cut flat at the chin and are emoji faces. Question: "Bagaimana perasaan Rover di akhir cerita?". | Re-crop 001-003 with the full chin, or use the cartoon pip/rover with a drawn expression. |
| E-01 | HIGH | index.html world map, first screen, any page (EmojiMap) | games/data/emoji-map.js maps a wrong picture to these emoji: 🌴 (palm) to deco:tree (a leafy bush, line 121); 🌲 evergreen and 🌳 deciduous to the same bush (121, 120); 🌕 full moon to deco:moon = a crescent (120); 🐣 🐥 🐤 baby chick to creatures/1 = an adult hen (64, 172); ⚾ baseball and 🏐 volleyball to objects/41 = a football (172); 🚨 siren to ui/20 = a bell (138); 🍀 clover / 🌿 herb to fx:grass (107); 🐸 frog to creatures/58 = a frog sitting on a snake (59); 🚂 steam locomotive to vehicles/51 = a modern commuter train (41, x6 on index). Contact sheets em/idx0-2.png. | Header of emoji-map.js promises "never a wrong picture": remove these keys so the gap gate flags them, or draw the right sprite (palm, conifer, full moon, chick, baseball, siren, steam engine). Add a name-to-sprite review list to tools/audit-no-emoji.mjs. |
| G-04 | MEDIUM | G27 numbers (one..four) | assets/spelling/num/one.webp: a single 28 px apple in the bottom-right of an empty canvas; two.webp: two ducklings along the bottom edge; three: three strawberries scattered on a diagonal; four: four ladybugs in the corners (crop1.png). Counting objects are tiny and off-centre, and are Noto-style emoji (apple, duckling, strawberry, ladybug, beach ball, cupcake, butterfly, cookie). The counts themselves are right (1..10 verified). | Redraw one..four with the objects larger and centred (as in nine/ten), cartoon style, not emoji. |
| G-05 | MEDIUM | G27 body | assets/db/words/044.webp (hair): a head of hair with a blank face; reads as a faceless head. | Use hair-only art or a head with a face. |
| G-06 | MEDIUM | G27 mixed art styles | Photographic art next to cartoon: db/lib/real/things (bed, clock, spoon, broom, mirror, bucket, toilet, toothbrush, goggles), real/animals (shrimp, pigeon), real/food (lime, mangosteen, ginger), real/toys (dice, puzzle). jobs:postman and jobs:painter (assets/db/words2) are cut at the shoulders while the other jobs are head-and-hat. sp/sheet00-09.png. | Swap the 16 photographic ones for cartoon lib art (lib/things/*, lib/animals/*), re-crop postman and painter. |
| U-01 | MEDIUM | ujian-sim-abudhabi quiz | games/uae/uae-sim-bank.js:134 sf-bus shows sign `children` (426) on "A school bus extends its STOP arm". 426 is a warning triangle for children near the road, not a school-bus sign; shown with the question it hints at the wrong rule. | Show no sign for sf-bus (set sign to null) or add the real UAE school-bus STOP-arm picture. |
| U-02 | MEDIUM | ujian-sim-abudhabi quiz | uae-sim-bank.js:117 ln-left shows `no-overtaking` (349.1) on "On which side may you overtake?". The picture says do not overtake; the question asks how. Contradictory. | Remove the sign from ln-left. Same check for pr-round-in (:94), sp-school (:111): the sign there is decoration, not part of the question. |
| U-03 | MEDIUM | ujian-sim-abudhabi quiz + signs gallery | uae-sim-bank.js:53 sg-nopark shows 377 whose caption in the gallery is "No parking or waiting / Dilarang parkir atau menunggu" (uae-signs-real.js), but the question's correct answer is "a short stop to pick up or drop off is allowed". The app contradicts itself. | Keep the Commons caption for 377 and reword the answer to "No parking (waiting not allowed); brief loading stop rule per RTA", or cite the RTA manual. |
| U-04 | MEDIUM | ujian-sim-abudhabi quiz sg-hospital | uae-sim-bank.js:69 uses the drawn SVG hospital (uae-signs.js `hospital`: blue square, white square, red cross): the only drawn stand-in among 124 real sign images; style differs (flat vs photographic), and a red cross also reads as the Red Cross/Crescent mark (not checked against the RTA manual). Listed in the gallery section "Gambar ulang (belum ada berkas asli)". | Replace with an H hospital sign drawn to match, or drop the question and keep the 124 real ones. |
| U-05 | LOW | ujian-sim-abudhabi quiz | games/uae/uae-signs.js:69 `img()` writes `alt` = sign caption (e.g. alt="Stop", "No entry") on the quiz question "What does this sign mean?". Screen readers and the broken-image fallback give the answer away. | In the quiz use `alt="Rambu lalu lintas"`; keep the caption only in the gallery. |
| U-06 | LOW | relokasi-uae.html:87, pindah-abudhabi.html:63, ujian-sim-abudhabi.html:118 | `<script src=""></script>` before sw-reload.js on exactly these 3 pages (grep: no other page has it). An empty src fires an error event and does nothing. Looks like an unfilled build token. | Delete the line, or fill the token. |
| U-07 | LOW | signs 361 | uae-signs-real.js 361 "Authorised vehicles only": the artwork is a red crossed circle with two black bars, which reads as "no vehicles" to a learner; caption matches Wikipedia. | Add a one-line explanation under the picture, or leave it out of the quiz (ae-361). |
| U-08 | LOW | signs gallery | oneway_Left/oneway_Right (alpha undefined) and 302/303/309/348.1 have square or tight white corners with tiny artifacts around the rounded plate (sheet_part_00/03.png). Sizes 500x375..500x711 are contained by `object-fit: contain`, so layout is fine. | Optional: trim the artifacts with `magick -fuzz 5% -trim`. |
| U-09 | LOW | signs captions | 340.1/340.2 share the same caption, 341.1/341.2 too (mirrored art); captions vary from Wikipedia in 8 places only by spelling (e.g. "good vehicles" fixed to "goods vehicles", "Advance vehicle restriction" reworded). Wikipedia has no entry for 330-60, 344-*, 410_L, oneway_*: those captions are the project's own, and are correct against the pictures. | None needed; for 340/341 add "(left)" and "(right)" to the captions. |
| G-07 | LOW | G27 words | `dice` shows one die (singular `die`), `skates` and `goggles` etc. picture one item, `salad = selada` (selada is lettuce), `pepper = paprika` (pepper is lada). | Use singular `die`, change id to "salad" and "lada/paprika". |

## What is clean (proved)

- UAE signs: 125/125 files present, 0 orphan files, 0 keymap targets missing, licence per file present (112 public domain, 11 CC0, 2 CC BY 4.0, artist present on both CC BY).
- G27 / G28 / UAE pages: 0 emoji characters in source (checked by Unicode ranges), no missing local refs.
- Ejaan: 330 words, each has id, clue, pos, say, and the sentence contains the word.
- All G28 sprite keys resolve, except the engine-handled `db:` and `text:` prefixes.

## Not proved (could not run)

Rendered screenshots of the 3 UAE pages, G27, G28 and index.html were attempted under /tmp/claude-1000/kereta-browser.lock; another session held that lock for the whole 45 minutes I waited (3 attempts, each flock -w 900 timed out with exit 1; the holder runs ~/.cache/qa-tmp/ci-rest.sh under a 90 min timeout). I did not bypass the lock. The browser steps below were NOT run:
- console errors and 4xx on the three UAE pages (U-06 effect), horizontal scroll at 390 px
- the rendered index first screen and menu map after EmojiMap swap (E-01 is proved from the data and contact sheets, not yet from a screenshot)
- G27 word list screens at 390 px (G-01 is proved from the image files)
Scripts are ready and resolve puppeteer from ../node_modules: run `cd /home/baguspermana7/rz-work/wt-dunia-cine && TMPDIR=$HOME/.cache/qa-tmp flock -w 900 /tmp/claude-1000/kereta-browser.lock timeout 600 node <scratchpad>/audit/shoot_all.mjs`; shots go to audit/shots/, JSON to shoot1.json and shoot2.json.
- Note: the 4 UAE files (games/relokasi-uae.html, pindah-abudhabi.html, ujian-sim-abudhabi.html, games/uae/) are untracked in this worktree and a parallel session added games/visa-keluarga-uae.html and games/uae/uae-family-data.js at 11:36 during the audit; those two were not audited.

---
# ADDENDUM B: rendered evidence (second auditor, browser lock acquired 12:2x), re-proved against the 12:30 files
Closes most of "Not proved" above. Page renders (hub d/m, map d/m, 3 UAE pages d/m, G27 d/m, G28 d/m) ran clean: 0 console errors, 0 horizontal scroll, 0 visible emoji (only U+2726 in the hub tagline, U+2192 in 2 G28 buttons), 125/125 gallery signs loaded at 390 and 1280 px. Files: pg_*.png, sim_*.png, g27_*_d/m.png, pages.json, pages2.json.

## Status of items in the first report (checked 12:30)
| first-report id | status now |
|---|---|
| U-01 sf-bus, U-02 ln-left | FIXED by the other session at 12:13 (sign is null now; lw-redlight too). Do not act. |
| U-03 sg-nopark | Answer fixed to "No parking or waiting". Still wrong: the explanation says "Blue with one red diagonal" but sign 377 is WHITE (see B-09). |
| U-04 hospital drawn | Rendered (sim_drawn_m.png): accurate and clean; keep. Low only. |
| U-06 empty script | Still present, lines now relokasi-uae.html:101, pindah-abudhabi.html:63, ujian-sim-abudhabi.html:118. No console error in Chrome. |
| G-01, G-02, G-04, G-05 | Confirmed by rendering the files at 220-300 px (susp.png) and in the live game (s_g27_hoop_d.png). |
| G-03 LIS-10 faces | Confirmed in sheetS0.png (bottom row: Senang, Sedih, Marah cut at the chin). |
| E-01 EmojiMap wrong pictures | NOT re-proved here (data-level claim; rendered hub showed no wrong picture in the visible nodes). Leave as filed. |

## New findings (prefix B)
| id | sev | page | evidence | fix |
|---|---|---|---|---|
| B-01 | HIGH | G27 | 46 of 330 word pictures have a shortest side under 80 px (audit/wsize.txt): all 11 colours 64-70 px, tie 37x58, bottle 37x82, water 41x83, glue 50x100, door 56x79, crayon 58x79, chair 60x92, racket 69x63, skates 71x59. Live game: tie file 37x58 shown in a 200 px box (pages2.json, s_g27_tie_d.png: soft tie about 70x135 px). Box is clamp(110px,26vh,200px) (games/ejaan-inggris.html:190): 3x-5x upscale, worse on 2x screens. | Regenerate the 46 at 256 px or more in the style of the sharp ones. Add a gate: picture under 128 px fails. |
| B-02 | HIGH | World map (index.html) | Node labels are 9.5 px on desktop (measured on all 32 nodes), 8.5 px base, 7 px at <=420 px (style.css:5791, 5886, 5895) on a translucent pill; at 390 px nearly unreadable (pg_map_m.png). Target users are 5-8 years old. | 13-14 px minimum, allow 2 lines, solid pill, contrast 4.5:1. |
| B-03 | HIGH | G27 camel | assets/spelling/obj/camel.webp 192x185: the legs are two thin sticks with a dark triangular hole and pink gradient between (camel_rocket_tractor.png, left). Reads as a render fault. | Redraw with solid legs (also emoji art, see G-02). |
| B-04 | MEDIUM | World map | Stray scenery on banners at 1280x800: a brown cone with orange ellipse over the right end of the "Arena Pokemon" banner (about x790,y690) and a navy cylinder with a light line on the left corner of "Lab Sains" (about x858,y688); map_crop.png. No other banner has one; they look clipped or unfinished. | Place inside the zone or remove (zone decoration pseudo-elements in style.css `.wmap-zone--*`). |
| B-05 | MEDIUM | G27 live | The picture is drawn over the park scene's lamp post and beside the Listen button: tie half behind the post, hoop overlapped (s_g27_tie_d.png, s_g27_hoop_d.png). (Ignore the "Colors" header chip: it is only because I started words through the test seam.) | Put a clear plate behind the picture so scene props never touch it. |
| B-06 | MEDIUM | Hub phone 390x844 | (a) tagline "GAME BELAJAR SERU" wraps, leaving a lone second sparkle glyph on its own line (pg_hub_m.png y~224); (b) the "Relocation to UAE" row is full-bleed 0..390 px while the buttons above are inset 18..372 px; (c) the small train sprite overlaps the bottom button row (Bagikan/Reward/Profil/Setting). | (a) drop the second glyph or nowrap and tighter tracking; (b) same side margin as the buttons; (c) lift the train above the row or hide it under 700 px height. |
| B-07 | MEDIUM | G27 data | `pepper` = red bell pepper while `chili` also exists; `planet` and `earth` are in category "weather". | Rename "bell pepper"; move planet/earth to nature/space. |
| B-08 | MEDIUM | Ujian SIM sg-noovertake | uae-sim-bank.js:52 explanation "Two cars, red and black"; sign 349.1 shows two BLACK cars with a red slash (sheetA2.png). | "Two cars side by side in a red ring, crossed by a red bar." |
| B-09 | MEDIUM | Ujian SIM sg-nopark | uae-sim-bank.js:53 explanation "Blue with one red diagonal"; sign 377 has a white face, red ring, crossed P (sheetB0.png). Written for the old drawn blue sign. | "A red ring with a crossed P: no parking or waiting. A blue disc with a red cross (370): no stopping." |
| B-10 | LOW | World map | "Spelling Adventure" label wraps to 2 lines and is the only pill with a different green fill (pg_map_d.png). "Ayo Berhitung" card icon was blank in one capture and drawn in another (map_scroll1.png vs pg_map_d.png): unproven, maybe lazy-load. | Shorten the label; load that icon eagerly; re-check once. |
| B-11 | LOW | Hub, G28 | 10 hidden `<img src="">` in index.html and 3 in stinky-dirty.html:381,393,432 resolve to the page URL and read as broken images to scanners (pages.json: broken 10 and 3). Not visible. | 1x1 data URI or no src. |
| B-12 | LOW | G28 stinky-dirty.html:394,420 | "Mulai Sesi →" / "Lanjut →": text arrow glyph instead of the SVG chevron used elsewhere. Not emoji. | Inline SVG chevron. |
| B-13 | LOW | G27 | /favicon.ico 404 on games/ejaan-inggris.html (only console error on any scoped page). | Add the `<link rel="icon">` the UAE pages have. |
| B-14 | LOW | G28 MEM-04 and hub | game/question-block is a Mario-style yellow "?" block; hub first screen uses Pikachu/Gengar-style art. | Neutral box for the block; owner decision on the hub art (trademark). |

## Top 10 actions, in order
1. B-01 + G-01: regenerate/crop the 46 low-res and ~20 cropped G27 sprites.
2. B-02: world-map labels at 13 px or more.
3. G-02 + B-03: replace the 15 Fluent-emoji pictures in G27 (camel first, legs broken).
4. G-03: re-crop the three emotion faces of G28 LIS-10.
5. E-01: fix the 8 wrong EmojiMap pictures (not re-proved here).
6. B-04: remove or place the two stray map decorations.
7. B-08, B-09: correct the two sign-explanation texts.
8. B-06: hub phone layout (tagline orphan, full-bleed row, train overlap).
9. B-05: a clear plate behind the G27 picture.
10. U-06: delete the three empty script tags. Then add gates: G27 picture size and edge-cut check; sign colour words in explanations versus the file.
