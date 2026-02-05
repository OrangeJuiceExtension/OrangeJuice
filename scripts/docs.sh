#!/usr/bin/env bash
set -euo pipefail

mkdir -p public
cp -r docs/* public/

if [ -n "${GITHUB_ACTION:-}" ]; then
  rm -rf docs/assets
fi

cp -r assets public/
