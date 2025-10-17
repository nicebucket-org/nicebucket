#!/bin/bash

set -euo pipefail  

load_env_file() {
    local env_file="${1:-$PWD/.env}"
    
    if [[ -f "$env_file" ]]; then
        set -a  # Automatically export variables
        source "$env_file"
        set +a  # Turn off auto-export
    fi
}

setup_aws_variables() {
    export AWS_ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://localhost:4566}"
    export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-central-1}"
    export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
    export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
    
    echo "AWS configuration:"
    echo "  Endpoint: $AWS_ENDPOINT_URL"
    echo "  Region: $AWS_DEFAULT_REGION"
    echo "  Access Key ID: $AWS_ACCESS_KEY_ID"
}

load_env_file

setup_aws_variables

cleanup() {
    echo "Stopping LocalStack..."
    docker compose down localstack
}
trap cleanup EXIT

echo "Starting LocalStack..."
docker compose up -d localstack

echo "Prepare LocalStack..."

echo "Waiting for LocalStack to be ready..."
until curl -s $AWS_ENDPOINT_URL/_localstack/health 1>/dev/null ; do
  echo "LocalStack not ready yet, waiting... (did you start the container?)"
  sleep 2
done
echo "LocalStack is ready!"

echo "Delete all existing buckets..."
# NOTE: this is not needed for CI
aws --endpoint-url=$AWS_ENDPOINT_URL s3 ls | \
  awk '{print $3}' | \
  xargs -I {} aws --endpoint-url=$AWS_ENDPOINT_URL s3 rb s3://{} --force
echo "All existing buckets deleted"

echo "Seeding test data..."
./scripts/seed-localstack.sh $AWS_ENDPOINT_URL
echo "Seeding Done"
echo "LocalStack is ready!"

echo "Starting WebdriverIO"
npm run wdio 
echo "Tests completed!"
