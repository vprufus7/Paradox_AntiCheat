const path = require("path");
const fs = require("fs-extra");
const { execSync } = require("child_process");

// Read package.json to get the version
const packageJson = fs.readJsonSync("package.json");
const packageVersion = packageJson.version;

// Clean build directory
console.log("Cleaning build directory");
fs.removeSync("build");

// Create necessary directories
console.log("Creating build directory");
fs.mkdirSync("build", { recursive: true });

// Copy assets
console.log("Copying assets");
const assets = ["CHANGELOG.md", "LICENSE", "manifest.json", "pack_icon.png", "README.md"];
assets.forEach((asset) => {
    fs.copyFileSync(asset, path.join("build", asset));
});

// Copy src/node_modules to build/scripts/node_modules
console.log("Copying src/node_modules to build/scripts/node_modules");
fs.copySync("src/node_modules", "build/scripts/node_modules");

// Build project using TypeScript
console.log("Building the project");
execSync("node ./node_modules/typescript/bin/tsc -p tsconfig.json");

// Create distribution zip file using 7-Zip
console.log("Creating distribution zip file");
execSync(`cd build && 7z a Paradox-AntiCheat-v${packageVersion}.mcpack .`);

console.log("Build process completed successfully.");
