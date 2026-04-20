# `@smarterweather/*` packages

This directory hosts the publishable npm packages in the Smarter Weather developer ecosystem. Each package is self-contained under `packages/<pkg>/` and independently versioned via [Changesets](https://github.com/changesets/changesets).

## Packages

| Package | Purpose | Roadmap phase | Status |
| ------- | ------- | ------------- | ------ |
| [`@smarterweather/mcp-weather`](./mcp-weather) | stdio bridge to the hosted weather MCP server at `mcp.smarterweather.com`. Authenticates via `SMARTERWEATHER_API_KEY`. | Phase 3 | preview placeholder |
| [`@smarterweather/mcp-onboarding`](./mcp-onboarding) | stdio bridge to the hosted developer-onboarding MCP server at `developers.smarterweather.com/mcp`. Authenticates via OAuth (browser callback). | Phase 4 | preview placeholder |

Both packages currently ship a single `console.log` placeholder that exits cleanly. The real implementations land in their respective phases of the [public roadmap](../README.md#roadmap).

## Adding a new package

1. Create `packages/<pkg>/` with the same file layout as the existing packages.
2. Pick a unique scoped name under `@smarterweather/`.
3. Wire it into `.github/workflows/packages-ci.yml`'s matrix.
4. Open a PR with a changeset (`npx changeset`) declaring the initial version.

The release workflow will pick it up automatically once it lands on `main`.
