#!/bin/bash

# Step 1: Read the environment variable CODESPACE_NAME
CODESPACE_NAME="${CODESPACE_NAME}"

# Step 2: Define the file name
FILE="src/App.tsx"

# Check if the file exists
if [ ! -f "$FILE" ]; then
  echo "File $FILE does not exist."
  exit 1
fi

# Step 3: Check if the environment variable is set and replace accordingly
if [ -z "$CODESPACE_NAME" ]; then
  echo "CODESPACE_NAME is not set. Setting host with http://localhost"
  sed -i "s|https://.*-1317\.app\.github\.dev/|http://localhost:1317|g" "$FILE"
  sed -i "s|https://.*-26657\.app\.github\.dev/|http://localhost:26657|g" "$FILE"
else
  echo "CODESPACE_NAME is set to $CODESPACE_NAME. Setting host with https://${CODESPACE_NAME}-1317.app.github.dev/"
  sed -i "s|https://.*-1317\.app\.github\.dev/|https://${CODESPACE_NAME}-1317.app.github.dev/|g" "$FILE"
  echo "CODESPACE_NAME is set to $CODESPACE_NAME. Setting host with https://${CODESPACE_NAME}-26675.app.github.dev/"
  sed -i "s|https://.*-26657\.app\.github\.dev/|https://${CODESPACE_NAME}-26657.app.github.dev/|g" "$FILE"
fi

# Step 4: Notify the user of completion
echo "Replacement complete in $FILE"
