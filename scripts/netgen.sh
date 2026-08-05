#!/bin/bash
set -e 
set -o pipefail

echo "Dataset info:"
curl -sS "https://api.apify.com/v2/datasets/${APIFY_FINGERPRINT_DATASET_ID}" | node -e '
    const { itemCount, createdAt, modifiedAt } = JSON.parse(require("fs").readFileSync(0, "utf8")).data;
    console.log({ itemCount, createdAt, modifiedAt });
'

echo "Downloading data..."

curl \
    -o $(dirname $0)/dataset.json \
    "https://api.apify.com/v2/datasets/${APIFY_FINGERPRINT_DATASET_ID}/items?clean=true&format=json&desc=true&limit=30000";

echo "Generating network..."

ts-node $(dirname $0)/netgen.ts

echo "Done."