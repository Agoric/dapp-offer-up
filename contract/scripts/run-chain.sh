#!/bin/bash
set -e  # Exit on error
# Function to handle errors
error_handler() {
    local exit_code=$?
    echo "Error occurred in script at line $1, exit code: $exit_code"
    exit $exit_code
}

# Set up error handling
trap 'error_handler ${LINENO}' ERR

# Enable debug output
set -x


# Set default container name if not provided
: ${AGDC_NAME:="agdc"}

# Check if container already exists and is running
if [ "$(docker ps -q -f name=$AGDC_NAME)" ]; then
    echo "Container '$AGDC_NAME' is already running. Please stop it first using 'docker stop $AGDC_NAME' if you want to start a new instance."
    exit 1
fi

# Check if container exists but is stopped
if [ "$(docker ps -aq -f status=exited -f name=$AGDC_NAME)" ]; then
    echo "Found stopped container '$AGDC_NAME'. Do you want to remove it before starting a new one? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Removing stopped container '$AGDC_NAME'..."
        docker rm $AGDC_NAME
    else
        echo "Aborting to preserve existing container. You can set/update AGDC_NAME environment variable to avoid any potential conflicts."
        exit 1
    fi
fi

# Set paths only if environment variables are not already set
: ${DAPP_ED_CERT_PATH:="$(pwd)/../dapp-ed-cert"}
: ${DAPP_CHAIN_TIMER_PATH:="$(pwd)/../dapp-chain-timer"}
: ${SECOND_INVITE_PATH:="$(pwd)/../dapp-second-invite"}
: ${DAPP_OFFER_UP_PATH:="$(pwd)/../dapp-offer-up"}
: ${DAPP_AGORIC_BASICS_PATH:="$(pwd)/../dapp-agoric-basics"}

# Set workspace names with default values
: ${WS_EDCERT:="/ws-edcert"}
: ${WS_CHAIN_TIMER:="/ws-chainTimer"}
: ${WS_SECOND_INVITE:="/ws-secondInvite"}
: ${WS_OFFER_UP:="/ws-offerup"}
: ${WS_AGORIC_BASICS:="/ws-agoricBasics"}

# Start new container with the chain startup commands
# Define docker parameters
agd_image="ghcr.io/agoric/agoric-3-proposals:latest"
linux_only="--platform linux/amd64"
ports="-p 26656:26656 -p 26657:26657 -p 1317:1317"
env="-e DEST=1 -e DEBUG=\"SwingSet:ls,SwingSet:vat\""
volumes="$([ -d "$DAPP_ED_CERT_PATH" ] && echo "-v $DAPP_ED_CERT_PATH:$WS_EDCERT") \
        $([ -d "$DAPP_CHAIN_TIMER_PATH" ] && echo "-v $DAPP_CHAIN_TIMER_PATH:$WS_CHAIN_TIMER") \
        $([ -d "$SECOND_INVITE_PATH" ] && echo "-v $SECOND_INVITE_PATH:$WS_SECOND_INVITE") \
        $([ -d "$DAPP_OFFER_UP_PATH" ] && echo "-v $DAPP_OFFER_UP_PATH:$WS_OFFER_UP") \
        $([ -d "$DAPP_AGORIC_BASICS_PATH" ] && echo "-v $DAPP_AGORIC_BASICS_PATH:$WS_AGORIC_BASICS")"
start_agd="bash -c '. /usr/src/upgrade-test-scripts/env_setup.sh && \
           /usr/src/upgrade-test-scripts/start_agd.sh & \
           waitForBlock 1 && \
           wait'"

docker run -d --name $AGDC_NAME $linux_only $ports $env $volumes $agd_image $start_agd || {
    echo "Failed to start docker container. Please check if Docker is running and you have necessary permissions."
    exit 1
}

echo "Container '$AGDC_NAME' started successfully."
