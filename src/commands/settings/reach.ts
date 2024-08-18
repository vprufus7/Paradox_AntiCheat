import { ChatSendAfterEvent, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { InitializeEntityHitDetection } from "../../modules/reach";

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
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        // Get Dynamic Property Boolean
        const paradoxModules: { [key: string]: boolean | number | string | Vector3 } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const hitReachCheckEnabled = (paradoxModules["hitReachCheck_b"] as boolean) || false;

        if (hitReachCheckEnabled === false) {
            // Enable the module
            paradoxModules["hitReachCheck_b"] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §aenabled§7.`);
            InitializeEntityHitDetection();
        } else {
            // Disable the module
            paradoxModules["hitReachCheck_b"] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §4disabled§7.`);
        }
    },
};
