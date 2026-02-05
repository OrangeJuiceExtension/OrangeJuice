#!/usr/bin/env bash
set -euo pipefail

mkdir -p public

# docs/assets is a symlink to ../assets; skip it here and copy assets explicitly below.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude "assets" docs/ public/
else
  find docs -mindepth 1 -maxdepth 1 ! -name "assets" -exec cp -R {} public/ \;
fi

cp -R assets public/
