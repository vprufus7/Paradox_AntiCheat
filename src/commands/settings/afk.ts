import { ChatSendAfterEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startAFKChecker } from "../../modules/afk";

/**
 * Represents the AFK command.
 */
export const afkCommand: Command = {
    name: "afk",
    description: `Toggles the AFK check module, which kicks players that are AFK.`,
    usage: "{prefix}afk [ hours ] [ minutes ] [ seconds ]",
    examples: [`{prefix}afk`, `{prefix}afk 0 10 0`, `{prefix}afk 0 15 30`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the AFK command.
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        // Retrieve and update module state
        let paradoxModules: { [key: string]: boolean | { hours: number; minutes: number; seconds: number } } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

        // Default values
        let hours = 0;
        let minutes = 10; // Default AFK timeout: 10 minutes
        let seconds = 0;

        if (args.length === 3) {
            hours = parseInt(args[0], 10) || 0;
            minutes = parseInt(args[1], 10) || 0;
            seconds = parseInt(args[2], 10) || 0;

            // Update settings without toggling if AFK check is already enabled
            const afkKey = "afkCheck_b";
            const afkSettingsKey = "afk_settings";
            paradoxModules[afkSettingsKey] = { hours, minutes, seconds };
            paradoxModules[afkKey] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§4[§6Paradox§4]§o§7 AFK timer updated to §4[ §6${hours}§7 : §6${minutes}§7 : §6${seconds}§7 §4]§7.`);
            // Restart AFK checker with the new settings
            startAFKChecker(hours, minutes, seconds);
        } else {
            // Use existing settings if available
            const afkSettingsKey = "afk_settings";
            if (paradoxModules[afkSettingsKey] && typeof paradoxModules[afkSettingsKey] === "object") {
                const settings = paradoxModules[afkSettingsKey] as { hours: number; minutes: number; seconds: number };
                hours = settings.hours;
                minutes = settings.minutes;
                seconds = settings.seconds;
            }

            const afkKey = "afkCheck_b";
            const afkBoolean = (paradoxModules[afkKey] as boolean) || false;

            if (afkBoolean === false) {
                // Enable AFK module
                paradoxModules[afkKey] = true;
                paradoxModules[afkSettingsKey] = { hours, minutes, seconds };
                world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
                player.sendMessage("§4[§6Paradox§4]§o§7 AFK module has been §aenabled§7.");
                startAFKChecker(hours, minutes, seconds);
            } else {
                // Disable AFK module
                paradoxModules[afkKey] = false;
                world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
                player.sendMessage("§4[§6Paradox§4]§o§7 AFK module has been §4disabled§7.");
            }
        }
    },
};
