---
"@smarterweather/mcp-onboarding": patch
---

`login` links to the Smarter Weather approval page (`https://developers.smarterweather.com/device?user_code=…`) instead of Clerk's stock Account Portal page, and prints the code on its own line so the human can check it matches. `--json` `verification_uri` uses the same link.
