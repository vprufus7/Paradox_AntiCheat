import { Command } from "../../classes/CommandHandler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

// Define the ban command
export const banCommand: Command = {
    name: "ban",
    description: "Ban a player with an optional reason or list all banned players.",
    usage: "{prefix}ban [ -t | --target <player> ] [ -r | --reason <reason> ] [ -l | --list ]",
    examples: [`{prefix}ban -t Steve`, `{prefix}ban -t Steve -r Griefing`, `{prefix}ban -t Steve Bob -r Inappropriate Behavior`, `{prefix}ban -l`],
    category: "Moderation",
    securityClearance: 3,

    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Initialize or retrieve the banned players list
        let bannedPlayers: string[] = [];
        const bannedPlayersString = world.getDynamicProperty("bannedPlayers") as string;
        try {
            bannedPlayers = bannedPlayersString ? JSON.parse(bannedPlayersString) : [];
        } catch (error) {
            bannedPlayers = [];
        }

        // Check if the command is for listing banned players
        if (args.includes("-l") || args.includes("--list")) {
            if (bannedPlayers.length > 0) {
                message.sender.sendMessage("\n§o§7Banned Players:");
                bannedPlayers.forEach((player) => {
                    message.sender.sendMessage(` §o§7| [§f${player}§7]`);
                });
            } else {
                message.sender.sendMessage("§o§7No players are currently banned.");
            }
            return;
        }

        // Parse arguments for ban and reason
        let playerName = "";
        let reason = "No reason provided.";

        // Extract flags
        const targetFlagIndex = args.findIndex((arg) => arg === "-t" || arg === "--target");
        const reasonFlagIndex = args.findIndex((arg) => arg === "-r" || arg === "--reason");

        if (targetFlagIndex !== -1) {
            playerName = args
                .slice(targetFlagIndex + 1, reasonFlagIndex !== -1 ? reasonFlagIndex : undefined)
                .join(" ")
                .trim()
                .replace(/["@]/g, "");
        }

        if (reasonFlagIndex !== -1) {
            reason =
                args
                    .slice(reasonFlagIndex + 1)
                    .join(" ")
                    .trim() || reason;
        }

        // Function to get the player object by name
        const getPlayerObject = (name: string) => {
            return world.getAllPlayers().find((playerObject) => playerObject.name === name);
        };

        // Function to get player's security clearance
        const getPlayerSecurityClearance = (playerName: string) => {
            const player = getPlayerObject(playerName);
            return player ? (player.getDynamicProperty("securityClearance") as number) : undefined;
        };

        // Function to handle banning
        const banPlayer = (name: string) => {
            // Check if player is online
            const targetPlayer = getPlayerObject(name);
            const playerClearance = targetPlayer ? getPlayerSecurityClearance(name) : undefined;

            if (playerClearance === 4) {
                message.sender.sendMessage(`§o§7You cannot ban player "${name}" as they have the highest security clearance.`);
                return;
            }

            // Add player to banned list
            if (!bannedPlayers.includes(name)) {
                bannedPlayers.push(name);
                world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
                message.sender.sendMessage(`§o§7Player "${name}" has been added to the banned list with reason: ${reason}.`);
                if (!targetPlayer) {
                    message.sender.sendMessage(`§o§7Note: The ban will be canceled if the player has high security clearance when they join.`);
                }
            }

            if (targetPlayer) {
                // If the player is online, tag and kick them
                system.run(() => {
                    targetPlayer.addTag(`paradoxBanned:${reason}`);
                    const dimension = world.getDimension(targetPlayer.dimension.id);
                    dimension.runCommandAsync(`kick ${targetPlayer.name} §o§7\n\n${reason}`);
                });
                message.sender.sendMessage(`§o§7Player "${name}" has been banned with reason: ${reason}`);
            }
        };

        if (playerName) {
            banPlayer(playerName);
        } else {
            message.sender.sendMessage("§o§7Please provide a player name using the -t or --target flag.");
        }
    },
};
