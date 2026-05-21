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

## Releases & dist-tags

Releases are driven end-to-end by [`changesets/action`](https://github.com/changesets/action) in [`.github/workflows/release.yml`](../.github/workflows/release.yml). When a changeset hits `main`, the action either:

- opens a `Version Packages` PR that bumps the affected `package.json`s and the package `CHANGELOG.md`s, or
- (after that PR merges) runs `changeset publish` to push the new versions to npm.

The publish path uses npm **trusted publishing** (OIDC), so no long-lived publish credential is stored in this repo.

### `NPM_TOKEN` (optional, but recommended while we're in pre-release mode)

The release workflow also runs a post-publish step that walks the just-published versions, identifies prereleases (semver with a `-` segment, e.g. `0.0.0-preview.2`), and repoints the dist-tag declared in `.changeset/pre.json` (currently `preview`) onto each one.

Why: Changesets refuses to publish a prerelease as the `latest` dist-tag's *only* known version of a never-stably-released package, because that would break `npm install <pkg>` for everyone who doesn't specify a tag. Until a package cuts a `1.0.0`-style stable release, Changesets routes its prerelease publishes to `latest` regardless of `publishConfig.tag`, leaving the configured `preview` tag frozen on the first-ever published version. The repoint step is what keeps `@smarterweather/<pkg>@preview` resolving to "the newest prerelease" instead of "whatever shipped first." Context: [SmarterWeather#8090](https://github.com/afisch710/SmarterWeather/issues/8090).

The npm dist-tag API is **not** covered by OIDC trusted publishing, so this step needs a classic `NPM_TOKEN` secret with the `automation` access level scoped to the `@smarterweather` org:

1. <https://www.npmjs.com/settings/<user>/tokens> -> **Generate New Token** -> **Granular Access Token**
2. Permissions: `Read and write` on the `@smarterweather` package scope only.
3. Expiration: pick the shortest viable window (e.g. 90 days). Rotate on a calendar reminder.
4. Add to this repo as `NPM_TOKEN` under Settings -> Secrets and variables -> Actions.

If `NPM_TOKEN` is absent the publish step still succeeds (the package itself ships fine via OIDC), but the workflow logs a `::warning::` line with the exact `npm dist-tag add ...` commands a maintainer needs to run by hand.

Once any package in this repo cuts a non-prerelease release (via `npx changeset pre exit` followed by a stable `changeset` + version PR), the post-publish repoint step becomes a no-op for that package -- `latest` correctly tracks the stable release and Changesets honors `publishConfig.tag` for subsequent prereleases.
