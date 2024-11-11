import { Player, ChatSendBeforeEvent, system, world, PlayerSpawnAfterEvent } from "@minecraft/server";
import { MinecraftEnvironment } from "./container/dependencies";
import CryptoES from "../node_modules/crypto-es/lib/index";

/**
 * Enum representing different levels of security clearance for commands.
 */
enum SecurityClearance {
    Level1 = 1,
    Level2 = 2,
    Level3 = 3,
    Level4 = 4,
}

// Type representing the form type for GUI instructions
type FormType = "ActionFormData" | "ModalFormData" | "MessageFormData";

// Represents a button in an action form, used in ActionFormData GUI type
interface ActionFormButton {
    name: string; // The display name of the button
    command: string[]; // The command to execute when the button is pressed
    description?: string; // Optional description for additional context about the button
    requiredFields?: string[]; // Optional instructions to target specified dynamic fields
    crypto?: boolean; // Optional instructions to pass cryptoes to forms
}

// Represents an input field in a form, used in ModalFormData GUI type
interface DynamicField {
    name: string; // The display name or label of the field
    arg?: string; // The arg to pass back to the command
    type: "text" | "dropdown" | "toggle"; // Type of input: text field, dropdown selection, or toggle switch
    placeholder?: string; // Placeholder text for text fields
    options?: string[]; // Array of options for dropdown type fields
}

// Interface for the GUI instructions associated with a command
interface GuiInstructions {
    formType: FormType; // Type of form to generate, such as ActionFormData, ModalFormData, or MessageFormData
    title: string; // Title displayed at the top of the form
    description?: string; // Optional description or context displayed below the title
    commandOrder?: "command-arg" | "arg-command" | undefined; // Order for appending command and arg or neither
    actions?: ActionFormButton[]; // List of buttons for ActionFormData forms; each button can trigger a command
    dynamicFields?: DynamicField[]; // List of fields for ModalFormData forms; each field collects user input
}

// Interface representing a command in the command handler system
export interface Command {
    name: string;
    description: string;
    specialNote?: string; // Optional special note for the command
    usage: string;
    examples: string[];
    category: string;
    securityClearance: SecurityClearance;
    guiInstructions?: GuiInstructions;
    execute: (message: ChatSendBeforeEvent, args?: string[], minecraftEnvironment?: MinecraftEnvironment, cryptoES?: typeof CryptoES, returnMonitorFunction?: boolean) => Promise<void | boolean> | void | ((object: PlayerSpawnAfterEvent) => void);
}

/**
 * Class responsible for handling commands in the Minecraft environment.
 */
export class CommandHandler {
    private commandsByCategory: Map<string, Command[]> = new Map();
    private commands: Map<string, Command> = new Map();
    private prefix: string;
    private prefixLock: boolean = false;
    private prefixUpdateLock: boolean = false;
    private readonly rateLimitInterval: number = 20; // 20 ticks equals 1 second
    private readonly maxCommandsPerInterval: number = 5;
    private commandCount: number = 0;
    private lastCommandTimestamp: number = 0;

    /**
     * Constructs a CommandHandler.
     * @param minecraftEnvironment - The Minecraft environment context.
     */
    constructor(private minecraftEnvironment: MinecraftEnvironment) {
        this.prefix = (this.minecraftEnvironment.getWorld().getDynamicProperty("__prefix") as string) || "!";
    }

    /**
     * Registers an array of commands.
     * @param commands - The commands to register.
     */
    registerCommand(commands: Command[]) {
        commands.forEach((command) => {
            command.usage = command.usage.replaceAll("{prefix}", this.prefix);
            command.examples = command.examples.map((example) => example.replace("{prefix}", this.prefix));
            const category = command.category.charAt(0).toUpperCase() + command.category.slice(1).toLowerCase();
            const categoryCommands = this.commandsByCategory.get(category) || [];
            categoryCommands.push(command);
            this.commandsByCategory.set(category, categoryCommands);
            this.commands.set(command.name.toLowerCase(), command);
        });
    }

    /**
     * Retrieves all registered commands.
     * @returns - An array of all registered commands.
     */
    getRegisteredCommands(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Handles an incoming chat message to potentially execute a command.
     * @param message - The chat message event.
     * @param player - The player who sent the message.
     */
    handleCommand(message: ChatSendBeforeEvent, player: Player) {
        const defaultPrefix = (world.getDynamicProperty("__prefix") as string) || "!";
        if (!message.message.startsWith(defaultPrefix)) {
            // message.cancel = false;
            return false; // Indicate that a command was not handled
        }

        if (!this.canExecuteCommand()) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Commands are being rate-limited. Please wait before sending another command.");
            return true; // Indicate that a command was handled
        }

        this.acquireCommandExecutionLock();

        let verifyPrefixUpdate: boolean = false;

        try {
            const args = message.message.slice(defaultPrefix.length).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase();

            if (commandName) {
                const result = this.executeCommand(message, player, commandName, args, defaultPrefix);
                if (result === true) {
                    verifyPrefixUpdate = true;
                }
            }
        } finally {
            if (verifyPrefixUpdate) {
                this.updatePrefix(player);
            }
            this.releaseCommandExecutionLock();
        }

        return true; // Indicate that a command was handled
    }

