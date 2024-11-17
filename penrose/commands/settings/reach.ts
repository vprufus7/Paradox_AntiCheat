import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startHitReachCheck, stopHitReachCheck } from "../../modules/reach";
import { getParadoxModules, updateParadoxModules } from "../../utility/paradox-modules-manager";

/**
 * Represents the hit reach detection command.
 */
export const hitReachCheckCommand: Command = {
    name: "reach",
    description: "Toggles the module that checks if players are hit from a fair distance.",
    usage: "{prefix}reach [ help ]",
    examples: [`{prefix}reach`, `{prefix}reach help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the hit reach detection command.
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
        const hitReachCheckEnabled = (paradoxModules["hitReachCheck_b"] as boolean) || false;

        if (hitReachCheckEnabled === false) {
            // Enable the module
            paradoxModules["hitReachCheck_b"] = true;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §aenabled§7.`);
            system.run(() => {
                startHitReachCheck();
            });
        } else {
            // Disable the module
            paradoxModules["hitReachCheck_b"] = false;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §4disabled§7.`);
            system.run(() => {
                stopHitReachCheck();
            });
        }
    },
};
