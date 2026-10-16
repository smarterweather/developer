#!/usr/bin/env bash
set -euo pipefail
SMARTERWEATHER_API_KEY="${SMARTERWEATHER_API_KEY:-YOUR_SMARTERWEATHER_API_KEY}" # insert your key here

curl -sS --fail-with-body "${SMARTERWEATHER_API_BASE:-https://api.smarterweather.com}/v1/weather?lat=39.74&lon=-104.99" \
  -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" |
  jq -r '"\(.current.temperature)°F, \(.current.conditions)", "Sources: \(.attribution.sources | join(", "))"'
