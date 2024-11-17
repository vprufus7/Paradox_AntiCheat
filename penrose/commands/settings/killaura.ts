import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startKillAuraCheck, stopKillAuraCheck } from "../../modules/killaura";
import { getParadoxModules, updateParadoxModules } from "../../utility/paradox-modules-manager";

/**
 * Represents the killaura detection command.
 */
export const killauraCommand: Command = {
    name: "killaura",
    description: "Toggles the killaura detection module.",
    usage: "{prefix}killaura [ help ]",
    examples: [`{prefix}killaura`, `{prefix}killaura help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the killaura detection command.
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
        const killauraEnabled = (paradoxModules["killAuraCheck_b"] as boolean) || false;

        if (!killauraEnabled) {
            // Enable the module
            paradoxModules["killAuraCheck_b"] = true;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Killaura detection has been §aenabled§7.`);
            system.run(() => {
                startKillAuraCheck();
            });
        } else {
            // Disable the module
            paradoxModules["killAuraCheck_b"] = false;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Killaura detection has been §4disabled§7.`);
            system.run(() => {
                stopKillAuraCheck();
            });
        }
    },
};
