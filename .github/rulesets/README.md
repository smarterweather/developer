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
that `GITHUB_TOKEN` can be granted at any level. CD therefore mints a
short-lived installation token at job time from a dedicated GitHub App
([per GitHub's own guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#about-personal-access-tokens)
for org-owned automation).

### One-time setup

1. **Create the App** at
   <https://github.com/organizations/smarterweather/settings/apps/new>:
   - **GitHub App name**: `smarterweather-rulesets-cd`
   - **Webhook**: uncheck *Active* (no webhooks needed)
   - **Repository permissions**: `Administration` -> **Read and write**
     (no other permissions)
   - **Where can this GitHub App be installed?**: *Only on this account*
2. After creation, scroll to **Private keys** -> **Generate a private
   key**. Save the downloaded `.pem` file.
3. Note the **App ID** at the top of the App's settings page.
4. Left sidebar -> **Install App** -> install on `smarterweather`,
   scoped to *Only select repositories* -> `developer`.
5. Add two repository secrets at
   <https://github.com/smarterweather/developer/settings/secrets/actions>:
   - `RULESETS_APP_ID` -- the App ID (an integer).
   - `RULESETS_APP_PRIVATE_KEY` -- the entire contents of the `.pem`
     file, including the `-----BEGIN/END-----` lines.

The CD workflow fails fast with a clear error if either secret is
missing, so it is safe to merge the workflow before completing setup
(though CD won't apply anything until both secrets exist).

### Why a GitHub App and not a PAT

- **No seat cost.** Apps are not users; they don't consume Team-plan
  seats. Outside Collaborators on the org can't create fine-grained
  PATs scoped to the org, and adding the bot as a Member would burn a
  $4/mo seat.
- **No expiry to babysit.** Installation tokens are minted fresh each
  workflow run via `actions/create-github-app-token` and live for ~1
  hour. There is no annual rotation.
- **Org-owned identity.** Audit log shows the App as the actor, not a
  human user.
- **Narrow scope.** The App only has `Administration: Read and write`
  on `smarterweather/developer`. Nothing else.

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
