# Repository rulesets (as code)

This directory contains the source-of-truth definitions for GitHub
[repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
applied to this repository.

Each `*.json` file in this directory is one ruleset. The file's `name` field
must match its intended ruleset name on GitHub. The schema follows the
[Create a repository ruleset](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset)
REST API request body.

## Workflow

```
edit .github/rulesets/*.json on a branch
        |
        v
open PR --> CI runs `scripts/validate-rulesets.sh`
        |
        v
merge to main --> CD runs `scripts/apply-rulesets.sh`
```

- **CI** (`.github/workflows/rulesets-ci.yml`) -- on every PR that touches
  this directory or the apply/validate scripts, validates the JSON is
  well-formed and structurally correct. Read-only; no GitHub API calls.
- **CD** (`.github/workflows/rulesets-cd.yml`) -- on push to `main` that
  touches the same paths, upserts each ruleset against the GitHub API. If
  a ruleset with the same `name` already exists it is updated in place;
  otherwise it is created.

## CD prerequisites (one-time)

The workflow `GITHUB_TOKEN` **cannot** manage repository rulesets --
`administration` is not in the [list of permissions](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions#permissions)
that `GITHUB_TOKEN` can be granted at any level. CD therefore requires a
separate token.

Create a repository secret named **`RULESETS_ADMIN_TOKEN`** containing
either:

- A **fine-grained personal access token** (preferred) scoped to this
  repository with the `Administration: Read and write` repository
  permission, OR
- A **GitHub App installation token** generated at job time from an App
  with the same `Administration: Read and write` permission.

Steps for the fine-grained PAT path:

1. <https://github.com/settings/personal-access-tokens/new>
2. **Resource owner**: `smarterweather` (the org)
3. **Repository access**: Only select repositories -> `smarterweather/developer`
4. **Repository permissions**: `Administration` -> Read and write
5. Generate, copy, then paste into
   **Settings -> Secrets and variables -> Actions -> New repository secret**
   with the name `RULESETS_ADMIN_TOKEN`.

The CD workflow fails fast with a clear error if this secret is missing,
so it is safe to merge the workflow first and add the secret afterwards
(though CD won't actually apply rulesets until the secret exists).

## Manual application (local)

You can apply the same ruleset state from a workstation:

```bash
# auth as a user with admin on smarterweather/developer
gh auth status

# upsert every JSON file in .github/rulesets/
./scripts/apply-rulesets.sh smarterweather/developer
```

## Bypass actor IDs

GitHub does not expose a friendly enum for `RepositoryRole` actor IDs. The
well-known stable IDs are:

| ID | Role |
| -- | ---- |
| 1  | Read |
| 2  | Triage |
| 3  | Write |
| 4  | Maintain |
| 5  | Admin |

`protect-main.json` uses `5` (Admin) so that repository administrators can
bypass the rules in a break-glass situation. Bypasses are still logged in
the repo's audit log.

## Adding a new ruleset

1. Create `.github/rulesets/<name>.json`. Set the `name` field to `<name>`.
2. Open a PR. CI will validate the file structure.
3. On merge, CD will create the ruleset.

To delete a ruleset, remove the JSON file **and** delete the ruleset from
the GitHub UI in the same PR. The CD workflow does **not** prune rulesets
that no longer have a corresponding file -- this is intentional, to keep
the workflow safe by default.
