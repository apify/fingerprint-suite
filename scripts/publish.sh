#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PACKAGES_TO_PUBLISH=( "fingerprint-injector" "fingerprint-generator" "header-generator" "generative-bayesian-network" )

for FOLDER in $SCRIPT_DIR/../packages/*; do
  if [[ -d $FOLDER ]]; then
    PACKAGE_NAME=$(basename $FOLDER)
    if [[ " ${PACKAGES_TO_PUBLISH[@]} " =~ " ${PACKAGE_NAME} " ]]; then
      echo "Publishing $PACKAGE_NAME"
      cd $FOLDER/dist
      npm publish
      cd ../../
    fi
  fi
done