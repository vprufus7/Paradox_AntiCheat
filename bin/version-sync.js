import fs from "fs-extra"; // fs-extra provides readJsonSync
import path from "path";

// Read package.json to get the version
const packageJsonPath = path.resolve("package.json");
const packageJson = fs.readJsonSync(packageJsonPath);
const packageVersion = "v" + packageJson.version;

// Define the path to versioning.ts file
const versioningFilePath = path.resolve("./penrose/data/versioning.ts");

// Read the versioning.ts file
const versioningFile = fs.readFileSync(versioningFilePath, "utf-8");
const versionRegex = /export const paradoxVersion = "(v\d+\.\d+\.\d+)";/;

// Match the version in versioning.ts
const match = versioningFile.match(versionRegex);
if (!match) {
    console.error("Version pattern not found in versioning.ts");
    process.exit(1);
}

const versionInFile = match[1];

// Check if the version in package.json matches the version in versioning.ts
if (versionInFile !== packageVersion) {
    console.error(`Version mismatch: package.json version (${packageVersion}) does not match version in versioning.ts (${versionInFile})`);
    process.exit(1);
} else {
    console.log("Version is synced!\n");
}
