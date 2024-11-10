import { ChatSendBeforeEvent, Player, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { commandHandler } from "../../paradox";
import { buildCommandMenu } from "./command-menu-builder";

/**
 * Represents the GUI opening command.
 */
export const guiCommand: Command = {
    name: "opengui",
    description: "Opens the main GUI for the player, filtered by their security clearance.",
    usage: "{prefix}opengui",
    category: "Utility",
    examples: [`{prefix}opengui`],
    securityClearance: 1,

    /**
     * Executes the GUI opening command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;

        // Use the existing method to get the player's security clearance
        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) || 0;

        /**
         * Opens the main GUI for the player, filtering by their security clearance.
         * @param {Player} player - The player to show the menu to.
         * @param {number} playerClearance - The security clearance level of the player.
         */
        function openMainGui(player: Player, playerClearance: number) {
            const commands = commandHandler.getRegisteredCommands();
            const categories: { [key: string]: Command[] } = {};

            commands.forEach((command) => {
                const { category, securityClearance } = command;
                if (securityClearance <= playerClearance) {
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(command);
                }
            });

            const accessibleCategories = Object.entries(categories).map(([category, commands]) => ({ category, commands }));

            if (accessibleCategories.length === 0) {
                player.sendMessage("You do not have access to any commands.");
                return;
            }

            // Main menu with categories
            const actionFormData = minecraftEnvironment.initializeActionFormData();
            const mainMenu = actionFormData.title("Main Menu").body("Select a category:");

            accessibleCategories.forEach(({ category }) => {
                mainMenu.button(category);
            });

            mainMenu.show(player).then((response) => {
                if (response.canceled && response.cancelationReason === "UserBusy") {
                    return openMainGui(player, playerSecurityClearance);
                }
                if (!response.canceled) {
                    const selectedCategory = accessibleCategories[response.selection];
                    openCategoryMenu(player, selectedCategory.category, selectedCategory.commands);
                }
            });
        }

        /**
         * Opens the command menu for a specific category.
         * @param {Player} player - The player to show the menu to.
         * @param {string} categoryName - The selected category name.
         * @param {Command[]} commands - The available commands in the category.
         */
        function openCategoryMenu(player: Player, categoryName: string, commands: Command[]) {
            const actionFormData = minecraftEnvironment.initializeActionFormData();
            const form = actionFormData.title(`${categoryName} Commands`).body("Select a command:");

            commands.forEach((command) => {
                form.button(command.name);
            });

            form.show(player).then((response) => {
                if (!response.canceled) {
                    const selectedCommand = commands[response.selection];
                    if (selectedCommand) {
                        buildCommandMenu(selectedCommand, player, minecraftEnvironment);
                    }
                }
            });
        }

        // Open the main GUI for the player based on clearance level
        system.run(() => openMainGui(player, playerSecurityClearance));
    },
};
