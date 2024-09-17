import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";

/**
 * Builds a command-specific menu for the player to interact with.
 * @param {Command} command - The command object containing parameters and execution logic.
 * @param {Player} player - The player who will be interacting with the menu.
 * @param {MinecraftEnvironment} minecraftEnvironment - The environment object to initialize the modal form.
 */
export function buildCommandMenu(command: Command, player: Player, minecraftEnvironment: MinecraftEnvironment) {
    /**
     * Capitalizes the first letter of each word in a given string.
     * @param {string} text - The text to capitalize.
     * @returns {string} - The capitalized text.
     */
    function capitalizeEachWord(text: string): string {
        return text
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    const moduleKey = "paradoxModules";
    const getParadoxModules = world.getDynamicProperty(moduleKey) as string;
    let paradoxModules: { [key: string]: any } = getParadoxModules ? JSON.parse(getParadoxModules) : {};

    // Ensure paradoxModules is initialized
    if (typeof paradoxModules !== "object" || paradoxModules === null) {
        paradoxModules = {};
        world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
    }

    // Retrieve dynamic settings if defined
    let dynamicProperties: boolean = false;
    if (command.dynamicProperty) {
        const setting = paradoxModules[command.dynamicProperty];
        if (typeof setting === "boolean" && setting !== null) {
            dynamicProperties = setting;
        }
    }

    let hasInput = false;
    let form;

    // Determine if we need to use ModalFormData or ActionFormData
    if (command.parameters.some((param) => param.type !== "button")) {
        form = minecraftEnvironment.initializeModalFormData();
        form.title(`Enter Details For ${capitalizeEachWord(command.name)}`);
    } else {
        form = minecraftEnvironment.initializeActionFormData();
        form.title(`Action For ${capitalizeEachWord(command.name)}`);
    }

    // Loop through each parameter and add appropriate UI elements
    command.parameters.forEach((parameter: Command["parameters"][number]) => {
        const paramDescription = capitalizeEachWord(parameter.description); // Capitalize parameter description

        switch (parameter.type) {
            case "dropdown":
                const onlinePlayers = getOnlinePlayers();
                (form as ModalFormData).dropdown(paramDescription, onlinePlayers, -1);
                (form as ModalFormData).textField("Or Enter Player Name", "");
                break;
            case "entity_dropdown":
                const onlineEntities = getOnlineEntities(player);
                (form as ModalFormData).dropdown(paramDescription, onlineEntities, -1);
                (form as ModalFormData).textField("Or Enter Entity Name", "");
                break;
            case "input":
                (form as ModalFormData).textField(paramDescription, "");
                hasInput = true;
                break;
            case "slider":
                (form as ModalFormData).slider(paramDescription, parameter.min || 0, parameter.max || 100, 1, parameter.default || 0);
                break;
            case "toggle":
                (form as ModalFormData).toggle(paramDescription, false);
                break;
            case "button":
                const buttonText = !dynamicProperties ? "Enable" : hasInput ? "Update | Disable" : "Disable";
                (form as ActionFormData).button(buttonText);
                break;
            default:
                console.error(`Unknown parameter type: ${parameter.type}`);
        }
    });

    form.show(player)
        .then((response) => {
            if (!response.canceled) {
                const args = parseCommandArgs(command, response, player);
                const chatSendBeforeEvent: ChatSendBeforeEvent = {
                    cancel: false,
                    message: `${args || undefined}`,
                    sender: player,
                };

                command.execute(chatSendBeforeEvent, args, minecraftEnvironment);
            }
        })
        .catch((error) => {
            console.error("Error showing detail menu:", error);
        });
}

/**
 * Parses the user's response from the modal form into command arguments.
 * @param {Command} command - The command object containing the parameters to be parsed.
 * @param {ModalFormResponse} response - The response from the modal form containing user input.
 * @param {Player} player - The player who interacted with the modal form.
 * @returns {string[]} - An array of arguments parsed from the user input.
 */
function parseCommandArgs(command: Command, response: ModalFormResponse, player: Player): string[] {
    const args: string[] = [];
    const { formValues = [] } = response;
    let formIndex = 0; // Track the index of formValues as we parse through the parameters

    // Parse additional parameters based on user input
    command.parameters?.forEach((param: Command["parameters"][number]) => {
        switch (param.type) {
            case "dropdown": {
                const selectedIndex = formValues[formIndex++] as number;
                const enteredPlayerName = formValues[formIndex++] as string;
                const selectedPlayer = world.getAllPlayers()[selectedIndex]?.name;
                args.push(selectedPlayer || enteredPlayerName);
                break;
            }
            case "entity_dropdown": {
                const selectedIndex = formValues[formIndex++] as number;
                const enteredEntityName = formValues[formIndex++] as string;
                const selectedEntity = player.dimension.getEntities()[selectedIndex]?.typeId.replace("minecraft:", "");
                args.push(selectedEntity || enteredEntityName);
                break;
            }
            case "toggle": {
                const toggleValue = formValues[formIndex++] as boolean;
                if (toggleValue) {
                    args.push(`${param.alias}`);
                }
                break;
            }
            case "slider": {
                const sliderValue = formValues[formIndex++] as number;
                args.push(`${param.alias}=${sliderValue}`);
                break;
            }
            case "input": {
                const inputValue = formValues[formIndex++] as string;
                if (inputValue) {
                    args.push(inputValue);
                }
                break;
            }
            case "button": {
                // Do nothing here. Buttons are handled with no args.
                break;
            }
            default:
                console.error(`Unknown parameter type: ${param.type}`);
        }
    });

    return args;
}

/**
 * Retrieves a list of online players' names.
 * @returns {string[]} - An array of player names currently online.
 */
function getOnlinePlayers(): string[] {
    return Array.from(world.getAllPlayers(), (player) => player.name);
}

/**
 * Retrieves a list of online entities' type IDs, excluding players.
 * @param {Player} player - The player requesting the list of entities.
 * @returns {string[]} - An array of entity type IDs currently online, excluding players.
 */
function getOnlineEntities(player: Player): string[] {
    return Array.from(player.dimension.getEntities({ excludeTypes: ["player"] }), (entity) => entity.typeId.replace("minecraft:", ""));
}
