#!/bin/bash
set -e 
set -o pipefail

echo "Downloading data..."

curl \
    -o $(dirname $0)/dataset.json \
    "$APIFY_DATASET_URL";

echo "Generating network..."

ts-node $(dirname $0)/netgen.ts

echo "Done."