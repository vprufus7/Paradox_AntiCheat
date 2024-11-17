import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { getParadoxModules, updateParadoxModules } from "../../utility/paradox-modules-manager";

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
    guiInstructions: {
        formType: "ActionFormData",
        title: "AntiSpam Command",
        description: "Toggle the AntiSpam feature on or off.",
        actions: [
            {
                name: "Enable/Disable AntiSpam",
                command: undefined,
                description: "Enables or disables AntiSpam to prevent chat spam.",
                requiredFields: [],
                crypto: false,
            },
        ],
    },

    /**
     * Executes the antispam command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();

        // Get dynamic properties
        const paradoxModules = getParadoxModules(world);
        const antispamBoolean = (paradoxModules["spamCheck_b"] as boolean) || false;

        // Toggle anti-spam
        if (antispamBoolean === false) {
            // Enable anti-spam
            paradoxModules["spamCheck_b"] = true;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AntiSpam has been §aenabled§7.`);
        } else {
            // Disable anti-spam
            paradoxModules["spamCheck_b"] = false;
            updateParadoxModules(world, paradoxModules);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AntiSpam has been §4disabled§7.`);
        }
    },
};
