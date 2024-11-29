const path = require("path");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");

/**
 * Ensures the build directory exists.
 * If the directory is not found, the script exits with an error message.
 *
 * @returns {string} - The path of the build directory.
 */
function ensureBuildDirectory() {
    const buildDir = "build";
    if (!fs.existsSync(buildDir)) {
        console.error(`${buildDir} directory not found. Please run the main build script first.`);
        process.exit(1);
    }
    return buildDir;
}

/**
 * Overlays files from the source directory into the destination directory, excluding specified directories.
 * This is useful for merging non-script files while avoiding overwriting critical directories like 'scripts' or 'penrose'.
 *
 * @param {string} srcDir - The source directory to copy files from.
 * @param {string} destDir - The destination directory to copy files into.
 * @param {string[]} [excludeDirs=["scripts", "penrose"]] - Array of directories to exclude from copying.
 */
function overlayFiles(srcDir, destDir, excludeDirs = ["scripts", "penrose"]) {
    console.log(`Overlaying non-script files from ${srcDir} into ${destDir}`);
    fs.copySync(srcDir, destDir, {
        overwrite: true,
        filter: (src) => !excludeDirs.some((dir) => src.includes(dir)),
    });
}

/**
 * Compiles TypeScript files from the given TypeScript configuration file.
 * This runs the TypeScript compiler using the specified configuration.
 *
 * @param {string} tsConfigPath - The path to the TypeScript configuration file.
 */
function compileTypeScript(tsConfigPath) {
    console.log(`Compiling TypeScript files from ${tsConfigPath}`);
    const result = spawnSync("node", ["./node_modules/typescript/bin/tsc", "-p", tsConfigPath]);

    if (result.status !== 0) {
        console.error("TypeScript compilation failed:");
        console.error(result.stderr.toString() || result.stdout.toString());
        process.exit(1);
    }
}

/**
 * Updates an existing distribution archive (.zip or .mcpack) with the latest files.
 * Uses 7z command to update the archive while excluding the build directory and tsconfig.json.
 *
 * @param {string} archiveType - The type of the archive, either "zip" or "mcpack".
 * @param {string} buildDir - The build directory where the files are located.
 */
function updateArchive(archiveType, buildDir) {
    console.log(`Updating ${archiveType} archive`);

    // The archive file name
    const archiveFile = `Paradox-AntiCheat-v${require("./package.json").version}.${archiveType}`;
    const archivePath = path.join(buildDir, archiveFile);

    // List files in the build directory (excluding the build directory itself and tsconfig.json)
    const filesToAdd = fs.readdirSync(buildDir).filter((file) => file !== "build" && file !== "tsconfig.json"); // Exclude 'build' and 'tsconfig.json'
    console.log("Files to add to archive:", filesToAdd);

    // Create the list of files for 7z command (now just file names, not including 'build/' prefix)
    const filesArg = filesToAdd.map((file) => path.basename(file));

    // Log the full command for debugging
    const zipCommand = [
        "u",
        `-tzip`, // Use zip format, but keep the archive extension as .mcpack if it's a .mcpack file
        archivePath, // Don't change the extension, use the same one (either .zip or .mcpack)
        ...filesArg, // Add files explicitly
        `-x!${path.join(buildDir, "build")}`, // Exclude the 'build' directory itself
    ];

    console.log("7z command:", zipCommand.join(" "));

    // Use 7z to update the archive
    const zipResult = spawnSync("7z", zipCommand, { cwd: buildDir });

    // Check the result of the 7z command
    if (zipResult.status !== 0) {
        console.error("Error updating the distribution archive:");
        if (zipResult.stderr && zipResult.stderr.length > 0) {
            console.error(zipResult.stderr.toString());
        } else if (zipResult.stdout && zipResult.stdout.length > 0) {
            console.error(zipResult.stdout.toString());
        }
        process.exit(1); // Exit with non-zero status to indicate failure
    }

    console.log(`${archiveType} archive updated successfully.`);
}

/**
 * Main function that coordinates the build process.
 * - Ensures the build directory exists.
 * - Overlays necessary files from the personal directory.
 * - Compiles TypeScript files for the personal directory.
 * - Organizes the compiled output and cleans up unnecessary files.
 * - Updates the archive file (zip or mcpack), excluding the build directory.
 */
function main() {
    const buildDir = ensureBuildDirectory();

    // Overlay non-script files
    overlayFiles("personal", buildDir);

    // Compile TypeScript files for personal
    compileTypeScript(path.resolve(__dirname, "personal", "tsconfig.json"));

    // Organize and clean up output files
    console.log("Organizing compiled personal files...");
    fs.copySync("build/scripts/personal/scripts", "build/scripts", { overwrite: true });
    fs.removeSync("build/scripts/personal");
    fs.removeSync("build/scripts/penrose");

    // Check if --server parameter is present
    const isServerMode = process.argv.includes("--server");
    if (!isServerMode) {
        // Update the existing archive file after the build process
        const archiveType = process.argv.includes("--mcpack") ? "mcpack" : "zip"; // Default to zip if --mcpack is not passed
        updateArchive(archiveType, buildDir);
    }

    console.log("Build process completed successfully.");
}

// Execute the main function
main();
