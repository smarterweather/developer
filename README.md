# Smarter Weather Developer Platform

The public home for the Smarter Weather developer platform: SDKs,
documentation, example apps, the `@smarterweather/mcp-server` package, agent
skills, and the OpenAPI specification for `api.smarterweather.com`.

> **Preview.** The Smarter Weather REST API and hosted MCP server are not yet
> generally available. This repository exists to publish the developer-facing
> contracts, SDKs, and integration material as they land. Expect rapid
> iteration on the OpenAPI surface, the dashboard, and the MCP tool catalog
> through the launch sequence outlined in [Roadmap](#roadmap) below. Production
> SLAs and breaking-change policies start at general availability.

---

## What lives here

This repo will fill in over time. At bootstrap it contains governance only.
The intended scope is:

- **OpenAPI specification** (`openapi.yaml`) for the public REST API at
  `https://api.smarterweather.com`. Auto-synced from the canonical source on
  change.
- **`@smarterweather/mcp-server`** -- npm package source for the stdio
  bridge that connects MCP clients (Cursor, Claude Desktop, Claude Code, etc.)
  to the hosted MCP endpoint at `https://mcp.smarterweather.com/mcp`. The
  bridge attaches your API key from `SMARTERWEATHER_API_KEY` and proxies
  every JSON-RPC message; all weather logic runs server-side.
- **Client SDKs** -- TypeScript and Python first; Go to follow.
- **Examples and cookbooks** -- runnable apps, agent integrations, and
  end-to-end recipes.
- **Agent skills** -- `.cursor/skills/` and `.claude/` content that teaches
  AI coding agents how to integrate the Smarter Weather APIs.
- **Documentation** -- guides that complement the developer portal at
  https://smarterweather.com/developers.

What does **not** live here: the Smarter Weather core service, ingestion
pipeline, or any internal infrastructure. Those remain in a separate private
repository.

## Quickstart

The hosted developer dashboard at https://smarterweather.com/developers is
the source of truth for account creation, API key minting, plan management,
and usage. Once you have a key, you can:

```bash
# REST API
curl -H "X-API-Key: $SMARTERWEATHER_API_KEY" \
  "https://api.smarterweather.com/v1/weather?latitude=41.88&longitude=-87.63"
```

```bash
# MCP server (npm package, when published)
npx -y @smarterweather/mcp-server
```

The full quickstart with language-specific snippets lives at
https://smarterweather.com/developers/quickstart.

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

Smarter Weather is building the developer platform in phases; this repo
publishes artifacts as each phase ships.

| Phase | Surface | Target |
| ----- | ------- | ------ |
| 1a | Developer dashboard, API key CRUD, billing, monitoring scaffolding | shipping |
| 1b | This public repository (governance, SDK scaffolding, OpenAPI sync workflow) | in progress |
| 2  | Public REST API (`sw-api`) at `api.smarterweather.com` with usage-based billing | next |
| 2b | First-party migration of the Smarter Weather web and iOS apps onto the public API | follows Phase 2 |
| 3  | Public MCP server (`sw-mcp`) at `mcp.smarterweather.com/mcp` + `@smarterweather/mcp-server` | follows Phase 2 |
| 3b | First-party `wx-chat` migration onto the public MCP | follows Phase 3 |
| 4  | Meta MCP server (`sw-onboarding`) for agent-driven self-service onboarding | follows Phase 3 |
| 5  | SDKs, expanded examples, registry distribution, community growth | ongoing |

The roadmap is published for transparency, not as a commitment. Dates are
intentionally omitted -- watch this repository for releases.

## Contributing

External contributions are welcome on a tiered basis (typo and small SDK
fixes are fast-tracked; new features start with an issue). The OpenAPI
specification is read-only -- contract changes route through issues.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full posture and the
[Code of Conduct](./CODE_OF_CONDUCT.md) for community expectations.

## License

- Code (SDKs, examples, package source, agent skills) is licensed under the
  [MIT License](./LICENSE).
- Documentation and prose (README, `docs/`, `openapi.yaml`) are licensed
  under [Creative Commons Attribution 4.0
  International](./LICENSE-docs).

The Smarter Weather hosted APIs themselves are governed by separate Terms of
Service and Developer Terms.

## Attribution

Smarter Weather builds on data and software from many providers. See
[ATTRIBUTION.md](./ATTRIBUTION.md) for the canonical acknowledgements list.
