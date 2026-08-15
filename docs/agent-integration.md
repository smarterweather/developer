# Agent integration tutorial

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
[`docs/mcp-weather.md`](./mcp-weather.md) and
[`docs/mcp-onboarding.md`](./mcp-onboarding.md). The setup page at
<https://developers.smarterweather.com/mcp-server/setup> has one-click
install buttons for Cursor, Claude Code, and VS Code.

## Pattern 2: Code-generation agents (Cursor, Claude Code)

When the goal is to **write code that calls the API** - not to invoke tools
during the chat - install the appropriate agent skill. Skills teach the
agent the API shape, the auth model, the error envelope, and idiomatic
patterns in your project's language so generated code is correct on the
first try.

| Agent      | Skill location                     | Status |
| ---------- | ---------------------------------- | ------ |
| Any Agent Plugins client | [`plugins/smarterweather/`](https://github.com/smarterweather/developer/tree/main/plugins/smarterweather) (`smarterweather-api` + `smarterweather-mcp`) | Available |
| Cursor     | Same plugin; Marketplace source is `.cursor-plugin/marketplace.json` | Available |
| Claude Code| [`.claude/CLAUDE.md`](https://github.com/smarterweather/developer/blob/main/.claude/CLAUDE.md) | Available (refresh pending) |
| Codex CLI  | [`AGENTS.md`](https://github.com/smarterweather/developer/blob/main/AGENTS.md) at repo root | Available |

To install the playbooks in your own project, install the
`plugins/smarterweather` Agent Plugin (or copy the skill directories
under `plugins/smarterweather/skills/`). Most agents auto-discover
skills the next time they index the project; some require a restart.

Hosted equivalents, for agents that fetch rather than clone, are published
under <https://developers.smarterweather.com/.well-known/skills/> and indexed
in [`skills/index.json`](https://developers.smarterweather.com/.well-known/skills/index.json).

## Pattern 3 (do not do this): hard-coded keys in agent prompts

Agents that store conversation history in the cloud will exfiltrate any
API key that appears in the prompt. **Never paste a Smarter Weather API key
directly into an agent chat.** Use either:

- An env-var-backed MCP config (`SMARTERWEATHER_API_KEY` from your shell).
- An agent-managed credential store (`secrets:` in Cursor, the Claude Code
  credentials helper, etc.).

The first time you onboard via `@smarterweather/mcp-onboarding`, the
hosted server walks the agent through the env-var path automatically.

Watch this repository's [Releases][releases] for the artifact-by-artifact
ship log.

[releases]: https://github.com/smarterweather/developer/releases
