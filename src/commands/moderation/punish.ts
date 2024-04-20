import { EntityEquippableComponent, EntityInventoryComponent, Player, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the punish command.
 */
export const punishCommand: Command = {
    name: "punish",
    description: "Removes all items from the player's inventory, equipment, and ender chest.",
    usage: "{prefix}punish <player>",
    examples: [`{prefix}punish Player Name`, `{prefix}punish "Player Name"`, `{prefix}punish help`],
    category: "Moderation",
    securityClearance: 2,

    /**
     * Executes the punish command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const equipmentSlot = minecraftEnvironment.getEquipmentSlot();

        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player} The player object corresponding to the provided player name.
         */
        function getPlayerObject(playerName: string): Player {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        // Check if player argument is provided
        if (!args.length) {
            message.sender.sendMessage("§o§7Please provide a player name.");
            return;
        }

        // Join args to get the player name
        const playerName: string = args.join(" ").trim().replace(/["@]/g, "");

        // Wipe them out
        system.run(() => {
            const target: Player = getPlayerObject(playerName);
            if (target && target.isValid()) {
                // Wipe out items in each equipment slot from requested player's equipment container
                for (const slot of Object.values(equipmentSlot)) {
                    const equippableContainer: EntityEquippableComponent = target.getComponent("minecraft:equippable") as EntityEquippableComponent;
                    equippableContainer.setEquipment(slot); // Set the slot to wipe out
                }

                // Get requested player's inventory so we can wipe it out
                const inventoryContainer: EntityInventoryComponent = target.getComponent("minecraft:inventory") as EntityInventoryComponent;
                const inventory = inventoryContainer.container;

                // Wipe everything in their inventory
                inventory.clearAll();

                // Wipe their ender chest
                // There are 30 slots ranging from 0 to 29
                for (let slot = 0; slot < 30; slot++) {
                    target.runCommand(`replaceitem entity @s slot.enderchest ${slot} air`);
                }

                message.sender.sendMessage(`§o§7Punished "${target.name}"!`);
            } else {
                message.sender.sendMessage(`§o§7Failed to punish "${target ? target.name : playerName}"! Please try again.`);
            }
        });
    },
};
