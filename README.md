# Smarter Weather Developer Platform

The public home for the Smarter Weather developer platform: SDKs,
documentation, example apps, the `@smarterweather/mcp-weather` and
`@smarterweather/mcp-onboarding` packages, agent skills, and the OpenAPI
specification for `api.smarterweather.com`.

> **Generally available.** The REST API, both hosted MCP servers, and both npm
> stdio bridges are live in production. Breaking-change policy: six months'
> notice before removing a `/v1/*` endpoint or an MCP tool, 90 days before a
> breaking change to a request or response shape. Non-breaking additions ship
> immediately.

| Surface | Endpoint | Auth |
| ------- | -------- | ---- |
| REST API | `https://api.smarterweather.com` | `Authorization: Bearer sw_live_*` / `sw_test_*` |
| Weather MCP | `https://mcp.smarterweather.com/mcp` | API key Bearer, OAuth 2.1 + PKCE, or keyless x402 |
| Onboarding MCP | `https://developers.smarterweather.com/mcp` | Anonymous discovery tools; OAuth for account tools |

---

## What lives here

- **OpenAPI specification** (`openapi.yaml`) for the public REST API at
  `https://api.smarterweather.com`. Auto-synced from the canonical source on
  change. Also served at
  <https://developers.smarterweather.com/openapi.yaml>.
- **MCP tool descriptors** (`descriptors/mcp-tools.json`) -- the canonical
  catalog for the weather MCP server, synced on every server change.
- **`@smarterweather/mcp-weather`** -- npm package source for the stdio
  bridge that connects MCP clients (Cursor, Claude Desktop, Claude Code, etc.)
  to the hosted MCP endpoint at `https://mcp.smarterweather.com/mcp`. The
  bridge attaches your API key from `SMARTERWEATHER_API_KEY` and proxies
  every JSON-RPC message; all weather logic runs server-side.
- **`@smarterweather/mcp-onboarding`** -- npm package source for the stdio
  bridge to the developer-onboarding MCP server at
  `https://developers.smarterweather.com/mcp`. Provides agent-driven
  self-service account creation, API key provisioning, and SDK setup
  walkthroughs. Auth via OAuth (browser callback).
- **Client SDKs** -- TypeScript and Python first; Go to follow. Not yet
  shipped; call the REST API directly in the meantime.
- **Examples and cookbooks** -- runnable apps, agent integrations, and
  end-to-end recipes.
- **Agent Plugins** -- [`plugins/smarterweather/`](./plugins/smarterweather/)
  is the long-lived [Agent Plugins 1.0](https://agent-plugins.org/) package
  (weather MCP + playbooks).
  [`plugins/smarterweather-onboarding/`](./plugins/smarterweather-onboarding/)
  is the one-shot signup / key-mint install; remove it after
  `configure_mcp`. Never put both servers in one `mcp.json`. Cursor
  Marketplace discovery uses
  [`.cursor-plugin/marketplace.json`](./.cursor-plugin/marketplace.json).
  [`.cursor/skills/use-smarterweather-api/`](./.cursor/skills/use-smarterweather-api/SKILL.md)
  is a pointer at the weather skills; [`.claude/CLAUDE.md`](./.claude/CLAUDE.md)
  remains a follow-up refresh.
- **Documentation** -- guides under [`docs/`](./docs/) that complement the
  developer portal at https://developers.smarterweather.com. See the
  [docs index](./docs/README.md) for the current map.

What does **not** live here: the Smarter Weather core service, ingestion
pipeline, or any internal infrastructure. Those remain in a separate private
repository.

## Quickstart

The hosted developer portal at https://developers.smarterweather.com is
the source of truth for account creation, API key minting, plan management,
and usage. Agents can do all of it without the dashboard by connecting to the
onboarding MCP server — see [docs/mcp-onboarding.md](./docs/mcp-onboarding.md).

Once you have a key:

```bash
# REST API
curl -H "Authorization: Bearer $SMARTERWEATHER_API_KEY" \
  "https://api.smarterweather.com/v1/weather?lat=41.88&lon=-87.63"
```

```bash
# Weather MCP bridge (defaults to https://mcp.smarterweather.com/mcp;
# override via SMARTERWEATHER_MCP_URL).
npx -y @smarterweather/mcp-weather --version
```

The full quickstart with language-specific snippets lives at
https://developers.smarterweather.com/quickstart. Agents should start from
[`llms.txt`](./llms.txt) or [`AGENTS.md`](./AGENTS.md).

## Getting help

- **Bug reports and feature requests** -- file an issue on this repo using
  the templates in the issue chooser.
- **API contract questions** -- file an issue with the "API contract
  question" template; these route to the team that owns the public surface.
- **General "how do I do X?" questions** -- start a thread in
  [Discussions](https://github.com/smarterweather/developer/discussions). We
  prefer Discussions over chat platforms because answers stay searchable.
- **Account, billing, or commercial inquiries** -- email
  alex@smarterweather.com or use the [contact
  page](https://smarterweather.com/contact).
- **Security issues** -- see [SECURITY.md](./SECURITY.md). Please do not
  open public issues for security reports.

## Roadmap

Smarter Weather built the developer platform in phases; this repo publishes
artifacts as each one ships.

| Phase | Surface | Status |
| ----- | ------- | ------ |
| 1a | Developer dashboard, API key CRUD, billing, monitoring | shipped |
| 1b | This public repository (contracts, package sources, OpenAPI + descriptor sync) | shipped |
| 2  | Public REST API (`sw-api`) at `api.smarterweather.com` with usage-based billing | shipped |
| 2b | First-party migration of the Smarter Weather web and iOS apps onto the public API | shipped |
| 3  | Public MCP server (`sw-mcp`) at `mcp.smarterweather.com/mcp` + `@smarterweather/mcp-weather` | shipped |
| 4  | Onboarding MCP server (`sw-onboarding`) + `@smarterweather/mcp-onboarding` | shipped |
| 5  | SDKs, expanded examples, registry distribution, community growth | in progress |

The roadmap is published for transparency, not as a commitment. Dates are
intentionally omitted -- watch this repository for releases.

## Contributing

External contributions are welcome on a tiered basis (typo and small SDK
fixes are fast-tracked; new features start with an issue). The OpenAPI
specification is read-only -- contract changes route through issues.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full posture and the
[Code of Conduct](./CODE_OF_CONDUCT.md) for community expectations.

## License

- **Code** -- SDKs, examples, the `@smarterweather/mcp-weather` and
  `@smarterweather/mcp-onboarding` package sources, and any agent skills or
  scaffolding are licensed under the [MIT License](./LICENSE).
- **Documentation and prose** -- this README, anything under `docs/`, and
  `openapi.yaml` (when present) are licensed under [Creative Commons
  Attribution 4.0 International](./LICENSE-docs).

Where any file's intended license is ambiguous (for example, a tutorial that
mixes prose and code samples), assume MIT for the code blocks and CC BY 4.0
for the surrounding prose.

The Smarter Weather hosted APIs and services themselves are governed by
separate Terms of Service and Developer Terms at
https://smarterweather.com/terms and
https://developers.smarterweather.com/legal/terms.
This repository contains client-side and documentation artifacts only; access
to the hosted APIs requires a separate agreement.

## Attribution

Smarter Weather builds on data and software from many providers. See
[ATTRIBUTION.md](./ATTRIBUTION.md) for the canonical acknowledgements list.
