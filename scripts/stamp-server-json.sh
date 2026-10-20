#!/usr/bin/env bash
# Prints packages/<dir>/server.json with the npm version stamped into the
# top-level `version` and every `packages[].version`. The committed
# server.json keeps a placeholder version; release.yml and
# mcp-registry-publish.yml both stamp through this script so they cannot
# drift.
#
# Usage: scripts/stamp-server-json.sh <package-dir> [version] > out.json
#   version defaults to <package-dir>/package.json's "version".

set -euo pipefail

dir="${1:?usage: stamp-server-json.sh <package-dir> [version]}"
version="${2:-$(jq -r '.version' "${dir}/package.json")}"

jq --arg v "$version" '.version = $v | .packages[]?.version = $v' "${dir}/server.json"
