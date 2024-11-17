import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startFlyCheck, stopFlyCheck } from "../../modules/fly";
import { getParadoxModules, updateParadoxModules } from "../../utility/paradox-modules-manager";

/**
 * Represents the antifly command.
 */
export const flyCheckCommand: Command = {
    name: "antifly",
    description: "Toggles checks for illegal flying.",
    usage: "{prefix}antifly [ help ]",
    examples: [`{prefix}antifly`, `{prefix}antifly help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the antifly command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();

        // Get Dynamic Property Boolean
        const paradoxModules = getParadoxModules(world);
        const antiflyBoolean = (paradoxModules["flyCheck_b"] as boolean) || false;

        if (antiflyBoolean === false) {
            // Allow
            paradoxModules["flyCheck_b"] = true;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §aenabled§7.`);
            startFlyCheck();
        } else {
            // Deny
            paradoxModules["flyCheck_b"] = false;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §4disabled§7.`);
            stopFlyCheck();
        }
    },
};
