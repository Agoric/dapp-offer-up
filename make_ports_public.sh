#!/bin/bash
set -x

# Function to change port visibility to public
change_port_visibility() {
  local port=$1
  gh codespace ports visibility $port:public -c $CODESPACE_NAME
}

# Check if at least one port is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <port1> [port2 ... portN]"
  exit 1
fi

# Loop through each provided port and change its visibility to public
for port in "$@"; do
  change_port_visibility $port
done
