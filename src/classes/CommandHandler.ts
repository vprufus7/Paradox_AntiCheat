import { Player, ChatSendBeforeEvent, system, world } from "@minecraft/server";
import { MinecraftEnvironment } from "./container/Dependencies";
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

/**
 * Interface representing a command in the command handler system.
 */
export interface Command {
    name: string;
    description: string;
    usage: string;
    examples: string[];
    category: string;
    securityClearance: SecurityClearance;
    execute: (message: ChatSendBeforeEvent, args?: string[], minecraftEnvironment?: MinecraftEnvironment, cryptoES?: typeof CryptoES) => Promise<void | boolean> | void;
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
    private readonly rateLimitInterval: number = 1000; // 1 second
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
            player.sendMessage("\n§o§7Commands are being rate-limited. Please wait before sending another command.");
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
            player.sendMessage("\n§o§7Cannot update prefix while another update is in progress.");
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
        if (commandName === "help" || args[0]?.toLowerCase() === "help") {
            if (playerSecurityClearance && playerSecurityClearance >= SecurityClearance.Level1) {
                if (args.length === 0) {
                    this.displayAllCommands(player);
                    return false;
                } else {
                    const specifiedCommandName = commandName === "help" ? args[0] : commandName;
                    const commandInfo = this.getCommandInfo(specifiedCommandName);
                    player.sendMessage(commandInfo.join("\n") || "\n§o§7Command not found.");
                    return false;
                }
            } else {
                player.sendMessage("§o§7You do not have sufficient clearance to use the help command.");
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
                player.sendMessage("§o§7You do not have sufficient clearance to execute this command.");
            }
        } else {
            player.sendMessage(`\n§o§7Command "${commandName}" not found. Use ${defaultPrefix}help to see available commands.`);
        }
    }

    /**
     * Retrieves information about a specific command.
     * @param commandName - The name of the command.
     * @returns - An array of strings containing the command information.
     */
    private getCommandInfo(commandName: string): string[] {
        const command = this.commands.get(commandName);
        if (command) {
            return [
                `\n§4[§6Command§4]§f: §o${command.name}§r`,
                `§4[§6Usage§4]§f: §o${command.usage}§r`,
                `§4[§6Description§4]§f: §o${command.description}§r`,
                `§4[§6Examples§4]§f:\n${command.examples.map((example: string) => `    §o${example}`).join("\n")}`,
            ];
        } else {
            return [`\n§o§7Command "${commandName}" not found.`];
        }
    }

    /**
     * Displays all commands available to the player, sorted alphabetically.
     * @param player - The player requesting the list of commands.
     */
    private displayAllCommands(player: Player): void {
        let helpMessage = "\n§4[§6Available Commands§4]§r\n";
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number;

        this.commandsByCategory.forEach((commands, category) => {
            const filteredCommands = commands.filter((command) => command.securityClearance <= playerSecurityClearance);
            if (filteredCommands.length > 0) {
                helpMessage += `\n§4[§6${category}§4]§r\n`;
                filteredCommands
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .forEach((command) => {
                        helpMessage += this.getCommandDescription(command);
                    });
            }
        });

        player.sendMessage(helpMessage || "\n§o§7No commands registered.");
    }

    /**
     * Returns the description of a command.
     * @param command - The command to describe.
     * @returns - A string describing the command.
     */
    private getCommandDescription(command: Command): string {
        return `§6${command.name}§7: §o§f${command.description}§r\n`;
    }

    /**
     * Checks if a command can be executed based on rate limiting.
     * @returns - A boolean indicating whether a command can be executed.
     */
    private canExecuteCommand(): boolean {
        const now = Date.now();
        if (now - this.lastCommandTimestamp >= this.rateLimitInterval) {
            this.commandCount = 0;
            this.lastCommandTimestamp = now;
        }
        return this.commandCount++ < this.maxCommandsPerInterval;
    }
}
