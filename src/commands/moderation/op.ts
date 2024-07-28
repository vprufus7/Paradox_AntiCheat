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
    securityClearance: 4,

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

        // Retrieve permissions for the player and the world
        const securityCheck = message.sender.getDynamicProperty("securityClearance") as number;

        /**
         * Prompts the player to enter their password and verifies it.
         * @param {Player} player - The player to whom the GUI should be displayed.
         * @returns {Promise<boolean>} - A Promise that resolves to true if the password is correct, false otherwise.
         */
        const promptForPassword = (player: Player): Promise<boolean> => {
            return new Promise((resolve, reject) => {
                const showPasswordPrompt = () => {
                    // Initialize the modal form data
                    const passwordGui = minecraftEnvironment.initializeModalFormData();

                    // Set title and text fields if the GUI is being initialized
                    passwordGui.title("Paradox Op");
                    passwordGui.textField("\nEnter Password:", "Enter Password");

                    // Show the GUI
                    passwordGui
                        .show(player)
                        .then((result) => {
                            // Check if the GUI was canceled due to user being busy
                            if (result && result.canceled && result.cancelationReason === "UserBusy") {
                                showPasswordPrompt();
                                return;
                            }

                            // Retrieve form values from the result or use an empty array as a fallback
                            const formValues = result?.formValues || [];

                            // Check if formValues is empty
                            if (formValues.length === 0) {
                                resolve(false);
                                return;
                            }

                            // Destructure formValues
                            const [enteredPassword] = formValues;

                            // Retrieve the stored password for verification
                            const storedPassword = world.getDynamicProperty("paradoxPassword") as string;

                            // Verify if the entered password matches the stored password
                            if (enteredPassword === storedPassword) {
                                // Password matches
                                resolve(true);
                            } else {
                                // Inform the player about the incorrect password
                                player.sendMessage("§o§7Incorrect password. Please try again.");
                                // Re-prompt for password
                                showPasswordPrompt();
                            }
                        })
                        .catch((error: Error) => {
                            // Handle errors
                            console.error("Paradox Unhandled Rejection: ", error);
                            reject(error);
                        });
                };

                showPasswordPrompt();
            });
        };

        /**
         * The remaining logic to be executed after password validation.
         * @param {Player} player - The player to whom the GUI should be displayed.
         */
        const continueOpCommand = (player: Player) => {
            // Grant clearance if the player meets the security requirements
            if (!securityCheck) {
                // Update security clearance to level 4
                player.setDynamicProperty("securityClearance", 4);
                player.sendMessage("§o§7You have updated your security clearance to level 4.");
                return;
            }

            // Check if player argument is provided
            let targetPlayer: Player | undefined = undefined;
            const playerName: string = args.join(" ").trim().replace(/["@]/g, "");

            if (playerName.length > 0) {
                // Find the player object in the world
                targetPlayer = world.getAllPlayers().find((playerObject: Player) => playerObject.name === playerName);
            }

            // If no player name is provided or player not found, default to message sender
            if (!targetPlayer && playerName.length === 0) {
                targetPlayer = player;
            }

            // Inform if the player is not found
            if (!targetPlayer) {
                player.sendMessage(`§o§7Player "${playerName}" not found.`);
                return;
            }

            if (targetPlayer.name !== player.name) {
                // Set player and world properties
                targetPlayer.setDynamicProperty("securityClearance", 4);
                targetPlayer.sendMessage(`§o§7Your security clearance has been updated by ${player.name}!`);
                player.sendMessage(`§o§7Security clearance has been updated for ${targetPlayer.name}!`);
                return;
            }

            // Inform the player if they have already executed the OP command
            player.sendMessage("§o§7You have executed the OP command. Please close this window.");

            /**
             * Opens a GUI for displaying a failed message and prompts the user to retry.
             * @param {Player} player - The player to whom the GUI should be displayed.
             * @param {World} world - The world in which the player resides.
             * @returns {void}
             */
            const opFailGui = (player: Player, world: World): void => {
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
            const openOpGui = (player: Player, world: World): void => {
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
                        const formValues = result?.formValues || [];

                        // Check if formValues is empty
                        if (formValues.length === 0) {
                            // Return if formValues is empty
                            return;
                        }

                        // Destructure formValues
                        const [newPassword, confirmPassword] = formValues;

                        // Check if passwords match
                        if (newPassword !== confirmPassword) {
                            opFailGui(player, world);
                        } else {
                            // Set player and world properties with the new password
                            player.setDynamicProperty("securityClearance", 4);
                            world.setDynamicProperty("paradoxPassword", confirmPassword);
                            player.sendMessage("§o§7Your security clearance has been updated!");
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
        };

        // If clearance is already granted and security level is 4, prompt for password
        const pass = world.getDynamicProperty("paradoxPassword") as string;
        if (pass && securityCheck === 4) {
            system.run(() => {
                promptForPassword(message.sender)
                    .then((validated) => {
                        if (!validated) {
                            message.sender.sendMessage("§o§7Password validation failed.");
                            return;
                        }
                        continueOpCommand(message.sender);
                    })
                    .catch((error) => {
                        console.error("Password validation failed: ", error);
                    });
            });
            return;
        } else if (pass && securityCheck < 4) {
            message.sender.sendMessage("§o§7You do not have permissions!");
            return;
        }
        continueOpCommand(message.sender);
    },
};
