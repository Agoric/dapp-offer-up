#!/bin/bash

# Start the chain in the background
. /usr/src/upgrade-test-scripts/env_setup.sh; /usr/src/upgrade-test-scripts/start_agd.sh &

# wait for blocks to start being produced
waitForBlock 1

make -C /ws-offerup/contract mint100

# bring back chain process to foreground
wait
