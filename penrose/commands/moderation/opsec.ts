import { ChatSendBeforeEvent } from "@minecraft/server";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { Command } from "../../classes/command-handler";

/**
 * Represents the opsec command.
 */
export const opsecCommand: Command = {
    name: "opsec",
    description: "Change a player's security clearance level.",
    usage: "{prefix}opsec <player> <clearance>",
    examples: [`{prefix}opsec PlayerName 3`, `{prefix}opsec Player Name 3`, `{prefix}opsec "PlayerName" 3`],
    category: "Moderation",
    securityClearance: 4,

    // Command parameters for the GUI
    parameters: [
        {
            type: "dropdown",
            description: "Select player to change clearance",
        },
        {
            type: "slider",
            description: "Set the new security clearance level",
            min: 1,
            max: 4,
            default: 3,
        },
    ],

    /**
     * Executes the opsec command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const senderClearance = message.sender.getDynamicProperty("securityClearance") as number;

        // Validate command arguments
        if (args.length < 2) {
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 Please provide a player name and a clearance level.");
            return;
        }

        const targetPlayerName = args.slice(0, -1).join(" ").replace(/[@"]/g, "").trim();
        const newClearance = parseInt(args[args.length - 1]);

        // Check permission for security clearance 4
        if (senderClearance === 4 && newClearance === 4) {
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 This action is restricted. Use the OP command for clearance level 4.");
            return;
        }

        if (isNaN(newClearance) || newClearance < 1 || newClearance > 3) {
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 Invalid clearance level. Use a number between 1 and 3.");
            return;
        }

        const targetPlayer = world.getAllPlayers().find((player) => player.name === targetPlayerName);

        if (!targetPlayer || !targetPlayer.isValid()) {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${targetPlayerName}" not found or is invalid.`);
            return;
        }

        // Update and notify about the security clearance change
        targetPlayer.setDynamicProperty("securityClearance", newClearance);
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Security clearance for "${targetPlayer.name}" set to ${newClearance}.`);
        targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your security clearance has been updated to level ${newClearance} by "${message.sender.name}".`);
    },
};
