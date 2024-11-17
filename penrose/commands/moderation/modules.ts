import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { getParadoxModules } from "../../utility/paradox-modules-manager";

/**
 * Represents the modules status command.
 */
export const modulesStatusCommand: Command = {
    name: "modules",
    description: "Shows the status of all modules.",
    usage: "{prefix}modules [ help ]",
    examples: [`{prefix}modules`, `{prefix}modules help`],
    category: "Moderation",
    securityClearance: 4,

    /**
     * Executes the modules status command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        // Helper function to get status as a string
        const status = (enabled: boolean) => (enabled ? "§aENABLED" : "§4DISABLED");

        // Helper function to convert camelCase to Title Case
        const toTitleCase = (str: string) => str.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

        const player = message.sender;
        const world = minecraftEnvironment.getWorld();

        // Retrieve and update module state
        let paradoxModules = getParadoxModules(world);

        // Categorize modules into booleans and settings
        const booleanModules: string[] = [];
        const settingsModules: { [key: string]: any } = {};

        Object.keys(paradoxModules).forEach((moduleName) => {
            if (moduleName.endsWith("_b")) {
                booleanModules.push(moduleName);
            } else if (moduleName.endsWith("_settings")) {
                settingsModules[moduleName] = paradoxModules[moduleName];
            }
        });

        // Generate the status messages in a tree-like format
        const moduleStatuses = [`§2[§7Paradox§2]§o§7 List Of Modules:`, `§r§2├─§o§7 Registered Modules:`];

        // Check if there are any boolean modules
        if (booleanModules.length === 0) {
            moduleStatuses.push("§r§2│  └─§o§7 No modules are currently enabled.");
        } else {
            booleanModules.forEach((moduleName) => {
                const line = `§r§2│  └─§o§7 ${toTitleCase(moduleName.replace(/_b$/, "").replace(/_/g, " "))}: ${status(paradoxModules[moduleName])}`;
                moduleStatuses.push(line);
            });
        }

        // Check if there are any settings modules
        if (Object.keys(settingsModules).length === 0) {
            moduleStatuses.push("§r§2└─§o§7 No settings are currently set for any registered modules.");
        } else {
            moduleStatuses.push("§r§2└─§o§7 Settings Modules:");
            Object.entries(settingsModules).flatMap(([moduleName, settings], index, array) => {
                const isLastModule = index === array.length - 1;
                const moduleTitle = `   ${isLastModule ? " §r§2└─§o§7" : " §r§2├─§o§7"} ${toTitleCase(moduleName.replace(/_settings$/, "").replace(/_/g, " "))}`;

                const settingsLines = Object.entries(settings).map(([settingName, value], settingIndex, settingsArray) => {
                    const prefix = isLastModule ? `${settingIndex === settingsArray.length - 1 ? "    §r§2└─§o§7 " : "    §r§2├─§o§7 "}` : `§r§2│  ${settingIndex === settingsArray.length - 1 ? "§r§2└─§o§7 " : "§r§2├─§o§7 "}`;
                    return `    ${prefix}${toTitleCase(settingName.replace(/_/g, " "))}: ${value}`;
                });

                moduleStatuses.push(moduleTitle, ...settingsLines);
            });
        }

        // Send the status messages to the player
        player.sendMessage(moduleStatuses.join("\n"));
    },
};
