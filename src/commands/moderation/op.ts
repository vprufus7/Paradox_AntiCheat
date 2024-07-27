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
        const isClearanceGranted = world.getDynamicProperty("isClearanceGranted") as number;
        const securityCheck = message.sender.getDynamicProperty("securityClearance") as number;
        const paradoxOp = message.sender.getDynamicProperty("__paradox__op") as number;

        // Check if the player has permissions to execute the command
        if (!isClearanceGranted || securityCheck === 4) {
            // Grant clearance if the player meets the security requirements
            if (!securityCheck || paradoxOp === 4) {
                // Update security clearance to level 4
                message.sender.setDynamicProperty("securityClearance", 4);
                // Increment isClearanceGranted if clearance is granted
                const currentClearanceCount = isClearanceGranted || 0;
                world.setDynamicProperty("isClearanceGranted", currentClearanceCount + 1);
                return message.sender.sendMessage("§o§7You have updated your security clearance to level 4.");
            }
            // Inform the player if they have already executed the OP command
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
                        player.setDynamicProperty("__paradox__op", 4);
                        player.setDynamicProperty("securityClearance", 4);
                        // Increment isClearanceGranted if clearance is granted
                        const currentClearanceCount = isClearanceGranted || 0;
                        world.setDynamicProperty("isClearanceGranted", currentClearanceCount + 1);
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
    },
};
