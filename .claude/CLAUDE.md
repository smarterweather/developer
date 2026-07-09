# Smarter Weather Developer Platform — Claude Code instructions

> This file lives in the [public Smarter Weather developer repo](https://github.com/smarterweather/developer).
> It serves two audiences:
>
> 1. **Claude Code sessions running inside this repo** (contributors). Treat
>    it as project memory.
> 2. **Developers integrating Smarter Weather into their own projects.** Copy
>    this file to `.claude/CLAUDE.md` (or `CLAUDE.md` at the repo root) of
>    your project. Claude Code will pick it up automatically on the next
>    session.

> **Preview.** The Smarter Weather public REST API
> (`api.smarterweather.com`) ships in **Phase 2**; the hosted MCP server
> (`mcp.smarterweather.com`) and the real `@smarterweather/mcp-weather`
> implementation ship in **Phase 3**. Until then, the npm package is a
> placeholder that exits with a status line. The contracts described
> below are the planned launch shapes — write code against them and
> refactor when the spec lands. Roadmap:
> <https://github.com/smarterweather/developer#roadmap>.

## What Smarter Weather offers

Two surfaces, one platform:

- **REST API** at `https://api.smarterweather.com/v1/*` — call from your
  service, your script, your build pipeline. Authenticated with an API key
  passed as an HTTP Bearer token (`Authorization: Bearer sw_live_*`).
- **MCP server** at `https://mcp.smarterweather.com/mcp`, accessed via the
  npm bridge package
  [`@smarterweather/mcp-weather`](https://www.npmjs.com/package/@smarterweather/mcp-weather).
  Wires weather tools directly into MCP-capable agents (Claude Code,
  Claude Desktop, Cursor, Codex). Same API key.

| If the user wants… | Use |
| --- | --- |
| Code that runs in production and queries weather data | REST |
| To call weather tools live during a chat session | MCP |
| Guided onboarding (account creation, key minting) | `@smarterweather/mcp-onboarding` (Phase 4) |

For code-generation work (the typical Claude Code task), default to REST.
Suggest MCP only when the user is explicitly asking to wire weather into
their own agent runtime.

## Authentication — read this before writing any code

Every Smarter Weather request needs an API key. Hard rules:

- **Never** hard-code keys in source files. Read from
  `process.env.SMARTERWEATHER_API_KEY` (Node), `os.environ` (Python), or
  the equivalent for the language at hand.
- **Never** paste a key into a chat message, prompt, or commit.
- **Never** commit a key, even on a private branch — Smarter Weather
  participates in GitHub's secret-scanning partner program and will
  auto-revoke leaked keys.
- Use `sw_test_*` keys when generating examples, tests, or local dev
  scaffolds. Use `sw_live_*` keys for production paths.
- Keys are minted at
  <https://smarterweather.com/developers/dashboard/api-keys>. If the user
  doesn't have one, point them there — do not try to mint one
  programmatically.

## REST API — at a glance

| Item | Value |
| --- | --- |
| Base URL | `https://api.smarterweather.com` |
| Versioning | Path-based: `/v1/*` |
| Auth | `Authorization: Bearer $SMARTERWEATHER_API_KEY` (`X-API-Key` is **not** supported) |
| Response | `application/json; charset=utf-8` (success), `application/problem+json` (errors) |

### Planned endpoints (Phase 2 launch)

- `GET /v1/health` — liveness probe; unauthenticated.
- `GET /v1/weather?lat=<lat>&lon=<lon>` — unified response with
  current conditions, hourly forecast, daily forecast, active alerts, and
  radar metadata in a single call. Prefer it over fanning out to multiple
  endpoints; the "one call, full picture" shape is intentional.

If an endpoint isn't listed here or in
[`docs/rest-api.md`](https://github.com/smarterweather/developer/blob/main/docs/rest-api.md),
it doesn't exist yet. Don't fabricate paths.

### Worked example — TypeScript

```ts
const apiKey = process.env.SMARTERWEATHER_API_KEY;
if (!apiKey) {
  throw new Error("SMARTERWEATHER_API_KEY is not set");
}

const res = await fetch(
  "https://api.smarterweather.com/v1/weather?lat=41.88&lon=-87.63",
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  },
);

if (!res.ok) {
  // Errors are RFC 7807 application/problem+json documents.
  const problem = await res.json().catch(() => ({}));
  throw new Error(
    `SmarterWeather ${res.status}: ${problem?.type ?? "unknown"} - ${problem?.detail ?? res.statusText}`,
  );
}

const weather = await res.json();
console.log(weather.current.temperature);
```

### Worked example — Python

```python
import os
import httpx

resp = httpx.get(
    "https://api.smarterweather.com/v1/weather",
    params={"lat": 41.88, "lon": -87.63},
    headers={
        "Authorization": f"Bearer {os.environ['SMARTERWEATHER_API_KEY']}",
        "Accept": "application/json",
    },
    timeout=10.0,
)
resp.raise_for_status()
weather = resp.json()
```

### Errors

Errors are RFC 7807 `application/problem+json` documents. Always parse
the problem body; surface `type` and `instance` (or the `X-Request-Id`
header) when reporting to the user.

```json
{
  "type": "https://smarterweather.com/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "lat must be between -90 and 90",
  "instance": "/v1/weather"
}
```

| HTTP | Meaning | Retry? |
| --- | --- | --- |
| 400/422 | Caller mistake | No |
| 401/403 | Auth problem | No — check env, re-mint |
| 404 | Not found | No |
| 429 | Rate-limited | Yes — see below |
| 5xx | Server error | Yes — exponential backoff |

### Rate limits

Every authenticated response carries the IETF draft `RateLimit-Limit`,
`RateLimit-Remaining`, `RateLimit-Reset`, and `RateLimit-Policy` headers,
plus `RateLimit-Daily-*` for the per-day quota. On `429`, prefer
`Retry-After` (seconds) when present; otherwise back off exponentially
starting at 1 second with jitter, max 5 retries. Pre-empt 429s in
production by pacing when `RateLimit-Remaining` drops near zero.

## MCP — when the user is wiring an agent

If the user wants Claude Code itself (or another MCP client) to call
weather tools during a session, install the bridge:

```jsonc
// .mcp.json (project-scoped, recommended) or ~/.config/claude/mcp.json (global)
{
  "mcpServers": {
    "smarterweather-weather": {
      "command": "npx",
      "args": ["-y", "@smarterweather/mcp-weather"],
      "env": { "SMARTERWEATHER_API_KEY": "<inherited from shell>" }
    }
  }
}
```

Tell the user to set `SMARTERWEATHER_API_KEY` in their shell profile
(`.zshrc`, `.bashrc`) so the MCP client inherits it from the process
environment — pasting the key directly into the JSON config writes it to
disk in cleartext.

The bridge is a thin stdio-to-streamable-HTTP proxy; all weather logic
runs server-side.

## Anti-patterns to avoid

1. **Hard-coding API keys.** Always read from env vars.
2. **Calling `/v1/weather` in a tight loop.** Cache responses for 60-300
   seconds for current conditions; longer for forecasts.
3. **Treating 5xx as terminal.** Retry server errors; only treat 4xx as
   caller errors.
4. **Calling production from tests.** Use `sw_test_*` keys; mock where
   practical.
5. **Inventing endpoints.** If it isn't in this file or the docs, it
   doesn't exist.
6. **Editing `openapi.yaml` directly in this repo.** The OpenAPI spec is
   read-only; it's mirrored from a private repo. Contract questions go
   through the [API contract question][contract] issue template.

[contract]: https://github.com/smarterweather/developer/issues/new?template=api_contract_question.yml

## When working *in* this repo (contributors only)

- Public repo lives at <https://github.com/smarterweather/developer>;
  default branch is `main`.
- npm packages live under `packages/`. Versioning is via
  [Changesets](https://github.com/changesets/changesets) — when changing
  package source, add a changeset (`npx changeset`) before opening the PR.
- Docs live under `docs/` and follow the preview-banner convention; see
  [`docs/README.md`](https://github.com/smarterweather/developer/blob/main/docs/README.md).
- See [CONTRIBUTING.md](https://github.com/smarterweather/developer/blob/main/CONTRIBUTING.md)
  for the contribution-tier model — typo and SDK-bug PRs are fast-tracked;
  contract changes route through issues.

## Pointers

- **Public repo:** <https://github.com/smarterweather/developer>
- **Developer portal:** <https://smarterweather.com/developers>
- **REST guide:** [`docs/rest-api.md`](https://github.com/smarterweather/developer/blob/main/docs/rest-api.md)
- **MCP weather guide:** [`docs/mcp-weather.md`](https://github.com/smarterweather/developer/blob/main/docs/mcp-weather.md)
- **Agent integration tutorial:** [`docs/agent-integration.md`](https://github.com/smarterweather/developer/blob/main/docs/agent-integration.md)
