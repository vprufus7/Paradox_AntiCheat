import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startScaffoldCheck, stopScaffoldCheck } from "../../modules/scaffold";
import { getParadoxModules, updateParadoxModules } from "../../utility/paradox-modules-manager";

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
        const system = minecraftEnvironment.getSystem();

        // Get Dynamic Property Boolean
        const paradoxModules = getParadoxModules(world);
        const scaffoldCheckEnabled = (paradoxModules["scaffoldCheck_b"] as boolean) || false;

        if (!scaffoldCheckEnabled) {
            // Enable the scaffold detection module
            paradoxModules["scaffoldCheck_b"] = true;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §aenabled§7.`);
            system.run(() => {
                startScaffoldCheck();
            });
        } else {
            // Disable the scaffold detection module
            paradoxModules["scaffoldCheck_b"] = false;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §4disabled§7.`);
            system.run(() => {
                stopScaffoldCheck();
            });
        }
    },
};
