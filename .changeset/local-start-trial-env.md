---
"@smarterweather/mcp-onboarding": minor
---

Local `start_trial` writes `SMARTERWEATHER_API_KEY` to `.env` (mode 0600) and returns only a key prefix — the stdio bridge never prints the trial bearer.
