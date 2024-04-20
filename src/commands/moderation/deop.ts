import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the deop command.
 */
export const deopCommand: Command = {
    name: "deop",
    description: "Remove Paradox-Op permissions from a player.",
    usage: "{prefix}deop <player>",
    examples: [`{prefix}deop Player Name`, `{prefix}deop "Player Name"`, `{prefix}deop help`],
    category: "Moderation",

    /**
     * Executes the deop command.
     * @param {Message} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     * @returns {Promise<void>} A promise that resolves once the command execution is complete.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        return new Promise<void>((resolve) => {
            // Retrieve the world and system from the Minecraft environment
            const world = minecraftEnvironment.getWorld();
            const system = minecraftEnvironment.getSystem();

            /**
             * Removes Paradox-Op permissions associated with a player based on a unique prefix.
             * @param {string} playerName - The name of the player whose permissions should be removed.
             * @returns {boolean} True if permissions were successfully removed, false otherwise.
             */
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
                resolve();
                return;
            }

            // Join args to get the player name
            const playerName = args.join(" ").trim().replace(/["@]/g, "");

            // Remove permissions for the player
            system.run(() => {
                const isValid = removePlayerPermissions(playerName);
                // Inform the sender if permissions have been removed
                if (isValid) {
                    message.sender.sendMessage(`§o§7Permissions removed for player: "${playerName}"`);
                } else {
                    message.sender.sendMessage(`§o§7Permissions not removed for player "${playerName}". Please try again!`);
                }
                resolve();
            });
        });
    },
};
