#!/usr/bin/env bash
# Validates every ruleset definition in .github/rulesets/*.json.
#
# Checks:
#   1. File parses as JSON.
#   2. Required top-level fields are present (name, target, enforcement, rules).
#   3. The "name" field matches the filename (stem).
#   4. "enforcement" is one of: disabled | active | evaluate.
#   5. "target" is one of: branch | tag | push.
#
# Does NOT call the GitHub API. Safe to run on PRs from forks.

set -euo pipefail

RULESETS_DIR="${RULESETS_DIR:-.github/rulesets}"

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
  echo "no ruleset files found in $RULESETS_DIR (nothing to validate)"
  exit 0
fi

fail=0

for f in "${files[@]}"; do
  echo "validating: $f"

  if ! jq -e . "$f" >/dev/null 2>&1; then
    echo "  FAIL: not valid JSON" >&2
    fail=1
    continue
  fi

  stem="$(basename "$f" .json)"
  name="$(jq -r '.name // empty' "$f")"
  target="$(jq -r '.target // empty' "$f")"
  enforcement="$(jq -r '.enforcement // empty' "$f")"
  rules_len="$(jq -r '.rules | length // 0' "$f")"

  if [[ -z "$name" ]]; then
    echo "  FAIL: missing required field .name" >&2
    fail=1
  elif [[ "$name" != "$stem" ]]; then
    echo "  FAIL: .name ('$name') must match filename stem ('$stem')" >&2
    fail=1
  fi

  if [[ -z "$target" ]]; then
    echo "  FAIL: missing required field .target" >&2
    fail=1
  elif [[ "$target" != "branch" && "$target" != "tag" && "$target" != "push" ]]; then
    echo "  FAIL: .target ('$target') must be branch | tag | push" >&2
    fail=1
  fi

  if [[ -z "$enforcement" ]]; then
    echo "  FAIL: missing required field .enforcement" >&2
    fail=1
  elif [[ "$enforcement" != "active" && "$enforcement" != "disabled" && "$enforcement" != "evaluate" ]]; then
    echo "  FAIL: .enforcement ('$enforcement') must be active | disabled | evaluate" >&2
    fail=1
  fi

  if [[ "$rules_len" -eq 0 ]]; then
    echo "  FAIL: .rules must be a non-empty array" >&2
    fail=1
  fi

  if [[ $fail -eq 0 ]]; then
    echo "  ok ($rules_len rule(s), enforcement=$enforcement, target=$target)"
  fi
done

if [[ $fail -ne 0 ]]; then
  echo "validation failed" >&2
  exit 1
fi

echo "all rulesets valid"
