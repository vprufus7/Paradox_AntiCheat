import { Player, ChatSendBeforeEvent } from "@minecraft/server";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

/**
 * Represents the opsec command.
 */
export const opsecCommand = {
    name: "opsec",
    description: "Change a player's security clearance level.",
    usage: "{prefix}opsec <player> <clearance>",
    examples: [`{prefix}opsec PlayerName 3`, `{prefix}opsec Player Name 3`, `{prefix}opsec "PlayerName" 3`],
    category: "Moderation",
    securityClearance: 4,

    /**
     * Executes the opsec command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();

        const newClearance = parseInt(args[args.length - 1]);

        const securityCheck = message.sender.getDynamicProperty("securityClearance") as number;
        if (securityCheck === 4 && !isNaN(newClearance) && newClearance === 4) {
            message.sender.sendMessage("§o§7This is not permitted. Please use the OP command for this security clearance.");
            return;
        }

        // Check if enough arguments are provided
        if (args.length < 2) {
            message.sender.sendMessage("§o§7Please provide a player name and a clearance level.");
            return;
        }

        const targetPlayerName = args[0].replace(/["@]/g, "");

        // Validate the provided clearance level
        if (isNaN(newClearance) || newClearance < 1 || newClearance > 3) {
            message.sender.sendMessage("§o§7Invalid clearance level. Please provide a number between 1 and 3.");
            return;
        }

        /**
         * Retrieves the player object corresponding to the provided player name.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player} The player object corresponding to the provided player name.
         */
        function getPlayerObject(playerName: string): Player {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        let targetPlayer: Player;

        // Handle different formats of player names
        if (args.length === 2) {
            // Case 1: Only first name provided
            targetPlayer = getPlayerObject(targetPlayerName);
        } else {
            // Case 2: Full name provided, concatenate and sanitize
            const fullName = args.slice(0, -1).join(" ").replace(/[@"]/g, "").trim();
            targetPlayer = getPlayerObject(fullName);
        }

        // Check if the player object is found and valid
        if (!targetPlayer || !targetPlayer.isValid()) {
            message.sender.sendMessage(`§o§7Player "${targetPlayerName}" not found or not valid.`);
            return;
        }

        // Update the player's security clearance
        targetPlayer.setDynamicProperty("securityClearance", newClearance);

        // Inform the sender and the target player about the clearance update
        message.sender.sendMessage(`§o§7Security clearance for player "${targetPlayer.name}" updated to level ${newClearance}.`);
        targetPlayer.sendMessage(`§o§7Security clearance has been updated to level ${newClearance} by "${message.sender.name}".`);
    },
};
