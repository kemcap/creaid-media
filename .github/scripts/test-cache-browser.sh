#!/usr/bin/env bash
# Verify the exact cache candidate against the matching original build; restore both paths.
set -euo pipefail
npm install --no-save --package-lock=false playwright@1.56.1 pixelmatch@7.1.0 pngjs@7.0.0
npx playwright install --with-deps chromium firefox webkit
baseline=$(mktemp -d "${RUNNER_TEMP:-/tmp}/creaid-cache-baseline.XXXXXXXX")
mkdir -p "$baseline/scripts" "$baseline/src/_data"
cp scripts/preview.mjs scripts/routes.mjs "$baseline/scripts/"
cp src/_data/routes.json src/_data/aliases.json "$baseline/src/_data/"
candidate_pid=""
baseline_pid=""
cleanup() {
  if [[ -n "$candidate_pid" ]]; then kill "$candidate_pid" 2>/dev/null || true; fi
  if [[ -n "$baseline_pid" ]]; then kill "$baseline_pid" 2>/dev/null || true; fi
  if [[ -d "$baseline/dist" ]]; then
    if [[ -d dist && ! -e preview-cache-package/site ]]; then
      mv dist preview-cache-package/site
    fi
    if [[ ! -e dist ]]; then mv "$baseline/dist" dist; fi
  fi
}
trap cleanup EXIT
mv dist "$baseline/dist"
mv preview-cache-package/site dist
CREAID_PREVIEW_PORT=8080 node scripts/preview.mjs > "$baseline/candidate.log" 2>&1 &
candidate_pid=$!
CREAID_PREVIEW_PORT=8081 node "$baseline/scripts/preview.mjs" > "$baseline/baseline.log" 2>&1 &
baseline_pid=$!
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:8080/ >/dev/null && curl -fsS http://127.0.0.1:8081/ >/dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:8080/ >/dev/null
curl -fsS http://127.0.0.1:8081/ >/dev/null
npm run test:routes -- http://127.0.0.1:8080
CREAID_QA_URL=http://127.0.0.1:8080 CREAID_QA_BASELINE=http://127.0.0.1:8081 CREAID_QA_OUTPUT=cache-browser-qa npm run test:browser
