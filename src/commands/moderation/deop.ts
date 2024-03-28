import { Command } from "../../classes/CommandHandler";

export const deopCommand: Command = {
    name: "deop",
    description: "Remove Paradox-Op permissions from a player.",
    usage: "{prefix}deop <player>",
    examples: [`{prefix}deop Player Name`, `{prefix}deop "Player Name"`, `{prefix}deop help`],
    execute: (message, args, minecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Function to remove player permissions based on the unique prefix
        function removePlayerPermissions(playerName: string): boolean {
            const player = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
            if (player && player.isValid()) {
                // Unique prefix
                const prefix = `__${player.id}`;
                player.setDynamicProperty(prefix, undefined);
                world.setDynamicProperty(prefix, undefined);
                return true;
            } else {
                return false;
            }
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§o§7Please provide a player name.");
            return;
        }

        // Join args to get the player name
        let playerName = args.join(" ").trim();

        // Remove "@" symbol from playerName if present
        if (playerName.startsWith("@")) {
            playerName = playerName.substring(1);
        }

        // Remove permissions for the player
        system.run(() => {
            const isValid = removePlayerPermissions(playerName);
            // Inform the sender if permissions have been removed
            if (isValid) {
                message.sender.sendMessage(`§o§7Permissions removed for player: "${playerName}"`);
            } else {
                message.sender.sendMessage(`§o§7Permissions not removed for player "${playerName}". Please try again!`);
            }
        });
    },
};
