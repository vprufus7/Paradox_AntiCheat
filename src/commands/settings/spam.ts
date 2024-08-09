import { ChatSendAfterEvent, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the antispam command.
 */
export const antispamCommand: Command = {
    name: "antispam",
    description: "Toggles chat spam checks [ Default: 2 Minutes ].",
    usage: "{prefix}antispam [ help ]",
    examples: [`{prefix}antispam`, `{prefix}antispam help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the antispam command.
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        // Get dynamic properties
        const paradoxModules: { [key: string]: boolean | number | string | Vector3 } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const antispamBoolean = (paradoxModules["spamCheck_b"] as boolean) || false;

        // Toggle anti-spam
        if (antispamBoolean === false) {
            // Enable anti-spam
            paradoxModules["spamCheck_b"] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§4[§6Paradox§4]§o§7 AntiSpam has been §aenabled§7.`);
        } else {
            // Disable anti-spam
            paradoxModules["spamCheck_b"] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§4[§6Paradox§4]§o§7 AntiSpam has been §4disabled§7.`);
        }
    },
};
