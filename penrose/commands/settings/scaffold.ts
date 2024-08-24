import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { initScaffoldDetection, unsubscribeScaffoldEvents } from "../../modules/scaffold";

/**
 * Represents the scaffold detection command.
 */
export const scaffoldCommand: Command = {
    name: "scaffold",
    description: "Toggles the scaffold detection module.",
    usage: "{prefix}scaffold [ help ]",
    examples: [`{prefix}scaffold`, `{prefix}scaffold help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the scaffold detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        // Get Dynamic Property Boolean
        const paradoxModules: { [key: string]: boolean | number | string } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const scaffoldCheckEnabled = (paradoxModules["scaffoldCheck_b"] as boolean) || false;

        if (!scaffoldCheckEnabled) {
            // Enable the scaffold detection module
            paradoxModules["scaffoldCheck_b"] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §aenabled§7.`);
            initScaffoldDetection();
        } else {
            // Disable the scaffold detection module
            paradoxModules["scaffoldCheck_b"] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §4disabled§7.`);
            unsubscribeScaffoldEvents();
        }
    },
};
