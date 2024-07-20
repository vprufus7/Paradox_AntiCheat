import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the rank command.
 */
export const setRankCommand: Command = {
    name: "setrank",
    description: "Sets or resets the chat rank for a player.",
    usage: "{prefix}setrank [-t|--target <player>] [-r|--rank <rank>] [--reset]",
    examples: [
        `{prefix}setrank -t PlayerName -r Admin`,
        `{prefix}setrank --target PlayerName --rank Member`,
        `{prefix}setrank -r Admin -t PlayerName`,
        `{prefix}setrank --rank Member --target PlayerName`,
        `{prefix}setrank -t PlayerName --reset`,
        `{prefix}setrank --target PlayerName --reset`,
    ],
    category: "Utility",
    securityClearance: 3,

    /**
     * Executes the setrank command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();

        // Initialize variables for player name, rank, and reset flag
        let playerName = "";
        let rank = "";
        let reset = false;

        // Parse the arguments using parameter flags
        while (args.length > 0) {
            const flag = args.shift();
            switch (flag) {
                case "-t":
                case "--target":
                    playerName = args.shift()?.replace(/["@]/g, "") || "";
                    break;
                case "-r":
                case "--rank":
                    rank = args.shift()?.replace(/["@]/g, "") || "";
                    break;
                case "--reset":
                    reset = true;
                    break;
            }
        }

        // Check if player name is provided
        if (!playerName) {
            const prefix = world.getDynamicProperty("__prefix") || "!";
            message.sender.sendMessage(`Usage: ${prefix}setrank -t <player> [-r <rank> | --reset]`);
            return;
        }

        // Find the player object in the world
        const player = world.getPlayers().find((playerObject) => playerObject.name === playerName);

        // If player not found, inform the sender
        if (!player) {
            message.sender.sendMessage(`Player "${playerName}" not found.`);
            return;
        }

        if (reset) {
            // Remove the player's chat rank
            player.setDynamicProperty("chatRank", undefined);

            // Inform the sender and the target player about the rank reset
            message.sender.sendMessage(`Chat rank for player "${player.name}" has been reset.`);
            player.sendMessage(`Your chat rank has been reset by "${message.sender.name}".`);
        } else {
            // Check if rank is provided
            if (!rank) {
                const prefix = world.getDynamicProperty("__prefix") || "!";
                message.sender.sendMessage(`Usage: ${prefix}setrank -t <player> -r <rank> | --reset`);
                return;
            }

            // Update the player's chat rank
            player.setDynamicProperty("chatRank", rank);

            // Inform the sender and the target player about the rank update
            message.sender.sendMessage(`Chat rank for player "${player.name}" has been set to ${rank}.`);
            player.sendMessage(`Your chat rank has been set to ${rank} by "${message.sender.name}".`);
        }
    },
};
