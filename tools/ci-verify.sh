#!/usr/bin/env bash
# ci-verify — the gates every push to main must pass before GitHub Pages deploys it.
# Runs the same way locally and in .github/workflows/pages.yml:
#   bash tools/ci-verify.sh            static gates only (seconds, no browser)
#   CI_SMOKE=1 bash tools/ci-verify.sh static gates + headless smoke of every page (needs puppeteer)
# Built 2026-11-10: the workflow deployed whatever reached main; every gate depended on a session remembering
# to run it on the right port.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== cache tokens: one token per shared file"
node tools/normalize-cache-tokens.mjs --check

echo "== syntax: every own script parses"
n=0
for f in *.js games/*.js games/data/*.js; do node --check "$f"; n=$((n+1)); done
echo "$n scripts parse"

echo "== local references: scripts, stylesheets, precache entries exist"
node tools/qa-local-refs.mjs

echo "== every game page loads the freeze watchdog"
node tools/qa-watchdog-wired.mjs

echo "== every Timmy board, kereta maze and Mojo pattern can be finished"
node tools/qa-levels-solvable.mjs

echo "== sprites fill their box (people pack trimmed, PRD-26)"
node tools/qa-sprite-fill.mjs

echo "== people sprites in use were reviewed (hijab rule), no random person pick"
node tools/qa-content-rules.mjs
node tools/qa-white-outline.mjs

echo "== shared mastery settles a child near 75 % right, per child (PRD-10)"
node tools/qa-mastery.mjs
node tools/qa-error-kinds.mjs

if [ "${CI_SMOKE:-}" = "1" ]; then
  echo "== smoke: every page loads, renders, 0 errors, no 390px overflow"
  port=${CI_PORT:-8197}
  python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 &
  srv=$!
  trap 'kill $srv 2>/dev/null || true' EXIT
  for i in $(seq 1 20); do python3 -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:$port/index.html')" 2>/dev/null && break; sleep 0.5; done
  # blippi frames the separate game1 repo, which is not in this checkout
  QA_BASE="http://127.0.0.1:$port/" QA_ONLY='^(?!games/blippi\.html)' node tools/qa-app-sweep.mjs
  echo "== learning log: answers recorded per child from real taps (kuis, Timmy quiz, Ayo Berhitung)"
  QA_BASE="http://127.0.0.1:$port/" node tools/qa-learning-log.mjs
  echo "== the parent dashboard shows this child's learning"
  QA_BASE="http://127.0.0.1:$port/" node tools/qa-dash-learning.mjs
  echo "== the freeze card speaks to a child who cannot read"
  QA_BASE="http://127.0.0.1:$port" node tools/qa-freeze-card.mjs
  echo "== daily feeling check-in, once a day per child"
  QA_BASE="http://127.0.0.1:$port/" node tools/qa-feeling-checkin.mjs
  echo "== napas bersama: timing, offers at calm moments only, motion"
  QA_BASE="http://127.0.0.1:$port/" node tools/qa-breathe.mjs
  echo "== Ayo Berhitung keeps each child's book"
  QA_URL="http://127.0.0.1:$port/games/ayo-berhitung.html" node tools/qa-ayo-per-child.mjs
  echo "== the age band on the name screen is the one saved, and every game page can read it"
  BASE="http://127.0.0.1:$port/" node tools/qa-profile-age.mjs
  echo "== the parent's vibration setting holds in every game"
  BASE="http://127.0.0.1:$port/" node tools/qa-vibrate.mjs
  echo "== no long instruction text without a picture or a voice beside it (ratchet, tools/instruction-baseline.json)"
  QA_BASE="http://127.0.0.1:$port/" node tools/qa-instruction-companion.mjs
  echo "== big enough buttons and readable text on every game page (primary buttons >= 48 px; ratchet tools/a11y-baseline.json)"
  QA_BASE="http://127.0.0.1:$port/" node tools/qa-game-a11y.mjs
  echo "== after a hard moment the next maths question is one tier easier, once (PRD-17b)"
  QA_BASE="http://127.0.0.1:$port" node tools/qa-soften.mjs
  echo "== a missed maths question comes back on later days in another game (PRD-11)"
  QA_BASE="http://127.0.0.1:$port" node tools/qa-review.mjs
  echo "== a wrong maths answer gets the hint for its kind of mistake, fully on screen (PRD-13)"
  QA_BASE="http://127.0.0.1:$port" node tools/qa-error-kinds.mjs
  echo "== no emoji left on screen: hub, parent dashboard, every game page (strict pages none at all)"
  node tools/audit-no-emoji.mjs
fi
echo "== ci-verify: all gates passed"
