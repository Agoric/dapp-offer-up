#!/bin/bash

# Ensure the necessary directories exist on the container before copying files

echo "Creating directory /workspace/contract in container agd..."
docker exec agd mkdir -p /workspace/contract

echo "Copying 'bundles' directory to /workspace/contract in container agd..."
docker cp bundles agd:/workspace/contract/

echo "Copying 'start-offer-up-permit.json' to /workspace/contract in container agd..."
docker cp start-offer-up-permit.json agd:/workspace/contract/

echo "Copying 'start-offer-up.js' to /workspace/contract in container agd..."
docker cp start-offer-up.js agd:/workspace/contract/

#!/bin/bash

# Define the source file and container name
source_file="bundles/bundle-list"
container_name="agd"

# Get the host's home directory
host_home="$HOME"

# Create a temporary file to store the updated paths
temp_file=$(mktemp)

# Read each line (file path) from the source file
while IFS= read -r file; do
  # Replace the host's home directory with $HOME in the file path
  container_path="${file/$host_home//root}"

  # Extract the directory part of the container path
  container_dir=$(dirname "$container_path")

  # Ensure the directory exists in the container
  echo "Ensuring directory $container_dir exists in container $container_name..."
  docker exec "$container_name" mkdir -p "$container_dir"

  # Print a message before copying the file
  echo "Copying '$file' to '$container_path' in container $container_name..."
  
  # Copy the file to the corresponding path in the container
  docker cp "$file" "${container_name}:$container_path"

  # Write the updated path to the temporary file
  echo "$container_path" >> "$temp_file"
done < "$source_file"

# Move the temporary file back to the original source file
echo "Updating bundle list file in container agd..."
mv "$temp_file" "$source_file"
docker cp "$source_file" agd:/workspace/contract/$source_file
