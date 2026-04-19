# Contributing to the Smarter Weather Developer Platform

Thanks for taking the time to look. This document explains what kinds of
contributions are welcome, how to get the most out of your time, and the
ground rules that let a small team support the project sustainably.

## What this repository is

A public surface for the Smarter Weather developer platform. The pieces it
holds are:

- The OpenAPI specification for the public REST API
- The `@smarterweather/mcp-server` package source
- Client SDKs (TypeScript, Python, Go)
- Examples, cookbooks, and integration recipes
- Agent skills (`.cursor/skills/`, `.claude/`)
- Developer-facing documentation and tutorials

## What this repository is not

The Smarter Weather core service, ingestion pipeline, billing infrastructure,
and internal tooling are not in this repo. They live in a separate private
repository, and changes to them are scoped to the team that operates the
platform.

## Posture, in one paragraph

Smarter Weather is a small product with a public surface. We publish this
repository to make integrations transparent, give developers a place to file
bugs, and make our SDKs and examples improvable in the open. We are
deliberately **not** running this as a community-driven open-source project
with broad design-by-committee. Contributions are welcome where they fit
within the tiered model below; everything else routes through an issue first
so we can scope the work before someone burns time on a PR that won't merge.

## Contribution tiers

Decide which tier fits your change before you open a PR. If you're not sure,
**open an issue first** and ask -- this saves both of us time.

### Tier 1: Always welcome, fast review

- Typo fixes and grammar corrections in any prose
- Documentation clarifications, broken-link fixes, missing-detail follow-ups
- Bug fixes in SDKs (with a reproduction)
- Bug fixes in examples (with a description of what broke)
- Test additions that cover existing behavior
- Dependency updates surfaced by Dependabot, when CI is green

For Tier 1 changes you can open a PR directly. Keep the change focused -- one
logical change per PR.

### Tier 2: Open an issue first

- New SDK features (new methods, new helper utilities, ergonomic improvements)
- New examples or cookbook recipes
- New agent skills or substantial revisions to existing ones
- Refactors that touch SDK public surface area
- Adding support for a new SDK language we don't ship today

The issue lets us confirm scope, point out related in-flight work, and avoid
the case where a PR lands but doesn't match the direction we're headed.

### Tier 3: Routes through the private repository

- Changes to the OpenAPI specification (`openapi.yaml`). The spec is
  generated from the canonical source in our private repository -- PRs
  modifying it directly will be politely closed with a pointer to file an
  issue describing the contract change you'd like to see.
- Changes to API behavior, response shapes, or error contracts.
- New endpoints, new MCP tools, new authentication flows.
- Anything that affects the hosted service.

For Tier 3 work, open an issue using the **API contract question** template.
The team will discuss it, and if accepted, the change will be implemented in
the private repo and synced here.

### Out of scope

- Renaming things for stylistic preference without a substantive bug
- Reformatting whole files (we run a formatter; please don't reformat by hand)
- Adding new dependencies to existing packages without a discussion
- Translations -- we don't have an internationalization process yet; please
  open an issue if this is important to you so we can scope it

## Filing a good bug report

Use the **Bug report** issue template. The most useful bug reports include:

- Which SDK, package version, and runtime you're using
- A minimal reproduction (10 lines is better than 100)
- The actual error or unexpected output, copied verbatim
- What you expected to happen instead
- Any relevant environment details (OS, Node/Python/Go version, etc.)

If your bug involves an API key, **please redact it** before pasting logs.
We plan to participate in GitHub's secret-scanning partner program, but
treat your keys as live until you have rotated them yourself.

## Filing a good feature request

Use the **Feature request** issue template. Frame the request as:

1. The problem you're solving (the use case, not the implementation)
2. What you currently do as a workaround, if anything
3. The proposal, including any API or interface sketches
4. Alternatives you considered

Feature requests against the public API contract should use the **API
contract question** template instead.

## Filing an API contract question

Use the **API contract question** template for anything that would change the
behavior, shape, or surface of `api.smarterweather.com` or
`mcp.smarterweather.com`. These get triaged into the platform roadmap; the
issue is the right place even if you also want to send a PR for a docs or SDK
change to match.

## Discussions vs. issues

| Use this | For |
| -------- | --- |
| [GitHub Discussions](https://github.com/smarterweather/developer/discussions) | "How do I...?", "Has anyone...?", design conversations, show-and-tells |
| Issues | Bugs, feature requests, contract questions, anything actionable |

Discussions stay searchable and indexed by Google, which makes them more
useful than chat platforms for the kind of help most developers need. We
intentionally don't run a Discord or Slack today.

## Pull request workflow

1. Fork the repository.
2. Create a branch from `main` (e.g. `fix/typo-in-quickstart`).
3. Make your change. Keep PRs small and focused.
4. Run any package-level tests, linters, or formatters before committing
   (each subdirectory should describe its own setup).
5. Open the PR using the template. Reference the related issue if there is
   one.
6. CI runs against the PR. Fix any failures before requesting review.
7. A maintainer reviews. Expect comments; the bar is "good enough that we'd
   write it ourselves," not "perfect."
8. Squash-merged on approval.

## Licensing and certificate of origin

By submitting a contribution, you agree that:

- Your contribution is licensed under the MIT License (for code) or CC BY 4.0
  (for documentation), matching this repository's [LICENSE](./LICENSE) and
  [LICENSE-docs](./LICENSE-docs).
- You have the right to submit the contribution -- it is your original work,
  or you have permission from the copyright holder, and contributing it does
  not violate any agreement you have.

We do not require a separate Contributor License Agreement (CLA) or signed
Developer Certificate of Origin (DCO) at this time. Opening a PR is the
agreement.

## Code of Conduct

All contributors and participants in this repository are expected to follow
the [Code of Conduct](./CODE_OF_CONDUCT.md). Please report any incidents per
the contact information in that document.

## Thanks

Even reading this far is appreciated. If anything in this guide is unclear,
[open a Discussion](https://github.com/smarterweather/developer/discussions)
and ask -- improving the contribution guide itself is also welcome.
