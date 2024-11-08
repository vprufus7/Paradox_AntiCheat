import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

// Define the ban command
export const banCommand: Command = {
    name: "ban",
    description: "Ban a player with an optional reason or list all banned players.",
    usage: "{prefix}ban [ -t | --target <player> ] [ -r | --reason <reason> ] [ -l | --list ]",
    examples: [`{prefix}ban -t Steve`, `{prefix}ban -t Steve -r Griefing`, `{prefix}ban -t Steve Bob -r Inappropriate Behavior`, `{prefix}ban -l`],
    category: "Moderation",
    securityClearance: 3,

    /**
     * Executes the ban command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
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
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Banned Players:");
                bannedPlayers.forEach((player) => {
                    message.sender.sendMessage(` §o§7| [§f${player}§7]`);
                });
            } else {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently banned.");
            }
            return;
        }

        // Initialize variables for player name and reason
        let playerName = "";
        let reason = "No reason provided.";

        // Define valid flags
        const validFlags = new Set(["-t", "--target", "-r", "--reason"]);

        /**
         * Captures and returns a multi-word argument from the provided array of arguments.
         * This function continues to concatenate words from the `args` array until it encounters
         * a valid flag or runs out of arguments.
         *
         * @param {string[]} args - The array of arguments to parse.
         * @returns {string} - The captured multi-word argument as a string.
         */
        function captureMultiWordArgument(args: string[]): string {
            let result = "";
            while (args.length > 0 && !validFlags.has(args[0])) {
                result += (result ? " " : "") + args.shift();
            }
            return result.replace(/["@]/g, "");
        }

        // Parse the arguments using parameter flags
        while (args.length > 0) {
            const flag = args.shift();
            switch (flag) {
                case "-t":
                case "--target":
                    playerName = captureMultiWordArgument(args);
                    break;
                case "-r":
                case "--reason":
                    reason = captureMultiWordArgument(args) || "No reason provided.";
                    break;
            }
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
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You cannot ban player "${name}" as they have the highest security clearance.`);
                return;
            }

            // Add player to banned list
            if (!bannedPlayers.includes(name)) {
                bannedPlayers.push(name);
                world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}" has been added to the banned list with reason: ${reason}.`);
                if (!targetPlayer) {
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Note: The ban will be canceled if the player has high security clearance when they join.`);
                }
            }

            if (targetPlayer) {
                // If the player is online, tag and kick them
                system.run(() => {
                    targetPlayer.addTag(`paradoxBanned:${reason}`);
                    const dimension = world.getDimension(targetPlayer.dimension.id);
                    dimension.runCommandAsync(`kick ${targetPlayer.name} §o§7\n\n${reason}`);
                });
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}" has been banned with reason: ${reason}`);
            }
        };

        if (playerName) {
            banPlayer(playerName);
        } else {
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 Please provide a player name using the -t or --target flag.");
        }
    },
};
