#!/usr/bin/env bash
# Upserts every ruleset defined in .github/rulesets/*.json against the
# specified repository.
#
# Usage:
#   ./scripts/apply-rulesets.sh <owner>/<repo>
#
# Authentication:
#   Uses `gh` CLI auth, which honors GH_TOKEN / GITHUB_TOKEN env vars.
#   The token must have `administration: write` scope on the target repo.
#
# Behavior:
#   - For each .github/rulesets/*.json:
#       * If a ruleset with the same `name` exists -> PUT (update).
#       * Otherwise -> POST (create).
#   - Rulesets that exist on GitHub but have no corresponding file are
#     LEFT ALONE. This is intentional. Delete via the UI if you mean it.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <owner>/<repo>" >&2
  exit 2
fi

REPO="$1"
RULESETS_DIR="${RULESETS_DIR:-.github/rulesets}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required but not installed" >&2
  exit 2
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required but not installed" >&2
  exit 2
fi

if [[ ! -d "$RULESETS_DIR" ]]; then
  echo "error: $RULESETS_DIR does not exist" >&2
  exit 2
fi

shopt -s nullglob
files=("$RULESETS_DIR"/*.json)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "no ruleset files found in $RULESETS_DIR (nothing to apply)"
  exit 0
fi

# Fetch existing rulesets once so we can map name -> id.
echo "fetching existing rulesets for $REPO..."
existing_json="$(gh api "/repos/$REPO/rulesets" --paginate)"

for f in "${files[@]}"; do
  name="$(jq -r '.name' "$f")"
  echo "----"
  echo "applying: $f (name=$name)"

  existing_id="$(jq -r --arg n "$name" '.[] | select(.name==$n) | .id' <<<"$existing_json" | head -n1)"

  if [[ -n "$existing_id" && "$existing_id" != "null" ]]; then
    echo "  updating existing ruleset id=$existing_id"
    gh api \
      --method PUT \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO/rulesets/$existing_id" \
      --input "$f" >/dev/null
    echo "  updated."
  else
    echo "  creating new ruleset"
    gh api \
      --method POST \
      -H "Accept: application/vnd.github+json" \
      "/repos/$REPO/rulesets" \
      --input "$f" >/dev/null
    echo "  created."
  fi
done

echo "----"
echo "done."
