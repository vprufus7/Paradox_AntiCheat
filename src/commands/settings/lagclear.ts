import { ChatSendAfterEvent } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";
import { LagClear } from "../../modules/lagclear";

/**
 * Represents the lagclear command.
 */
export const lagClearCommand: Command = {
    name: "lagclear",
    description: "Clears items and entities with a timer.",
    usage: "{prefix}lagclear [ hours ] [ minutes ] [ seconds ]",
    examples: [`{prefix}lagclear`, `{prefix}lagclear 0 5 0`, `{prefix}lagclear 0 10 30`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the lagclear command.
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();

        // Retrieve and update module state
        const moduleKey = "paradoxModules";
        let paradoxModules: { [key: string]: boolean | { hours: number; minutes: number; seconds: number } } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

        // Default values
        let hours = 0;
        let minutes = 5;
        let seconds = 0;

        if (args.length === 3) {
            hours = parseInt(args[0], 10) || 0;
            minutes = parseInt(args[1], 10) || 0;
            seconds = parseInt(args[2], 10) || 0;

            // Update settings without toggling if lag clear is already enabled
            const lagClearKey = "lagclear_b";
            const lagClearSettingsKey = "lagclear_settings";
            paradoxModules[lagClearSettingsKey] = { hours, minutes, seconds };
            paradoxModules[lagClearKey] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§4[§6Paradox§4]§o§7 LagClear timer updated to §4[ §6${hours}§7 : §6${minutes}§7 : §6${seconds}§7 §4]§7.`);
            // Restart LagClear with the new settings
            LagClear(hours, minutes, seconds);
        } else {
            // Use existing settings if available
            const lagClearSettingsKey = "lagclear_settings";
            if (paradoxModules[lagClearSettingsKey] && typeof paradoxModules[lagClearSettingsKey] === "object") {
                const settings = paradoxModules[lagClearSettingsKey] as { hours: number; minutes: number; seconds: number };
                hours = settings.hours;
                minutes = settings.minutes;
                seconds = settings.seconds;
            }

            const lagClearKey = "lagclear_b";
            const lagClearBoolean = (paradoxModules[lagClearKey] as boolean) || false;

            if (lagClearBoolean === false) {
                // Enable LagClear
                paradoxModules[lagClearKey] = true;
                paradoxModules[lagClearSettingsKey] = { hours, minutes, seconds };
                world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
                player.sendMessage("§4[§6Paradox§4]§o§7 LagClear has been §aenabled§7.");
                LagClear(hours, minutes, seconds);
            } else {
                // Disable LagClear
                paradoxModules[lagClearKey] = false;
                world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
                player.sendMessage("§4[§6Paradox§4]§o§7 LagClear has been §4disabled§7.");
            }
        }
    },
};
