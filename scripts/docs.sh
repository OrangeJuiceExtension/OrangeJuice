#!/usr/bin/env bash
set -euo pipefail

ASSETS="assets"
INPUT="docs"
OUTPUT="build-docs"

mkdir -p ${OUTPUT}

# docs/assets is a symlink to ../assets; skip it here and copy assets explicitly below.
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude ${ASSETS} ${INPUT}/ ${OUTPUT}/
else
  find ${INPUT} -mindepth 1 -maxdepth 1 ! -name ${ASSETS} -exec cp -R {} ${OUTPUT}/ \;
fi

cp -R ${ASSETS} ${OUTPUT}/
