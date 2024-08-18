import { Player, ChatSendBeforeEvent, ItemEnchantableComponent, EntityInventoryComponent, EnchantmentType } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

/**
 * Represents the invsee command.
 */
export const invseeCommand: Command = {
    name: "invsee",
    description: "Shows the entire inventory of the specified player.",
    usage: "{prefix}invsee <player>",
    examples: [`{prefix}invsee PlayerName`, `{prefix}invsee help`],
    category: "Utility",
    securityClearance: 3,

    /**
     * Executes the invsee command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

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

        // Retrieve the player object
        const member: Player | undefined = getPlayerObject(playerName);

        // Retrieve the player's inventory
        system.run(() => {
            if (member && member.isValid()) {
                const inv = member.getComponent("inventory") as EntityInventoryComponent;
                const container = inv.container;

                // Display the player's inventory
                const inventoryMessage = [
                    ` `,
                    `§4[§6Paradox§4]§o§7 ${member.name}'s inventory:`,
                    ...Array.from(Array(container.size), (_a, i) => {
                        let enchantmentInfo = "";
                        const item = container.getItem(i);
                        if (item) {
                            const enchantmentComponent = item.getComponent("enchantable") as ItemEnchantableComponent;
                            if (enchantmentComponent) {
                                const enchantmentList = enchantmentComponent.getEnchantments();

                                if (enchantmentList.length > 0) {
                                    const enchantmentNames = enchantmentList.map(
                                        (enchantment) => `        §7- §7[§f${(enchantment.type as EnchantmentType).id}§7] §7Level: §4${enchantment.level} §7/ §4${(enchantment.type as EnchantmentType).maxLevel}`
                                    );
                                    enchantmentInfo = `\n    §7[§fEnchantments§7]:\n${enchantmentNames.join("\n")}`;
                                }
                                if (enchantmentInfo) {
                                    enchantmentInfo = enchantmentInfo + "\n";
                                }
                            }
                        }

                        return `  §o§7| [§fSlot ${i}§7] §4=>§f ${item ? `§7[§f${item.typeId.replace("minecraft:", "")}§7] Amount: §4x${item.amount}` : "§7(§fempty§7)"}${enchantmentInfo}`;
                    }),
                    ` `,
                ];

                message.sender.sendMessage(inventoryMessage.join("\n"));
            } else {
                message.sender.sendMessage(`§4[§6Paradox§4]§o§7 Failed to view inventory of "${member ? member.name : playerName}"! Please try again.`);
            }
        });
    },
};