    /**
     * Updates the prefix used for commands.
     * @param player - The player requesting the prefix update.
     */
    updatePrefix(player: Player) {
        if (this.prefixUpdateLock) {
            player.sendMessage("\n§2[§7Paradox§2]§o§7 Cannot update prefix while another update is in progress.");
            return;
        }

        this.prefixUpdateLock = true;
        system.run(async () => {
            const newPrefix = world.getDynamicProperty("__prefix") as string;
            try {
                for (const command of this.commands.values()) {
                    command.usage = command.usage.replaceAll(this.prefix + command.name, newPrefix + command.name);
                    command.examples = command.examples.map((example: string) => example.replace(this.prefix + command.name, newPrefix + command.name));
                }
                this.prefix = newPrefix;
            } finally {
                this.prefixUpdateLock = false;
            }
        });
    }

    /**
     * Acquires a lock to ensure that command execution is serialized.
     */
    private async acquireCommandExecutionLock() {
        while (this.prefixLock || this.prefixUpdateLock) {
            await new Promise<void>((resolve) => system.runTimeout(() => resolve(), 100));
        }
        this.prefixLock = true;
    }

    /**
     * Releases the command execution lock.
     */
    private releaseCommandExecutionLock() {
        this.prefixLock = false;
    }

    /**
     * Executes a command based on the message and player input.
     * @param message - The chat message event.
     * @param player - The player who sent the message.
     * @param commandName - The name of the command to execute.
     * @param args - The arguments provided with the command.
     * @param defaultPrefix - The default command prefix.
     * @returns - A boolean indicating whether the prefix needs updating.
     */
    private executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): void | boolean {
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number as SecurityClearance;
        const helpCommands = ["help", "--help", "-h"];

        if (helpCommands.includes(commandName) || helpCommands.includes(args[0]?.toLowerCase())) {
            if (playerSecurityClearance && playerSecurityClearance >= SecurityClearance.Level1) {
                if (args.length === 0 || helpCommands.includes(commandName)) {
                    this.displayAllCommands(player);
                    return false;
                } else {
                    const specifiedCommandName = helpCommands.includes(commandName) ? args[0] : commandName;
                    const commandInfo = this.getCommandInfo(specifiedCommandName, player);
                    player.sendMessage(commandInfo.join("\n") || "\n§2[§7Paradox§2]§o§7 Command not found.");
                    return false;
                }
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 You do not have sufficient clearance to use the help command.");
                return false;
            }
        }

        const command = this.commands.get(commandName);
        if (command) {
            if ((playerSecurityClearance && playerSecurityClearance >= command.securityClearance) || commandName === "op") {
                try {
                    const validateReturn = command.execute(message, args, this.minecraftEnvironment, CryptoES);
                    if (commandName === "prefix" && validateReturn) {
                        return true;
                    }
                } catch (error) {
                    console.error("Error occurred during command execution:", error);
                }
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 You do not have sufficient clearance to execute this command.");
            }
        } else {
            player.sendMessage(`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found. Use ${defaultPrefix}help to see available commands.`);
        }
    }

    /**
     * Retrieves information about a specific command with enhanced formatting.
     * @param commandName - The name of the command.
     * @returns - An array of strings containing the command information.
     */
    private getCommandInfo(commandName: string, player: Player): string[] {
        const command = this.commands.get(commandName);
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number;
        if (command) {
            let info = [
                `\n§2[§7Command§2]§f: §o${command.name}§r`,
                `§2[§7Usage§2]§f: §o${this.formatUsage(command.usage)}§r`,
                `§2[§7Description§2]§f: §o${command.description}§r`,
                `§2[§7Examples§2]§f:\n${command.examples.map((example: string) => `    §o${example}`).join("\n")}`,
            ];

            // Include the special note if it exists
            if (command.specialNote && playerSecurityClearance === 4) {
                info.push(`§2[§7Note§2]§f: §o${command.specialNote}§r`);
            }

            return info;
        } else {
            return [`\n§2[§7Paradox§2]§o§7 Command "${commandName}" not found.`];
        }
    }

    /**
     * Formats the usage string by adding color to specific characters.
     * @param usage - The original usage string.
     * @returns - The formatted usage string.
     */
    private formatUsage(usage: string): string {
        const formattedUsage = usage.replace(/\[|\]|\<|\>|\|/g, (match) => {
            switch (match) {
                case "[":
                case "]":
                case "<":
                case ">":
                    return `§2${match}§f`;
                case "|":
                    return `§2|§f`;
                default:
                    return match;
            }
        });
        return formattedUsage;
    }

    /**
     * Displays all commands available to the player, sorted alphabetically.
     * @param player - The player requesting the list of commands.
     */
    private displayAllCommands(player: Player): void {
        let helpMessage = "\n§2[§7Available Commands§2]§r\n";
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number;

        this.commandsByCategory.forEach((commands, category) => {
            const filteredCommands = commands.filter((command) => command.securityClearance <= playerSecurityClearance);
            if (filteredCommands.length > 0) {
                helpMessage += `\n§2[§7${category}§2]§r\n`;
                filteredCommands
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach((command) => {
                        helpMessage += this.getCommandDescription(command);
                    });
            }
        });

        player.sendMessage(helpMessage || "\n§2[§7Paradox§2]§o§7 No commands registered.");
    }

    /**
     * Returns the description of a command.
     * @param command - The command to describe.
     * @returns - A string describing the command.
     */
    private getCommandDescription(command: Command): string {
        return `§7${command.name}§2: §o§f${command.description}§r\n`;
    }

    /**
     * Checks if a command can be executed based on rate limiting.
     * @returns - A boolean indicating whether a command can be executed.
     */
    private canExecuteCommand(): boolean {
        const currentTick = system.currentTick;

        if (currentTick - this.lastCommandTimestamp >= this.rateLimitInterval) {
            this.commandCount = 0;
            this.lastCommandTimestamp = currentTick;
        }

        return this.commandCount++ < this.maxCommandsPerInterval;
    }
}
