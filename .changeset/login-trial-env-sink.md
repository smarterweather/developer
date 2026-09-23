---
"@smarterweather/mcp-onboarding": minor
---

CLI `trial` / `login` subcommands and proxy sinks for hosted create/rotate write `SMARTERWEATHER_API_KEY` to `.env` (mode 0600) and return only a key prefix — never the bearer, access token, or device code. Every mint path refuses a git-tracked `.env` before minting; `help` prints usage.
