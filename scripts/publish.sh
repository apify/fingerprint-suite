#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PACKAGES_TO_PUBLISH=( "generative-bayesian-network" "header-generator" "fingerprint-generator" "fingerprint-injector" )

for FOLDER in $SCRIPT_DIR/../packages/*; do
  if [[ -d $FOLDER ]]; then
    PACKAGE_NAME=$(basename $FOLDER)
    if [[ " ${PACKAGES_TO_PUBLISH[@]} " =~ " ${PACKAGE_NAME} " ]]; then
      echo "Publishing $PACKAGE_NAME"
      cd $FOLDER/dist
      npm publish

      cd $SCRIPT_DIR/../
    fi
  fi
done