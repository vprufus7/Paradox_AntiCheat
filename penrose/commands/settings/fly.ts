import { ChatSendBeforeEvent, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startFlyCheck, stopFlyCheck } from "../../modules/fly";

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
    dynamicProperty: "flyCheck_b",

    // Command parameters for the GUI
    parameters: [
        {
            type: "button",
        },
    ],

    /**
     * Executes the antifly command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        // Get Dynamic Property Boolean
        const paradoxModules: { [key: string]: boolean | number | string | Vector3 } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const antiflyBoolean = (paradoxModules["flyCheck_b"] as boolean) || false;

        if (antiflyBoolean === false) {
            // Allow
            paradoxModules["flyCheck_b"] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §aenabled§7.`);
            startFlyCheck();
        } else {
            // Deny
            paradoxModules["flyCheck_b"] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §4disabled§7.`);
            stopFlyCheck();
        }
    },
};
