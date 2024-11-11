import { ModalFormResponse } from "@minecraft/server-ui";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { Player, world } from "@minecraft/server";
import CryptoES from "../../node_modules/crypto-es/lib/index";

/**
 * Represents a dynamic input field in a ModalFormData form.
 */
interface DynamicField {
    type: "text" | "dropdown" | "toggle";
    name: string;
    arg?: string;
    placeholder?: string;
    options?: string[];
}

/**
 * Builds a command-specific menu based on `GuiInstructions`.
 * @param {Command} command - The command object containing parameters and execution logic.
 * @param {Player} player - The player who will interact with the menu.
 * @param {MinecraftEnvironment} minecraftEnvironment - The environment object to initialize the form.
 */
export function buildCommandMenu(command: Command, player: Player, minecraftEnvironment: MinecraftEnvironment) {
    const { guiInstructions } = command;

    if (!guiInstructions) {
        console.error("No GUI instructions found for command.");
        return;
    }

    const { formType, title, description, actions, dynamicFields } = guiInstructions;

    // Display an ActionFormData form if specified
    if (formType === "ActionFormData") {
        const actionForm = minecraftEnvironment
            .initializeActionFormData()
            .title(title)
            .body(description || "");

        // Add each action button to the form
        actions?.forEach((action) => {
            actionForm.button(action.name);
        });

        actionForm
            .show(player)
            .then((response) => {
                if (!response.canceled && response.selection !== undefined) {
                    // Get selected action and its required fields
                    const selectedAction = actions[response.selection];
                    const selectedRequiredFields = selectedAction.requiredFields || [];

                    // If no required fields, directly execute the command
                    if (selectedRequiredFields.length === 0) {
                        const chatSendBeforeEvent = {
                            cancel: false,
                            message: "",
                            sender: player,
                        };
                        // Execute the command immediately without showing the modal form
                        command.execute(chatSendBeforeEvent, [selectedAction.command], minecraftEnvironment, selectedAction.crypto ? CryptoES : undefined);
                    } else {
                        // Filter dynamicFields based on selected action's requiredFields
                        const conditionalFields = dynamicFields.filter((field) => selectedRequiredFields.includes(field.name));

                        // Show modal form with filtered conditional fields
                        showModalForm(conditionalFields, title, player, command, minecraftEnvironment, selectedAction.command, selectedAction.crypto);
                    }
                }
            })
            .catch((error) => console.error("Error showing action form:", error));
    }
    // Display a ModalFormData directly if formType is not ActionFormData
    else if (formType === "ModalFormData") {
        showModalForm(dynamicFields || [], title, player, command, minecraftEnvironment, "");
    }
}

/**
 * Displays a ModalFormData form based on `dynamicFields`.
 * @param {DynamicField[]} dynamicFields - Array of dynamic fields for the modal form.
 * @param {string} title - The title of the form.
 * @param {Player} player - The player who will interact with the form.
 * @param {Command} command - The command object to execute upon form submission.
 * @param {MinecraftEnvironment} minecraftEnvironment - The environment object to initialize the form.
 * @param {string} selectedAction - The specific action selected by the player in the ActionFormData.
 */
function showModalForm(dynamicFields: DynamicField[], title: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, selectedAction: string, cryptoES?: boolean) {
    const { guiInstructions } = command;
    const commandOrder = guiInstructions.commandOrder || undefined;

    const modalForm = minecraftEnvironment.initializeModalFormData().title(`${title}`);

    // Iterate over each dynamic field and add it to the modal form
    for (const field of dynamicFields) {
        if (field.type === "text") {
            modalForm.textField(field.placeholder || "", field.name);
        } else if (field.type === "dropdown") {
            // Populate dropdown options with all player names
            const allPlayers = world.getAllPlayers().map((player) => player.name);
            field.options = allPlayers; // Override options with player names
            modalForm.dropdown(field.placeholder, field.options, -1);
        } else if (field.type === "toggle") {
            modalForm.toggle(field.name, false);
        }
    }

    modalForm
        .show(player)
        .then((response) => {
            if (!response.canceled) {
                const args = parseFormResponse(response, dynamicFields);
                const commandString = buildCommandString(commandOrder, selectedAction, args);
                const chatSendBeforeEvent = {
                    cancel: false,
                    message: "",
                    sender: player,
                };
                command.execute(chatSendBeforeEvent, commandString, minecraftEnvironment, cryptoES ? CryptoES : undefined);
            }
        })
        .catch((error) => console.error("Error showing modal form:", error));
}

/**
 * Builds the command string based on the specified command order.
 * @param {string | undefined} commandOrder - The order to use ("command-arg", "arg-command", or undefined).
 * @param {string} selectedAction - The selected command action.
 * @param {string[]} args - Array of command arguments.
 * @returns {string} - The formatted command string.
 */
function buildCommandString(commandOrder: string | undefined, selectedAction: string, args: string[]): string[] {
    // A helper function to split compound arguments (like "--room test") into separate parts
    function splitArgs(args: string[]): string[] {
        const splitArgs: string[] = [];
        args.forEach((arg) => {
            const parts = arg.split(" ");
            splitArgs.push(...parts); // Spread the parts so they are added as separate elements
        });
        return splitArgs;
    }

    const splitArgsList = splitArgs(args);

    if (commandOrder === "command-arg") {
        // Command comes first followed by split arguments
        return [selectedAction, ...splitArgsList];
    } else if (commandOrder === "arg-command") {
        // Arguments come first followed by the command
        return [...splitArgsList, selectedAction];
    } else {
        // If no specific order, just return the split arguments
        return splitArgsList;
    }
}

/**
 * Parses user response into command arguments based on `DynamicField` definitions.
 * @param {ModalFormResponse} response - The form response with user input.
 * @param {DynamicField[]} fields - The fields that define how to interpret the response.
 * @returns {string[]} - An array of arguments parsed from the form response, formatted as ["--arg value"].
 */
function parseFormResponse(response: ModalFormResponse, fields: DynamicField[]): string[] {
    const args: string[] = [];
    let formIndex = 0;

    fields.forEach((field) => {
        let value = "";

        switch (field.type) {
            case "text":
                value = response.formValues[formIndex++] as string;
                break;

            case "dropdown":
                // Get selected player name or option based on the index
                const selectedIndex = response.formValues[formIndex++] as number;
                value = field.options[selectedIndex];
                break;

            case "toggle":
                value = (response.formValues[formIndex++] as boolean) ? "true" : "false";
                break;
        }

        // Append argument in the format "--arg value" or as a simple value if no argument is specified
        field.arg ? args.push(`${field.arg} ${value}`) : args.push(`${value}`);
    });

    return args;
}
