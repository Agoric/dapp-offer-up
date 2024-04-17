#!/bin/bash

. /usr/src/upgrade-test-scripts/env_setup.sh

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

# Start the chain in the background
/usr/src/upgrade-test-scripts/start_agd.sh &

# wait for blocks to start being produced
waitForBlock 2

# Approve any proposals forever in the background.
approveProposals &

make -C /workspace/contract mint100
make -C /workspace/contract lower-bundle-cost

# bring back chain process to foreground
wait
