import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startXrayDetection, stopXrayDetection } from "../../modules/xray";

/**
 * Represents the Xray detection command.
 */
export const xrayCommand: Command = {
    name: "xray",
    description: "Toggles the Xray detection module.",
    usage: "{prefix}xray [ help ]",
    examples: [`{prefix}xray`, `{prefix}xray help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the Xray detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const moduleKey = "paradoxModules";

        // Get Dynamic Property Boolean
        const paradoxModules: { [key: string]: boolean | number | string } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const xrayEnabled = (paradoxModules["xrayDetection_b"] as boolean) || false;

        if (!xrayEnabled) {
            // Enable the module
            paradoxModules["xrayDetection_b"] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Xray detection has been §aenabled§7.`);
            system.run(() => {
                startXrayDetection(); // Start Xray detection
            });
        } else {
            // Disable the module
            paradoxModules["xrayDetection_b"] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Xray detection has been §4disabled§7.`);
            system.run(() => {
                stopXrayDetection(); // Stop Xray detection
            });
        }
    },
};
