#!/bin/bash
set -e 
set -o pipefail

echo "Downloading data..."

curl \
    -o $(dirname $0)/dataset.json \
    'https://api.apify.com/v2/datasets/qIz7baHufB47rJxDi/items?attachment=true&clean=false&desc=true&format=json&limit=10000';

echo "Generating network..."

ts-node $(dirname $0)/netgen.ts

echo "Done."