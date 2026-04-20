# Smarter Weather Developer Documentation

> **Preview.** The Smarter Weather public REST API and hosted MCP server are
> not yet generally available. The pages below describe the planned developer
> surface. Each page is clearly marked with its current status. The canonical
> developer portal lives at <https://smarterweather.com/developers>; this `docs/`
> tree mirrors and extends that material with content best read alongside the
> source repo.

## Map

| Doc | Surface | Status |
| --- | ------- | ------ |
| [REST API guide](./rest-api.md) | `https://api.smarterweather.com/v1/*` | Preview - shape only |
| [MCP weather server guide](./mcp-weather.md) | `https://mcp.smarterweather.com/mcp` and `@smarterweather/mcp-weather` | Preview - placeholder package shipping |
| [MCP onboarding server guide](./mcp-onboarding.md) | `https://developers.smarterweather.com/mcp` and `@smarterweather/mcp-onboarding` | Preview - placeholder package shipping |
| [SDKs](./sdks.md) | TypeScript, Python, Go (planned) | Not yet shipped |
| [Agent integration tutorial](./agent-integration.md) | Cursor, Claude Code, Claude Desktop, Codex | Preview - skills land in Phase 1b/3 |

## How this directory is curated

- **Hosted portal is canonical for getting-started UX.** Account creation,
  API keys, plan selection, billing, and dashboards all live at
  <https://smarterweather.com/developers>. Anything UI-driven points there.
- **This repo is canonical for contracts and code.** The OpenAPI spec, npm
  package source, agent skills, and SDK sources live here and are mirrored
  out from a private repository on change.
- **Preview banners are non-decorative.** Every doc that describes a not-yet-GA
  surface starts with a `> **Preview.**` banner. When a phase ships, the
  banner is removed in the same PR that flips the page to GA content.
- **Docs licensing.** Everything in `docs/` is published under
  [CC BY 4.0](../LICENSE-docs); inline code samples are MIT-licensed
  ([LICENSE](../LICENSE)).

## Roadmap

The phase-by-phase rollout that determines when each doc graduates from
"preview" to "GA" is published in the [repo README's Roadmap
section](../README.md#roadmap).

## Filing doc issues

- **Typos / clarifications:** open a PR directly; small doc PRs are
  fast-tracked per [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Contract questions about the OpenAPI surface:** open an issue using the
  "API contract question" template - those route to the team that owns the
  public surface.
- **New examples / cookbooks:** open an issue first so we can scope the topic
  alongside the relevant phase.
