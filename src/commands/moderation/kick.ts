import { Player } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";

export const kickCommand: Command = {
    name: "kick",
    description: "Kick the specified player from the server.",
    usage: "{prefix}kick [-t|--target <player>] [-r|--reason <reason>]",
    category: "Moderation",
    examples: [
        `{prefix}kick -t PlayerName -r "Reason for kick"`,
        `{prefix}kick --target PlayerName --reason "Reason for kick"`,
        `{prefix}kick -r "Reason for kick" -t PlayerName`,
        `{prefix}kick --reason "Reason for kick" --target PlayerName`,
        `{prefix}kick help`,
    ],
    execute: (message, args, minecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Initialize variables for player name and reason
        let playerName = "";
        let reason = "";

        // Parse the arguments using parameter flags
        while (args.length > 0) {
            const flag = args.shift();
            switch (flag) {
                case "-t":
                case "--target":
                    playerName = args.shift()?.replace(/["@]/g, "") || "";
                    break;
                case "-r":
                case "--reason":
                    reason = args.shift()?.replace(/["@]/g, "") || `Farewell`;
                    break;
            }
        }

        // Find the player object in the world
        const player: Player | undefined = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);

        // If player not found, inform the sender
        if (!player) {
            message.sender.sendMessage(`§o§7Player "${playerName}" not found.`);
            return;
        }

        system.run(() => {
            if (player.isValid()) {
                // Kick the player with the specified reason
                world.getDimension(player.dimension.id).runCommand(`kick ${playerName} §f\n§l§o§7YOU ARE KICKED!\n\n[§fKicked By§7]§f: §7${message.sender.name || "§7N/A"}\n§7[§fReason§7]§f: §7${reason || "§7Farewell"}§f`);

                // Check if the player is still in the world
                const playerStillExists = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);

                // Inform the sender about the action based on whether the player is still in the world
                if (playerStillExists) {
                    message.sender.sendMessage(`§o§7${player.name} has been kicked from the server.`);
                } else {
                    message.sender.sendMessage(`§o§7${player.name} has not been kicked from the server.`);
                }
            }
        });
    },
};
