import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the prefix command.
 */
export const prefixCommand: Command = {
    name: "prefix",
    description: "Changes the prefix for commands. Max is two characters.",
    usage: "{prefix}prefix [optional]",
    examples: [`{prefix}prefix !!`, `{prefix}prefix @@`, `{prefix}prefix !@`, `{prefix}prefix help`],
    category: "Moderation",
    securityClearance: 2,

    /**
     * Executes the prefix command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     * @returns {Promise<boolean>} A promise that resolves to true if the prefix update was successful, otherwise false.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment): Promise<boolean> => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        return new Promise<boolean>((resolve, _) => {
            system.run(() => {
                // Check if a new prefix is provided
                if (args.length > 0) {
                    // Limit the prefix to two characters
                    const newPrefix: string = args[0].slice(0, 2);

                    // Check if the new prefix contains '/'
                    if (newPrefix.includes("/")) {
                        message.sender.sendMessage("§o§7Prefix cannot include '/'.");
                        resolve(false); // Return false indicating failure;
                    }
                    // Retrieve the current prefix from dynamic properties
                    const currentPrefix: string = world.getDynamicProperty("__prefix") as string;

                    // Check if the new prefix is different from the current one
                    if (newPrefix !== currentPrefix) {
                        // Save the new prefix to a dynamic property
                        world.setDynamicProperty("__prefix", newPrefix);

                        // Send confirmation message
                        message.sender.sendMessage(`§o§7Prefix updated to: ${newPrefix}`);
                        resolve(true); // Return true indicating success
                    } else {
                        // Send message indicating the prefix hasn't changed
                        message.sender.sendMessage(`§o§7Prefix is already "${newPrefix}".`);
                        resolve(false); // Return false indicating failure
                    }
                } else {
                    // Send message indicating no prefix provided
                    message.sender.sendMessage("§o§7No new prefix provided.");
                    resolve(false); // Return false indicating failure
                }
            });
        });
    },
};
