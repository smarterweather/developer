# Smarter Weather Developer Documentation

The canonical developer portal lives at
<https://developers.smarterweather.com>; this `docs/` tree mirrors and extends
that material with content best read alongside the source repo.

## Map

| Doc | Surface | Status |
| --- | ------- | ------ |
| [REST API guide](./rest-api.md) | `https://api.smarterweather.com/v1/*` | GA |
| [MCP weather server guide](./mcp-weather.md) | `https://mcp.smarterweather.com` and `@smarterweather/mcp-weather` | GA |
| [MCP onboarding server guide](./mcp-onboarding.md) | `https://mcp.developers.smarterweather.com` and `@smarterweather/mcp-onboarding` | GA |
| [Error model](./errors.md) | RFC 7807 problem details across all surfaces | GA |
| [Quickstart](./quickstart.md) | First REST and MCP call | GA |
| [Agent integration tutorial](./agent-integration.md) | Cursor, Claude Code, Claude Desktop, Codex | GA |
| [SDKs](./sdks.md) | TypeScript, Python, Go | Not yet shipped |

## How this directory is curated

- **Hosted portal is canonical for getting-started UX.** Account creation,
  API keys, plan selection, billing, and dashboards all live at
  <https://developers.smarterweather.com>. Anything UI-driven points there.
  Agents can do the same work through the onboarding MCP server without ever
  opening the dashboard.
- **This repo is canonical for contracts and code.** The OpenAPI spec, MCP tool
  descriptors, npm package source, agent skills, and SDK sources live here and
  are mirrored out from a private repository on change.
- **Status labels are non-decorative.** A doc describing a surface that is not
  yet generally available says so in its opening lines and carries a non-GA
  label in the map above. When the surface ships, the label and the caveat are
  removed in the same PR — a stale "preview" notice on a live endpoint costs us
  more credibility than a missing one.
- **Docs licensing.** Everything in `docs/` is published under
  [CC BY 4.0](../LICENSE-docs); inline code samples are MIT-licensed
  ([LICENSE](../LICENSE)).

## Roadmap

The phase-by-phase rollout, and what remains, is published in the
[repo README's Roadmap section](../README.md#roadmap).

## Filing doc issues

- **Typos / clarifications:** open a PR directly; small doc PRs are
  fast-tracked per [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Contract questions about the OpenAPI surface:** open an issue using the
  "API contract question" template - those route to the team that owns the
  public surface.
- **New examples / cookbooks:** open an issue first so we can scope the topic
  alongside the relevant phase.
