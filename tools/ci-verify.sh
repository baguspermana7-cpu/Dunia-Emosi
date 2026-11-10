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

if [ "${CI_SMOKE:-}" = "1" ]; then
  echo "== smoke: every page loads, renders, 0 errors, no 390px overflow"
  port=${CI_PORT:-8197}
  python3 -m http.server "$port" --bind 127.0.0.1 >/dev/null 2>&1 &
  srv=$!
  trap 'kill $srv 2>/dev/null || true' EXIT
  for i in $(seq 1 20); do python3 -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:$port/index.html')" 2>/dev/null && break; sleep 0.5; done
  # blippi frames the separate game1 repo, which is not in this checkout
  QA_BASE="http://127.0.0.1:$port/" QA_ONLY='^(?!games/blippi\.html)' node tools/qa-app-sweep.mjs
fi
echo "== ci-verify: all gates passed"
