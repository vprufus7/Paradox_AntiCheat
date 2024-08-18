// tree.mjs
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;

function toPascalCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => (index === 0 ? match.toUpperCase() : match.toUpperCase())).replace(/\s+/g, "");
}

function checkNamingConventions(directory, depth = 0) {
    const items = fs.readdirSync(directory);
    let hasDiscrepancies = false;

    items.forEach((item) => {
        const fullPath = path.join(directory, item);
        const isDirectory = fs.statSync(fullPath).isDirectory();

        if (item === "node_modules") return;

        const indentation = "│   ".repeat(depth);
        const treeBranch = isDirectory ? "├── " : "└── ";

        if (isDirectory) {
            console.log(`${indentation}${treeBranch}${chalk.blue(item)}`);
            const result = checkNamingConventions(fullPath, depth + 1);
            hasDiscrepancies = hasDiscrepancies || result;
        } else {
            const fileExtension = path.extname(item);
            const fileNameWithoutExtension = path.basename(item, fileExtension);

            const isKebabCase = kebabCasePattern.test(fileNameWithoutExtension);
            const isPascalCase = pascalCasePattern.test(toPascalCase(fileNameWithoutExtension.replace(/-([a-z])/g, (g) => g[1].toUpperCase())));

            if (fileExtension === ".ts" || fileExtension === ".js") {
                if (!isKebabCase) {
                    console.log(`${indentation}${treeBranch}${chalk.red(item)} ${chalk.red("(Error: Does not follow kebab-case)")}`);
                    console.log(`${indentation}    ${chalk.yellow("Reason:")} The file name "${chalk.red(fileNameWithoutExtension)}" should be in kebab-case (e.g., "${chalk.green("command-handler.ts")}").`);
                    hasDiscrepancies = true;
                } else {
                    console.log(`${indentation}${treeBranch}${chalk.green(item)}`);
                }

                if (fileExtension === ".ts") {
                    const className = toPascalCase(fileNameWithoutExtension.replace(/-([a-z])/g, (g) => g[1].toUpperCase()));
                    if (!isPascalCase && fileNameWithoutExtension !== "index") {
                        console.log(`${indentation}${treeBranch}${chalk.red(className)} ${chalk.red("(Error: Does not follow PascalCase)")}`);
                        console.log(`${indentation}    ${chalk.yellow("Reason:")} Class names should be in PascalCase (e.g., "${chalk.green("CommandHandler")}").`);
                        hasDiscrepancies = true;
                    }
                }
            } else {
                console.log(`${indentation}${treeBranch}${chalk.yellow(item)} ${chalk.yellow("(Warning: Unexpected file extension)")}`);
            }
        }
    });

    return hasDiscrepancies;
}

// Run the check on the penrose directory
const discrepancies = checkNamingConventions(path.join(__dirname, "penrose"));
if (discrepancies) {
    process.exit(1); // Exit with an error code if discrepancies are found
} else {
    process.exit(0); // Exit with success code if no discrepancies are found
}
