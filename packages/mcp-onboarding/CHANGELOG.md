# @smarterweather/mcp-onboarding

## 0.0.0-preview.2

### Patch Changes

- [#7](https://github.com/smarterweather/developer/pull/7) [`fea62d6`](https://github.com/smarterweather/developer/commit/fea62d68aca0e8ec323b5bd61bc757516898ada9) Thanks [@afisch710](https://github.com/afisch710)! - Correct the placeholder's hosted-server URL from `https://onboarding.smarterweather.com` to `https://developers.smarterweather.com/mcp`. Per the developer-platform domain registry (issue #7155, ADR-002), the meta MCP server (sw-onboarding) is co-hosted with the developer portal at `developers.smarterweather.com/mcp` via path-based CloudFront routing — `onboarding.smarterweather.com` is reserved for an unrelated future B2B product.

## 0.0.0-preview.1

### Patch Changes

- Initial preview placeholder. Bridge to https://developers.smarterweather.com/mcp — not yet functional. Real implementation ships in Phase 4 of the developer ecosystem rollout.
