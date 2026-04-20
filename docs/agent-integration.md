# Agent integration tutorial

> **Preview - some referenced surfaces are not yet generally available.**
> The agent skills and the hosted MCP servers they target ship across
> Phase 1b, Phase 3, and Phase 4 of the [public roadmap](../README.md#roadmap).
> The patterns below are stable; the artifacts they reference will be added
> to this repo as each phase lands.

This guide explains how to wire an AI coding agent (Cursor, Claude Code,
Claude Desktop, Codex) into the Smarter Weather developer platform end to
end - from "I have an account" to "my agent is calling the weather API on
my behalf inside my project."

There are two integration patterns. Pick the one that matches the agent
you're using:

- **MCP-native agents** - install the appropriate Smarter Weather MCP server
  and let the agent invoke tools directly.
- **Code-generation agents** - install a "skill" file that teaches the
  agent how to use the REST API, then let the agent write the integration
  code for you.

Most developers use both: MCP for runtime tool calls during agent
sessions, plus a skill so the agent knows the right shape when generating
code that ships to production.

## Pattern 1: MCP-native agents

Smarter Weather ships two MCP packages on npm:

- [`@smarterweather/mcp-weather`](./mcp-weather.md) - bridges to the hosted
  weather MCP server. Use this when you want your agent to call weather
  tools directly during a session.
- [`@smarterweather/mcp-onboarding`](./mcp-onboarding.md) - bridges to the
  hosted onboarding MCP server. Use this once, the first time you set up
  Smarter Weather - it walks the agent through account creation, key
  minting, and writing the right config files.

The recommended onboarding flow is:

1. Install `@smarterweather/mcp-onboarding` in your client. Restart the
   client. Tell the agent "set up Smarter Weather for me." It will OAuth
   you through the dashboard, mint a key, and write the
   `@smarterweather/mcp-weather` config to disk on your behalf.
2. Restart the client again. The weather MCP is now wired in.
3. Optionally remove `@smarterweather/mcp-onboarding` - it has done its
   job.

Per-client config snippets live in
[`docs/mcp-weather.md`](./mcp-weather.md#planned-client-configuration) and
[`docs/mcp-onboarding.md`](./mcp-onboarding.md#planned-client-configuration).
Once the hosted servers go GA, the canonical setup wizard at
<https://smarterweather.com/developers/mcp/setup> will produce the same
snippets pre-filled with your account details.

## Pattern 2: Code-generation agents (Cursor, Claude Code)

When the goal is to **write code that calls the API** - not to invoke tools
during the chat - install the appropriate agent skill. Skills teach the
agent the API shape, the auth model, the error envelope, and idiomatic
patterns in your project's language so generated code is correct on the
first try.

| Agent      | Skill location                     | Status |
| ---------- | ---------------------------------- | ------ |
| Cursor     | [`.cursor/skills/use-smarterweather-api/SKILL.md`](https://github.com/smarterweather/developer/blob/main/.cursor/skills/use-smarterweather-api/SKILL.md) | Available |
| Claude Code| [`.claude/CLAUDE.md`](https://github.com/smarterweather/developer/blob/main/.claude/CLAUDE.md) | Available |
| Codex CLI  | `AGENTS.md` at repo root           | Phase 5 |

To install a skill in your own project, copy the corresponding file (or
the whole `.cursor/skills/use-smarterweather-api/` directory for Cursor)
into your repo at the same path. Most agents auto-discover skills the
next time they index the project; some require a restart.

## Pattern 3 (do not do this): hard-coded keys in agent prompts

Agents that store conversation history in the cloud will exfiltrate any
API key that appears in the prompt. **Never paste a Smarter Weather API key
directly into an agent chat.** Use either:

- An env-var-backed MCP config (`SMARTERWEATHER_API_KEY` from your shell).
- An agent-managed credential store (`secrets:` in Cursor, the Claude Code
  credentials helper, etc.).

The first time you onboard via `@smarterweather/mcp-onboarding`, the
hosted server walks the agent through the env-var path automatically.

## What ships when

| Artifact | Phase |
| -------- | ----- |
| `@smarterweather/mcp-weather` placeholder package | Phase 1b (done) |
| `@smarterweather/mcp-onboarding` placeholder package | Phase 1b (done) |
| Real weather MCP at `mcp.smarterweather.com/mcp` | Phase 3 |
| `@smarterweather/mcp-weather` real implementation | Phase 3 |
| Real onboarding MCP at `developers.smarterweather.com/mcp` | Phase 4 |
| `@smarterweather/mcp-onboarding` real implementation | Phase 4 |
| Cursor skill (`use-smarterweather-api`) | Phase 1b (done) |
| Claude Code instructions (`.claude/`) | Phase 1b (done) |

Watch this repository's [Releases][releases] for the artifact-by-artifact
ship log.

[releases]: https://github.com/smarterweather/developer/releases
