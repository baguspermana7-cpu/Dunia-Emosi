# Master plan — Dunia Emosi, 2026-11-15

Owner rule (2026-11-15): **Opus / Fable = main orchestration. Execution = Ark 1M** (BytePlus `glm-5.2[1m]`
through the `claude-hybrid` proxy, `127.0.0.1:8792`).

Inputs: `docs/audit/full-audit-2026-11-14.md` (A-1..A-22, O-1..O-5), `docs/prd/README.md` (25 PRDs),
`docs/adoption-plan-2026-11-14.md` (CCGS gaps), `production/epics/`.

## 1. Who does what

| Role | Model | Does | Never does |
|---|---|---|---|
| Main | Opus 5.5 (Fable for a new PRD or a hard design call) | writes the laws, the agent brief and the red proof; reviews agent output against evidence; runs the checkpoint gate set once; token bump, ci-verify, commit, push, live check, game1 bump; reports to the owner | bulk edits, sweeps, long gate loops |
| Executor | Ark `glm-5.2[1m]` (Agent `model: "sonnet"`; the proxy maps it) | implements one release scope from the brief; writes the new gate; runs only the gates of the files it touched; returns a short diff summary + gate summary lines | commit, push, token bump, touching files outside the brief, starting a second browser |
| Reviewer | Ark, a second agent (only for diffs > 300 lines) | reads the diff cold, lists defects as `file:line problem fix` | edits |

**Rules that carry over** (memory: agent token budget, browser lock, parallel sessions):
- At most 2 agents at once; one headless browser (`flock` + `timeout`); agents read gate summary lines only.
- Brief under ~8k tokens: goal, laws, files, gates to run, what is out of scope. A long-running agent is retired and
  replaced by a fresh one with a short brief.
- Agent work runs in an isolated worktree (`isolation: "worktree"`); main merges after review. Main commits only
  its own files.
- Ark output is a different model family: every claim is re-proven by main (gate output, screenshot, diff) before it
  is reported. A gate that cannot fail proves nothing — main checks the red run.
- Quota: `arkcli usage plan` before each wave. Session window > 85 %: no new Ark spawn until reset. A 429 is handled
  by the proxy (failover to Anthropic, cooldown). If both providers are down: stop, report.

## 2. Release flow (one release = one scope)

1. Main: laws (2-6, measurable) + brief + red proof of the gate on the live tree.
2. Ark executor: implement + gate + touched-file gates → summary.
3. Main: review diff, re-run the new gate (red on HEAD, green on branch), look at every screenshot.
4. Main: checkpoint gates (runner tag of the touched game + `ci-verify.sh`), token bump, commit, push.
5. Main: live check on Vercel + github.io (token + feature string + the new gate against live), game1 bump if
   Dunia assets changed, audit/PRD status lines updated.

## 3. Waves

### Wave A — close the open release (in flight)
- v64.52 live on Vercel (hijab 7/7, names 4/4 against live); github.io deploy pending; game1 `g1-20261114e` pushed.
- `qa-tk-play` level-map check now waits for animations (17.49 px star was mid-entrance; v64.51 and v64.52 both
  18.00 at rest). Ships with v64.53.

### Wave B — finish the audit (A-9..A-18)
| Release | Scope | Executor work | Main proof |
|---|---|---|---|
| v64.53 | A-9 orphans: `git rm` the 353 proven orphans except the owner-decision files (O-5 OST, O-1 maze); `.gitignore` for `__MACOSX`, `*.import`, `_backup`, prompt `.md`/`.jsonl` moved to `docs/asset-prompts/`. A-10: 17 dead functions in `game.js` | build the list from the audit scanner, re-check each against game1 + dynamic patterns, remove | `qa-local-refs` + regression sweep + game1 smoke; a new `qa-no-orphans` ratchet (count may fall, a rise fails) |
| v64.54 | A-13 one `DuniaSettings.soundOn()` + one speak helper (17 files / 14 speech copies) | migrate file by file, keep behaviour | `qa-profile-settings`, a gate that greps zero direct `dunia-emosi-sound` reads outside the helper |
| v64.55 | A-14 `balapan-kereta-side` saves through save-engine; A-15 pause timers on `visibilitychange`; A-16 width/height on 44 hub `<img>` | three small scopes, one agent | per-child save gate; hidden-tab timer gate (0 ticks while hidden); CLS check on the hub |
| v64.56 | A-17 runtime no-emoji gate on every page (strict), then map or replace what renders | widen gate, fix pages | red: gate on v64.55 lists the pages; green after |
| v64.57+ | A-18 split `game.js` (14,960 lines) along its section banners, one module per release; `balapan-kereta.html` after | move code, no behaviour change | all hub gates before/after identical; `ci-verify` |

### Wave C — remaining PRDs (one PRD = one release)
Order by value and risk: **23** offline badge → **21** session rhythm → **16C** name the feeling → **07** local
telemetry → **14** voice narration (renders overnight on VoiceStudio; longest) → **29** shared game shell
(one game per release) → **31** baked-light pilot (owner picks A/B).
Held: **20** next-game card and **22** collection book (new menu items: owner names them, with a screenshot,
before ship). Blocked: **06** (tablet with USB debugging).

### Wave D — CCGS adoption gaps
`docs/engine-reference/web/VERSION.md` (PixiJS 8.18.1, Chrome Android) → after the owner accepts ADR-0001..0005:
TR registry, control manifest (owner rules: no emoji, no white rim, hijab only, targets ≥ 48 px, one browser,
saves via save-engine), `production/sprint-status.yaml`. Executor writes; main checks against the code.

### Not in this plan
Incident library status-portal directory (M365 / AWS / Alibaba / ByteDance, …) — queued for after the BMS
telemetry work (memory `project_dc_incidents_dossier`).

## 4. Owner decisions needed
- O-1 kereta-maze / lokomotif-pemberani: keep hidden or give a tile?
- O-2 G6 Petualangan Mobil, G17 Jembatan Goyang: hidden or a tile?
- O-3 cloud sync (`math-cloud.js`): keep dormant or design a parent-gated version?
- O-4 dev pages deployed (`_shell-smoke`, `plb`, `secondbrain`, `proposals/`): remove from deploy?
- O-5 four Pokemon OST mp3s (6.7 MB, ripped): keep?
- ADR-0001..0005: accept?
- PRD-20 / PRD-22: names for the new menu items.

## 5. Estimates
Wave B: 5 releases + the game.js split (ongoing). Wave C: 7 PRDs, PRD-14 the longest. Each release ≈ one
executor run + one checkpoint; machine load (other sessions' browsers) is the main delay, not tokens.
