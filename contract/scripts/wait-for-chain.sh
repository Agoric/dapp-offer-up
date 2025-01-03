#!/bin/bash

# Function to check if we see a pattern of block commits
check_block_pattern() {
    local count=0
    local required_patterns=3  # Number of block patterns we want to see

    while IFS= read -r line; do
        echo "$line"  # Show the log output

        if [[ $line =~ "block-manager: block "[0-9]+" commit" ]]; then
            ((count++))
            if [ $count -ge $required_patterns ]; then
                return 0  # Success
            fi
        fi
    done

    return 1  # Pattern not found
}

echo -e "\033[34mWaiting for blockchain to start...\033[0m"
yarn docker:logs | check_block_pattern

if [ $? -eq 0 ]; then
    echo -e "\033[34mBlockchain is running and producing blocks...\033[0m"
    exit 0
else
    echo -e "\033[34mFailed to detect blockchain activity\n Run yarn start:docker to start the blockchain first!\033[0m"
    exit 1
fi
