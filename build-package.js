const path = require("path");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");

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

// Copy penrose/node_modules to build/scripts/node_modules
console.log("Copying penrose/node_modules to build/scripts/node_modules");
fs.copySync("penrose/node_modules", "build/scripts/node_modules");

// Build project using TypeScript
console.log("Building the project");
const tsConfigPath = path.resolve(__dirname, "tsconfig.json");
const tsResult = spawnSync("node", ["./node_modules/typescript/bin/tsc", "-p", tsConfigPath]);

// Check TypeScript compilation result
if (tsResult.status !== 0) {
    console.error("TypeScript compilation failed:");
    if (tsResult.stderr && tsResult.stderr.length > 0) {
        console.error(tsResult.stderr.toString());
    } else if (tsResult.stdout && tsResult.stdout.length > 0) {
        console.error(tsResult.stdout.toString());
    }
    process.exit(1); // Exit with non-zero status to indicate failure
}

// Check if --server parameter is present
const isServerMode = process.argv.includes("--server");

if (!isServerMode) {
    console.log("Creating distribution archive file");

    const outputFileName = `Paradox-AntiCheat-v${packageVersion}.${process.argv.includes("--mcpack") ? "mcpack" : "zip"}`;
    const outputFilePath = path.resolve("build", outputFileName);

    // Delete existing archive if it exists
    if (fs.existsSync(outputFilePath)) {
        console.log(`Removing existing archive: ${outputFilePath}`);
        fs.unlinkSync(outputFilePath);
    }

    // Explicitly specify the archive format
    const zipResult = spawnSync("7z", ["a", `-tzip`, outputFilePath, "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"], { cwd: "build" });

    // Check zip command result
    if (zipResult.status !== 0) {
        console.error("Error creating distribution zip file:");
        console.error(zipResult.stderr?.toString() || zipResult.stdout?.toString());
        process.exit(1);
    }

    console.log(`Archive created successfully: ${outputFilePath}`);
}

console.log("Build process completed successfully.");
