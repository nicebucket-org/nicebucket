#!/bin/bash

# Seed all data needed for E2E tests

set -e

# Check if LOCAL_STACK_URL parameter is provided
if [ $# -eq 0 ] || [ -z "$1" ]; then
    echo "Error: LOCAL_STACK_URL parameter is required"
    echo "Usage: $0 <LOCAL_STACK_URL>"
    echo "Example: $0 http://localhost:4566"
    exit 1
fi

# Store the LOCAL_STACK_URL parameter
LOCAL_STACK_URL="$1"



# NOTE: depending on how many e2e tests we will have it might make sense 
# to break this up into multiple files and/or add helpers

# Cheatsheet
# ----------
#
# Create Bucket
# aws --endpoint-url=$LOCAL_STACK_URL s3 mb s3://my-bucket
# Create File
# echo "My File Content" | aws --endpoint-url=$LOCAL_STACK_URL s3 cp - s3://my-bucket/sample.txt

# dashboard.spec.ts
aws --endpoint-url=$LOCAL_STACK_URL s3 mb s3://dashboard-bucket-one
echo "I am a text file" | aws --endpoint-url=$LOCAL_STACK_URL s3 cp - s3://dashboard-bucket-one/sample.txt
aws --endpoint-url=$LOCAL_STACK_URL s3 mb s3://dashboard-bucket-two
echo "I am a text file" | aws --endpoint-url=$LOCAL_STACK_URL s3 cp - s3://dashboard-bucket-one/sample.txt
