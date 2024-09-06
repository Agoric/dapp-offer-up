#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { execSync } = require("child_process");

// Get the arguments: package name regex and npm tag
const [packageNameRegex, npmTag] = process.argv.slice(2);
if (!packageNameRegex || !npmTag) {
  console.error(
    'Usage: node update-dependencies.js "<package-regex>" <npm-tag>'
  );
  process.exit(1);
}

// Function to get the latest version of a package with the specified tag
const getLatestVersion = (packageName, tag) => {
  try {
    const result = execSync(`npm info ${packageName} dist-tags.${tag}`, {
      encoding: "utf-8",
    });
    return result.trim();
  } catch (error) {
    console.error(
      `Error fetching version for ${packageName} with tag ${tag}:`,
      error.message
    );
    return null;
  }
};

// Function to update dependencies in the package.json section
const updateDependencies = (dependencies, tag) => {
  if (!dependencies) return;

  for (const [packageName, currentVersion] of Object.entries(dependencies)) {
    if (new RegExp(packageNameRegex).test(packageName)) {
      const latestVersion = getLatestVersion(packageName, tag);
      if (latestVersion) {
        console.log(
          `Updating ${packageName} from ${currentVersion} to ${latestVersion}`
        );
        dependencies[packageName] = `^${latestVersion}`;
      }
    }
  }
};

// Find all package.json files in the workspace
glob("**/package.json", { ignore: "**/node_modules/**" }, (err, files) => {
  if (err) {
    console.error("Error finding package.json files:", err);
    process.exit(1);
  }

  files.forEach((file) => {
    const packageJsonPath = path.resolve(file);
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // Update dependencies, devDependencies, and resolutions
    updateDependencies(packageJson.dependencies, npmTag);
    updateDependencies(packageJson.devDependencies, npmTag);
    updateDependencies(packageJson.resolutions, npmTag);

    // Write the updated package.json back to the file, ensuring newline at the end
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + "\n",
      "utf-8"
    );
    console.log(`Updated dependencies in ${packageJsonPath}`);
  });

  console.log("Dependency update complete.");
});
