#!/usr/bin/env bash
# Starts a Prism mock of the repo's openapi.yaml on 127.0.0.1:4010 and
# record-proxy.mjs on 127.0.0.1:4011, runs "$@" pointed at the proxy with a
# fake bearer, then stops both. No key and no network call to the real API.
# Needs `npm ci` in this directory first (Prism is pinned in package.json).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
work="$(mktemp -d)"

export SMARTERWEATHER_CI_LOG="$work/requests.jsonl"
export SMARTERWEATHER_API_BASE="http://127.0.0.1:4011"
export SMARTERWEATHER_API_KEY="ci-mock-key"

"$here/node_modules/.bin/prism" mock "$root/openapi.yaml" --errors -h 127.0.0.1 -p 4010 >"$work/prism.log" 2>&1 &
prism=$!
node "$here/record-proxy.mjs" >"$work/proxy.log" 2>&1 &
proxy=$!
trap 'kill "$prism" "$proxy" 2>/dev/null || true' EXIT

ready=""
for _ in $(seq 120); do
  if curl -fsS -o /dev/null "$SMARTERWEATHER_API_BASE/v1/health" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [ -z "$ready" ]; then
  echo "the mock did not come up; prism log:" >&2
  cat "$work/prism.log" >&2
  exit 1
fi
: >"$SMARTERWEATHER_CI_LOG"

"$@"
