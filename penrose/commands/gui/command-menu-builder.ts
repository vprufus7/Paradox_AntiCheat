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

    const { formType, title, description, actions, dynamicFields, commandOrder } = guiInstructions;

    if (formType === "ActionFormData") {
        const actionForm = minecraftEnvironment
            .initializeActionFormData()
            .title(title)
            .body(description || "");

        actions?.forEach((action) => {
            actionForm.button(action.name);
        });

        actionForm
            .show(player)
            .then((response) => {
                if (!response.canceled && response.selection !== undefined) {
                    const selectedAction = actions[response.selection];
                    const selectedRequiredFields = selectedAction.requiredFields || [];
                    const selectedCommand = selectedAction.command || []; // Command array

                    if (selectedRequiredFields.length === 0) {
                        const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                        command.execute(chatSendBeforeEvent, selectedCommand, minecraftEnvironment, selectedAction.crypto ? CryptoES : undefined);
                    } else {
                        const conditionalFields = dynamicFields.filter((field) => selectedRequiredFields.includes(field.name));
                        showModalForm(conditionalFields, title, player, command, minecraftEnvironment, selectedCommand, selectedAction.crypto, commandOrder, selectedRequiredFields);
                    }
                }
            })
            .catch((error) => console.error("Error showing action form:", error));
    } else if (formType === "ModalFormData") {
        showModalForm(dynamicFields || [], title, player, command, minecraftEnvironment, [], false, commandOrder, []);
    }
}

/**
 * Displays a ModalFormData form based on `dynamicFields`.
 * @param {DynamicField[]} dynamicFields - Array of dynamic fields for the modal form.
 * @param {string} title - The title of the form.
 * @param {Player} player - The player who will interact with the form.
 * @param {Command} command - The command object to execute upon form submission.
 * @param {MinecraftEnvironment} minecraftEnvironment - The environment object to initialize the form.
 * @param {string[]} commandArray - Array of commands for the selected action.
 * @param {boolean} cryptoES - Whether to use crypto for this command.
 * @param {string} commandOrder - The order to use ("command-arg", "arg-command", or undefined).
 * @param {string[]} requiredFields - Array of field names required for the command.
 */
function showModalForm(dynamicFields: DynamicField[], title: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]) {
    const modalForm = minecraftEnvironment.initializeModalFormData().title(`${title}`);

    for (const field of dynamicFields) {
        if (field.type === "text") {
            modalForm.textField(field.placeholder || "", field.name);
        } else if (field.type === "dropdown") {
            const allPlayers = world.getAllPlayers().map((player) => player.name);
            field.options = allPlayers;
            modalForm.dropdown(field.placeholder, field.options, -1);
        } else if (field.type === "toggle") {
            modalForm.toggle(field.name, false);
        }
    }

    modalForm
        .show(player)
        .then((response) => {
            if (!response.canceled) {
                const args = parseFormResponse(response, dynamicFields, commandArray, requiredFields);
                const commandString = buildCommandString(commandOrder, commandArray, args);
                const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                command.execute(chatSendBeforeEvent, commandString, minecraftEnvironment, cryptoES ? CryptoES : undefined);
            }
        })
        .catch((error) => console.error("Error showing modal form:", error));
}

/**
 * Builds the command string based on the specified command order.
 * @param {string | undefined} commandOrder - The order to use ("command-arg", "arg-command", or undefined).
 * @param {string[]} selectedAction - Array of command parts.
 * @param {string[]} args - Array of command arguments.
 * @returns {string[]} - The formatted command array.
 */
function buildCommandString(commandOrder: string | undefined, selectedAction: string[] = [], args: string[] = []): string[] {
    function splitArgs(args: string[]): string[] {
        const splitArgs: string[] = [];
        args.forEach((arg) => {
            const parts = arg.split(" ");
            splitArgs.push(...parts);
        });
        return splitArgs;
    }

    const splitArgsList = splitArgs(args);

    if (commandOrder === "command-arg") {
        return [...selectedAction, ...splitArgsList];
    } else if (commandOrder === "arg-command") {
        return [...splitArgsList, ...selectedAction];
    } else {
        return [...selectedAction, ...splitArgsList];
    }
}

/**
 * Parses user response into command arguments based on `DynamicField` definitions.
 * @param {ModalFormResponse} response - The form response with user input.
 * @param {DynamicField[]} fields - The fields that define how to interpret the response.
 * @param {string[]} commandArray - Array of command strings to sync with requiredFields.
 * @param {string[]} requiredFields - Array of required field names for the command.
 * @returns {string[]} - An array of arguments parsed from the form response, formatted as ["--arg value"].
 */
function parseFormResponse(response: ModalFormResponse, fields: DynamicField[], commandArray: string[], requiredFields: string[] = []): string[] {
    const args: string[] = [];
    let formIndex = 0;

    requiredFields.forEach((field, index) => {
        const dynamicField = fields.find((f) => f.name === field);
        let value = "";

        if (dynamicField) {
            switch (dynamicField.type) {
                case "text":
                    value = response.formValues[formIndex++] as string;
                    break;

                case "dropdown":
                    const selectedIndex = response.formValues[formIndex++] as number;
                    value = dynamicField.options[selectedIndex];
                    break;

                case "toggle":
                    value = (response.formValues[formIndex++] as boolean) ? "true" : "false";
                    break;
            }

            // Append argument in the format "--arg value" using the command array
            const arg = commandArray[index] || "";
            args.push(`${arg} ${value}`);
        }
    });

    return args;
}
