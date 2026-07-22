# Glama server submission runbook

Context: the [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
maintainer requires listings to be submitted to
[glama.ai/mcp/servers](https://glama.ai/mcp/servers) as a **Server** (not a
Connector), claimed by the owner, with a Glama quality score
(PRs [#10144](https://github.com/punkpeye/awesome-mcp-servers/pull/10144),
[#10145](https://github.com/punkpeye/awesome-mcp-servers/pull/10145)).
Our earlier connector-only listing does not satisfy that rule.

## Already in place (repo side)

- [`glama.json`](../glama.json) at the repo root with
  `"maintainers": ["afisch710"]` — required to claim an org-owned repo
  (personal GitHub auth alone does not work for org repos).
- The OSS stdio bridges live in [`packages/mcp-weather`](../packages/mcp-weather)
  and [`packages/mcp-onboarding`](../packages/mcp-onboarding), so this public
  repo is the indexable artifact.

## Manual steps (require a Glama login as `afisch710`)

1. Sign in at glama.ai (GitHub OAuth).
2. On <https://glama.ai/mcp/servers>, click **Add Server** and submit
   `https://github.com/smarterweather/developer`. Glama indexes tools,
   schemas, and annotations and runs license/security/health checks.
3. On the new server page, run the **Claim ownership** flow (validated
   against `glama.json`). Re-run it after any future `glama.json` change.
4. In the admin UI, configure the Dockerfile form so Glama's sandbox can run
   the stdio bridge (command `npx`, args `-y @smarterweather/mcp-weather`;
   set `SMARTERWEATHER_API_KEY` as a required env var). Deploy → Make
   Release so the quality score is evaluated.
5. If the score page shows "no recent usage", use **Try in Browser** once to
   seed a tool call.

## After the score exists

Update both awesome-mcp-servers PRs, replacing the Connector link with the
badge:

```markdown
[![Glama score](https://glama.ai/mcp/servers/@smarterweather/developer/badges/score.svg)](https://glama.ai/mcp/servers/@smarterweather/developer)
```

(The badge path is `/mcp/servers/@OWNER/REPO/badges/score.svg`; verify the
exact slug from the server page URL after indexing — Glama occasionally
assigns a generated slug instead of `@owner/repo`.)
