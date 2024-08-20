const fs = require("fs-extra");
const path = require("path");

// Define the destination path
const penroseNodeModules = path.resolve("penrose", "node_modules");

// Remove the penrose/node_modules directory if it exists
if (fs.existsSync(penroseNodeModules)) {
    fs.removeSync(penroseNodeModules);
    console.log("Deleted existing penrose/node_modules");
}

// Recreate the directory
fs.mkdirSync(penroseNodeModules);

// Define the modules to copy
const modulesToCopy = ["crypto-es", "@minecraft/math"];

modulesToCopy.forEach((module) => {
    const source = path.resolve("node_modules", module);
    const destination = path.resolve(penroseNodeModules, module);

    fs.copy(source, destination)
        .then(() => {
            console.log(`Copied ${module} to penrose/node_modules`);

            // If the module is @minecraft/math, move and rename math-public.d.ts
            if (module === "@minecraft/math") {
                const oldPath = path.resolve(destination, "lib", "types", "math-public.d.ts");
                const newPath = path.resolve(destination, "dist", "minecraft-math.d.ts");

                fs.move(oldPath, newPath, { overwrite: true })
                    .then(() => console.log("Renamed math-public.d.ts to index.d.ts"))
                    .catch((err) => console.error("Error renaming math-public.d.ts:", err));
            }
        })
        .catch((err) => console.error(`Error copying ${module}:`, err));
});
