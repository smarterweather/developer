#!/usr/bin/env bash
set -euo pipefail

# Quick local try: paste your key below. Prefer exporting SMARTERWEATHER_API_KEY,
# which wins when set, and never commit a real key.
API_KEY="YOUR_SMARTERWEATHER_API_KEY" # insert your key here

body="$(mktemp)"
trap 'rm -f "$body"' EXIT
status="$(curl -sS --max-time 10 -o "$body" -w '%{http_code}' \
  "${SMARTERWEATHER_API_BASE:-https://api.smarterweather.com}/v1/weather?lat=39.74&lon=-104.99" \
  -H "Authorization: Bearer ${SMARTERWEATHER_API_KEY:-$API_KEY}")"

if [[ "$status" != 2?? ]]; then
  # Errors are RFC 9457 problems (JSON) whose next_steps names a fix; anything
  # else, such as a gateway's HTML or JSON error, is shown as its first 200 characters.
  jq -er --arg status "$status" '(.detail // .title | strings) as $text | "\($status): \($text)",
    ((.next_steps | .[.recommended] | .href | strings | "Next step: \(.)")? // empty)' "$body" >&2 2>/dev/null ||
    echo "$status: $(head -c 200 "$body")" >&2
  exit 1
fi

jq -r '"\(.current.temperature)°F, \(.current.conditions)", "Sources: \(.attribution.sources | join(", "))"' "$body"
