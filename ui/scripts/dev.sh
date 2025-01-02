#!/bin/bash

# Exit on any error
set -e

# Check if running in GitHub Codespace and set environment variables if so
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    echo "Running in GitHub Codespace, setting environment variables..."
    export VITE_HOSTNAME="$CODESPACE_NAME"
    export VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN="$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
fi

# Check if Vite is installed
if ! command -v vite >/dev/null 2>&1; then
    echo "Error: Vite is not installed"
    exit 1
fi

# Run Vite
echo "Starting Vite development server..."
exec vite
