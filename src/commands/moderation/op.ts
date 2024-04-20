import { ChatSendBeforeEvent, Player, World } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the op command.
 */
export const opCommand: Command = {
    name: "op",
    description: "Grant a player Paradox-Op!",
    usage: "{prefix}op <player>",
    examples: [`{prefix}op`, `{prefix}op Player Name`, `{prefix}op "Player Name"`, `{prefix}op help`],
    category: "Moderation",

    /**
     * Executes the op command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment): void => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        /**
         * Retrieves the permissions associated with a player based on a unique prefix.
         * @param {string} prefix - The unique prefix used to identify the permissions.
         * @param {Player} player - The player whose permissions are being retrieved.
         * @returns {string | undefined} The permissions associated with the player, or undefined if no permissions are found.
         */
        function getPlayerPermissions(prefix: string, player: Player): string | undefined {
            const permIds: string[] = player.getDynamicPropertyIds();
            return permIds.find((id: string) => id.startsWith(prefix));
        }

        /**
         * Retrieves the permissions associated with a world based on a unique prefix.
         * @param {string} prefix - The unique prefix used to identify the permissions.
         * @param {World} world - The world whose permissions are being retrieved.
         * @returns {string | undefined} The permissions associated with the world, or undefined if no permissions are found.
         */
        function getWorldPermissions(prefix: string, world: World): string | undefined {
            const permIds: string[] = world.getDynamicPropertyIds();
            return permIds.find((id: string) => id.startsWith(prefix));
        }

        // Retrieve permissions for the player and the world
        const prefix: string = `__${message.sender.id}`; // Unique prefix for permissions
        const playerPerms: string | undefined = getPlayerPermissions(prefix, message.sender);
        const worldPerms: string | undefined = getWorldPermissions(prefix, world);

        // Check if the player has permissions to execute the command
        if (!worldPerms || (worldPerms && playerPerms === worldPerms)) {
            message.sender.sendMessage("§o§7You have executed the OP command. Please close this window.");
        } else {
            // Not authorized
            message.sender.sendMessage("§o§7You do not have permissions.");
            return;
        }

        // Check if player argument is provided
        let player: Player | undefined = undefined;
        const playerName: string = args.join(" ").trim().replace(/["@]/g, "");

        if (playerName.length > 0) {
            // Find the player object in the world
            player = world.getAllPlayers().find((playerObject: Player) => playerObject.name === playerName);
        }

        // If no player name is provided or player not found, default to message sender
        if (!player && playerName.length === 0) {
            player = message.sender;
        }

        // Inform if the player is not found
        if (!player) {
            message.sender.sendMessage(`§o§7Player "${playerName}" not found.`);
            return;
        }

        /**
         * Opens a GUI for displaying a failed message and prompts the user to retry.
         * @param {Player} player - The player to whom the GUI should be displayed.
         * @param {World} world - The world in which the player resides.
         * @returns {void}
         */
        const opFailGui: Function = (player: Player, world: World): void => {
            const failGui = minecraftEnvironment.initializeMessageFormData();

            /// Set title and text fields if the GUI is being initialized
            failGui.title("                 Paradox Op"); // title doesn't auto center the text
            failGui.body("§o§7Please enter a new password again. Your confirmed password did not match!");
            failGui.button1("Ok");
            failGui.button2("Cancel");

            // Show the GUI
            failGui
                .show(player)
                .then((result) => {
                    // Check if the GUI was canceled
                    if (result && (result.canceled || result.selection === 1)) {
                        // Abandon
                        return void 0;
                    } else {
                        // Try again
                        openOpGui(player, world);
                    }
                })
                .catch((error: Error) => {
                    // Handle errors
                    console.error("Paradox Unhandled Rejection: ", error);
                    // Extract stack trace information
                    if (error instanceof Error) {
                        const stackLines: string[] = error.stack.split("\n");
                        if (stackLines.length > 1) {
                            const sourceInfo: string[] = stackLines;
                            console.error("Error originated from:", sourceInfo[0]);
                        }
                    }
                });
        };

        /**
         * Opens a GUI for setting a new password.
         * @param {Player} player - The player to whom the GUI should be displayed.
         * @param {World} world - The world in which the player resides.
         * @returns {void}
         */
        const openOpGui: Function = (player: Player, world: World): void => {
            // Initialize the modal form data
            const opGui = minecraftEnvironment.initializeModalFormData();

            // Set title and text fields if the GUI is being initialized
            opGui.title("Paradox Op");
            opGui.textField("\nNew Password:", "Enter Password");
            opGui.textField("\nConfirm New Password:", "Enter Password");

            // Show the GUI
            opGui
                .show(player)
                .then((result) => {
                    // Check if the GUI was canceled due to user being busy
                    if (result && result.canceled && result.cancelationReason === "UserBusy") {
                        // Open GUI again
                        return openOpGui(player, world);
                    }

                    // Retrieve form values from the result or use an empty array as a fallback
                    const formValues: any[] = result?.formValues || [];

                    // Check if formValues is empty
                    if (formValues.length === 0) {
                        // Return if formValues is empty
                        return;
                    }

                    // Destructure formValues
                    const [newPassword, confirmPassword]: string[] = formValues;

                    // Unique prefix for permissions
                    const newPrefix: string = `__${player.id}`;
                    // Check if passwords match
                    if (newPassword !== confirmPassword) {
                        opFailGui(player, world);
                    } else {
                        // Set player and world properties with the new password
                        player.setDynamicProperty(newPrefix, newPassword);
                        world.setDynamicProperty(newPrefix, newPassword);
                        player.sendMessage("§o§7Your password is set!");
                    }
                })
                .catch((error: Error) => {
                    // Handle errors
                    console.error("Paradox Unhandled Rejection: ", error);
                    // Extract stack trace information
                    if (error instanceof Error) {
                        const stackLines: string[] = error.stack.split("\n");
                        if (stackLines.length > 1) {
                            const sourceInfo: string[] = stackLines;
                            console.error("Error originated from:", sourceInfo[0]);
                        }
                    }
                });
        };

        // Run the function to open the GUI within the Minecraft system
        system.run(() => {
            openOpGui(player, world);
        });
    },
};
