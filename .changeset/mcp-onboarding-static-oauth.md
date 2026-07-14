---
"@smarterweather/mcp-onboarding": patch
---

When `SMARTERWEATHER_ONBOARDING_AUTH=required`, pin the mcp-remote OAuth callback to port `3334` and pass `--static-oauth-client-info` with the pre-registered public PKCE Clerk `client_id` (`PQcxOLVZg5kxzhoC`, overridable via `SMARTERWEATHER_ONBOARDING_OAUTH_CLIENT_ID`). Production Clerk keeps Dynamic Client Registration off; the bridge no longer depends on DCR.
