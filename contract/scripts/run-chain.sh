#!/bin/bash

wait_for_bootstrap() {
  endpoint="localhost"
  while true; do
    if json=$(curl -s --fail -m 15 "$endpoint:26657/status"); then
      if [[ "$(echo "$json" | jq -r .jsonrpc)" == "2.0" ]]; then
        if last_height=$(echo "$json" | jq -r .result.sync_info.latest_block_height); then
          if [[ "$last_height" != "1" ]]; then
            echo "$last_height"
            return
          else
            echo "$last_height"
          fi
        fi
      fi
    fi
    echo "waiting for next block..."
    sleep 5
  done
  echo "done"
}

waitForBlock() (
  echo "waiting for block..."
  times=${1:-1}
  echo "$times"
  for ((i = 1; i <= times; i++)); do
    b1=$(wait_for_bootstrap)
    while true; do
      b2=$(wait_for_bootstrap)
      if [[ "$b1" != "$b2" ]]; then
        echo "block produced"
        break
      fi
      sleep 5
    done
  done
  echo "done"
)

approveProposals() {
    while true; do
        proposals=$(make -s -C /workspace/contract gov-voting-q 2>/dev/null)
        exit_status=$?
        if [ $exit_status -eq 0 ]; then
            echo "Approving proposals: $proposals"
            printf $proposals | xargs -I {} make -s -C /workspace/contract vote PROPOSAL={}
        else
            echo "No proposals to approve, continuing..."
        fi

        sleep 10
    done
}

sendFunds() {
  echo "Sending Funds....."
  src=agoric1t83za2h5zc5anmkxvfag82qafshr538mvzmnmx
  dest=agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md
  amt=55535300uist

  echo "Sending ISTs"
  agd tx bank send $src $dest $amt --keyring-backend=test --chain-id=agoriclocal \
  --gas=auto --gas-adjustment=1.2 --yes -b block
  echo "ISTs sent successfully"

  amt=331000ubld
  echo "Sending BLDs"
  agd tx bank send $src $dest $amt --keyring-backend=test --chain-id=agoriclocal \
  --gas=auto --gas-adjustment=1.2 --yes -b block
  echo "BLDs sent successfully"

  amt=9ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA
  echo "Sending ATOMs"
  agd tx bank send $src $dest $amt --keyring-backend=test --chain-id=agoriclocal \
  --gas=auto --gas-adjustment=1.2 --yes -b block
  echo "ATOMs sent successfully"

}

# Start the chain in the background
/usr/src/upgrade-test-scripts/start_agd.sh &

# wait for blocks to start being produced
waitForBlock 2

# Approve any proposals forever in the background.
approveProposals &

sendFunds

make -C /workspace/contract mint100
make -C /workspace/contract lower-bundle-cost
make -C /workspace/contract clean start-contract

# bring back chain process to foreground
wait
