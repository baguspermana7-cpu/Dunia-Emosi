# Mojo owner-art catalogue

This catalogue preserves the supplied drawings used by G31 and the additional art available for future work. Asset availability is separate from implemented gameplay: the current game has 16 initial missions. The 50-form / 250-scenario product specification remains broader than that implementation.

The machine-readable companion is [MOJO_ASSET_CATALOGUE.json](../documentation%20and%20standarization/MOJO_ASSET_CATALOGUE.json). It records source filenames and SHA-256 hashes, measured regions, output keys and hashes, dimensions, excluded regions, source variants, and duplicate-sheet provenance. It contains no private conversation or machine-local source paths.

## Coverage

| Measure | Count / disposition |
|---|---|
| Supplied source sheets | 29 |
| Sheets with exported art | 26 |
| Whole reference-only source | 01: design mockups with the wrong red actor and blue-cap boy |
| Exact duplicate sheets | 14 = 13; 21 = 20, verified by full-file SHA-256 |
| Discoverable output images | 680 |
| Complete top images / identities | 47 images representing 44 identities; three additional base drawings are variants |
| Canonical-name remaps for repeated source keys | 15; additional recovered art uses source-labelled keys; game keys remain unchanged |
| Restricted item regions excluded from output | 18 |
| Separator artifact excluded | 1 |
| Whole-sheet / marketing reference regions | 5 |
| Exported UI reference images | 9; eight sheet 16 screen examples and one path-preview icon |

Source slots describe measured groups or panels. A panel containing several wheels or headlights is preserved as the supplied component panel, not falsely counted as a set of matching animated vehicle parts. Each inherited skipped slot has an explicit disposition. Merged slots are split at measured source boundaries; their individual output keys remain traceable.

## Source decisions

| Sources | Treatment |
|---|---|
| 01 | Whole layout retained as design reference in the source archive. Wrong actor/Bo drawings are excluded from runtime art. |
| 02–03 | Export safe grid elements, props, controls and panels. Exclude wrong vehicle/profile/dialogue figures and marketing headers. Preserve painted tiles, including cream condition-card backgrounds. The path-preview drawing is catalogued as reference; the game does not gain a pre-run route preview. |
| 04–08 | Preserve all 45 supplied full-vehicle drawings. Earlier base drawings 04/05 have source suffixes. Preserve white tanks/capsules/booms and complete wheels; exclude printed captions. |
| 09–10 | Canonical base from sheet 09 and correct Bo/Oona/Grandad/Float/Neon. Previously skipped distinct characters and base from sheet 10 are source variants. Exclude unveiled Lula and alternate yellow-face fire actor. |
| 11 | Preserve both city/road panels, both suspension drawings, real Bo profile, and split combined level/garage and confirm/loading cells. |
| 12 | Preserve windshields, bodies, chassis, face panels and other generic component groups. Preserve eight safe decals separately; exclude the skull decal and Lula. |
| 13–14 | Preserve correct Bo dialogue, town house/square, coin/star, mission/level UI and all effects formerly lost through merged slots. Sheet 14 is an exact duplicate with inherited provenance. |
| 15 | Preserve all 12 painted panels, including correct Bo/Oona dialogue, collection and result frames, plus all 30 bottom controls/icons/progress bars. |
| 16 | Correct Bo/cyan Mojo appear in the source. Preserve five clean backgrounds and eight complete screen examples as UI references. The customize example includes alternate vehicle art and must not supply canonical actor sprites. |
| 17–24 | Preserve all supplied landscape/portrait scenes; 21 is an exact duplicate of 20. |
| 25–29 | Use measured cell separators to avoid neighboring fragments. Exclude spiked logs, skull sign/gate, cannon, dynamite, spike fence, sword, archery target and catapult. Preserve every other supplied prop. |

The initial exporter overwrote eight distinct earlier drawings with later names: star, gear, bolt, battery, wrench and confetti from 03; left/right signs from 13. These now use stable source suffixes. Base drawings 04/05 and the four correct characters plus base from sheet 10 are also distinct source variants. These 15 explicit remaps count repeated names in the original layout; newly recovered stars, icons and panels also carry source-labelled keys. A source suffix denotes provenance, not a new game capability.

## Component and animation boundary

Sources 10–13 include genuine detachable-looking component drawings: face panels, windshields, body shells, chassis, wheels, lights, exhausts, and ladder/drill/bucket/mixer/rocket/crane/cargo/rescue module panels. They are discoverable in the catalogue. They do **not** establish compatible pivots, matching scale, complete modules for every form, or north/east/south/west animation frames. The game currently renders complete supplied vehicle drawings. No missing direction or form artwork has been invented or generated.

The named game top catalogue has 44 complete-form identities; additional generic vehicle/component panels are separately classified. This is not proof of all 50 specified forms, all 250 scenario families, or fully functional mechanics for every collection item.

## Extraction and visual boundary

The ingester preserves source RGB before WebP compression. It removes page background through border-connected masks, preserves known white paint with measured polygons, and removes enclosed paper only in explicitly audited structural voids. Measured caption bounds handle labels near wheels and feet. Opaque UI/background panels retain their literal painted backgrounds.

Original gray cast shadows, sticker/glow outlines and deliberate card backgrounds remain. Some gray shadows appear pale on dark terrain. These outputs are not certified as ideal background-independent alpha mattes; broad white/shadow removal was rejected because it erased white shoes, vehicle bodies and wheels. Source framing such as cropped legs on certain Bo poses remains source framing.

The original sources are unchanged. Rejected intermediate masks and verification screenshots are local review artifacts, not release assets.

## Verification and publication

`tools/qa-mojo-art.py` passes 21 regression checks covering source counts and unique keys, forbidden-key exclusion, white-paint preservation, crop geometry, the cone stripe and mixer caption regressions, late-failure safety, rollback, assets-only isolation, and full-index preservation of unrelated assets. Source-dependent checks skip explicitly when the owner's original sheets are unavailable; synthetic geometry and transaction checks still run.

The final catalogue candidate has 680 decoded, dimension-matched, nonempty WebP images. All 680 source dispositions and output hashes are recorded in the JSON companion. The 26 source groups were visually inspected on light and dark backgrounds, including reinspection after white-stripe/checker, Bo-overhang and town-boundary fixes. This is contact/native-detail review, not a claim that every pixel is a perfect independent matte.

All requested images must encode and validate before publication. Asset-only export uses the shared staged batch writer. Full-index publication uses the shared lock across index read, merge, JS rendering, promotion and rollback. An ordinary I/O failure restores the previous batch; this is not a power-loss atomicity guarantee.

Final release acceptance also requires the coordinator's frozen-file browser/offline run. The existence of a catalogue image or a clean decode is not proof of gameplay or visual behavior.
