#!/usr/bin/env bash

set -euo pipefail

#  --no-open \
xcrun safari-web-extension-converter \
  --no-prompt --force \
  --project-location .output \
  --bundle-identifier com.orangejuice.OrangeJuice \
  .output/safari-mv3

cp -R "src/safari/." ".output/Orange Juice/"

#perl -0pi -e 's/ENABLE_APP_SANDBOX = YES;/ENABLE_APP_SANDBOX = NO;/g' \
#  ".output/Orange Juice/Orange Juice.xcodeproj/project.pbxproj"
