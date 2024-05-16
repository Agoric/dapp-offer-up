#!/bin/bash

cd demo

TARGET_HEIGHT=${TARGET_HEIGHT:1111}

timeout 300 bash -c '
TARGET_HEIGHT=TARGET_HEIGHT='$TARGET_HEIGHT'
SLEEP=10
echo "Waiting for the Agoric service to be fully ready..."
echo "Target block height: $TARGET_HEIGHT"
while true; do
  response=$(curl --silent http://localhost:26657/abci_info)
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
