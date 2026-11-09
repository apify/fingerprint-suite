#!/bin/bash
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PACKAGES_TO_PUBLISH=( "generative-bayesian-network" "header-generator" "fingerprint-generator" "fingerprint-injector" )

for PACKAGE_NAME in "${PACKAGES_TO_PUBLISH[@]}"; do
  FOLDER="$SCRIPT_DIR/../packages/$PACKAGE_NAME"
  if [[ -d $FOLDER ]]; then
    echo "Publishing $PACKAGE_NAME"
    cd $FOLDER/dist
    pnpm publish --no-git-checks

    cd $SCRIPT_DIR/../
  fi
done
