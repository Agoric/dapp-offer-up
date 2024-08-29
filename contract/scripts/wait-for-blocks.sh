#!/bin/bash

# # Borrowed from https://github.com/DCFoundation/cosmos-proposal-builder/blob/main/.github/workflows/pr.yml#L43-L61
# # This script waits for the Agoric service to be fully ready before running the tests.
# # It does so by polling the `/abci_info` endpoint of the Agoric service until the last block height is greater than or equal to the target height.


timeout 300 bash -c '
TARGET_HEIGHT='$TARGET_HEIGHT'
SLEEP=10
echo "Waiting for the Agoric service to be fully ready..."
echo "Target block height: $TARGET_HEIGHT"
RPC=http://localhost:26657
while true; do
  response=$(curl --silent $RPC/abci_info)
  height=$(echo $response | jq -r ".result.response.last_block_height | tonumber")
  if [ "$height" -ge $TARGET_HEIGHT ]; then
    echo "Service is ready! Last block height: $height"
    break
  else
    echo "Waiting for last block height to reach $TARGET_HEIGHT. Current height: $height"
  fi
  sleep $SLEEP
done
'
