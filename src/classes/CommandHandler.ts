import { Player, ChatSendBeforeEvent, system, world } from "@minecraft/server";
import CryptoES from "../node_modules/crypto-es/lib/index";
import { MinecraftEnvironment } from "./container/Dependencies";

/**
 * Enum representing different security clearance levels.
 * @enum {number}
 */
enum SecurityClearance {
    /**
     * Clearance level 1 - Lowest clearance.
     */
    Level1 = 1,
    /**
     * Clearance level 2.
     */
    Level2 = 2,
    /**
     * Clearance level 3.
     */
    Level3 = 3,
    /**
     * Clearance level 4 - Highest clearance.
     */
    Level4 = 4,
}

/**
 * Interface representing encrypted command data.
 * @interface
 */
interface EncryptedCommandData {
    /**
     * Initialization Vector (IV) used for encryption.
     * @type {string}
     */
    iv: string;
    /**
     * Encrypted command data.
     * @type {string}
     */
    encryptedData: string;
}

/**
 * Interface representing a command structure.
 * @interface
 */
export interface Command {
    /**
     * The name of the command.
     * @type {string}
     */
    name: string;
    /**
     * Description of the command.
     * @type {string}
     */
    description: string;
    /**
     * Usage syntax of the command.
     * @type {string}
     */
    usage: string;
    /**
     * Examples demonstrating usage of the command.
     * @type {string[]}
     */
    examples: string[];
    /**
     * Category under which the command falls.
     * @type {string}
     */
    category: string;
    /**
     * Security clearance level required to execute the command.
     * @type {SecurityClearance}
     */
    securityClearance: SecurityClearance;
    /**
     * Executes the command.
     * @param {ChatSendBeforeEvent} message - The message event triggering the command.
     * @param {string[]} [args] - The arguments passed with the command.
     * @param {MinecraftEnvironment} [minecraftEnvironment] - The Minecraft environment instance.
     * @param {typeof CryptoES} [cryptoES] - The CryptoES library instance for encryption/decryption.
     * @returns {Promise<void | boolean> | void} A promise that resolves once the command execution is complete, or a boolean value indicating whether the command execution requires a prefix update.
     */
    execute: (message: ChatSendBeforeEvent, args?: string[], minecraftEnvironment?: MinecraftEnvironment, cryptoES?: typeof CryptoES) => Promise<void | boolean> | void;
}

/**
 * Class to handle commands.
 */
export class CommandHandler {
    private commandsByCategory: Map<string, Command[]> = new Map(); // Map to store commands grouped by category
    private commands: Map<string, EncryptedCommandData> = new Map(); // Map to store encrypted command data
    private prefix: string; // Prefix for commands
    private prefixLock: boolean = false; // Lock to control prefix update
    private prefixUpdateLock: boolean = false; // Lock to control prefix update
    private readonly rateLimitInterval: number = 1000; // Interval for rate limiting commands
    private readonly maxCommandsPerInterval: number = 5; // Maximum commands allowed per interval
    private commandCount: number = 0; // Counter for commands executed
    private lastCommandTimestamp: number = 0; // Timestamp of the last command executed
    private cachedCommands: string | undefined = undefined; // Cached decrypted commands

    /**
     * Constructor for the CommandHandler class.
     * @param {string} securityKey - The security key used for encryption.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment.
     */
    constructor(
        private securityKey: string,
        private minecraftEnvironment: MinecraftEnvironment
    ) {
        // Initialize prefix with default or dynamic prefix from Minecraft environment
        this.prefix = (this.minecraftEnvironment.getWorld().getDynamicProperty("__prefix") as string) || "!";
    }

    /**
     * Registers the provided commands.
     * @param {Command[]} commands - An array of Command objects to register.
     */
    registerCommand(commands: Command[]) {
        commands.forEach((command) => {
            // Replace placeholders in command usage and examples with actual prefix
            command.usage = command.usage.replace("{prefix}", this.prefix);
            command.examples = command.examples.map((example) => example.replace("{prefix}", this.prefix));

            // Add command to its respective category
            const category = command.category.charAt(0).toUpperCase() + command.category.slice(1).toLowerCase();
            const categoryCommands = this.commandsByCategory.get(category) || [];
            categoryCommands.push(command);
            this.commandsByCategory.set(category, categoryCommands);

            // Serialize command execute function and encrypt command data
            const serializedExecute = command.execute.toString();
            const encryptedData = this.encrypt(JSON.stringify({ ...command, execute: serializedExecute }), command.name);
            this.commands.set(encryptedData.iv, encryptedData); // Store encrypted command data
        });
    }

    /**
     * Handles an incoming command.
     * @param {ChatSendBeforeEvent} message - The chat message event.
     * @param {Player} player - The player who sent the message.
     */
    handleCommand(message: ChatSendBeforeEvent, player: Player) {
        // Get default prefix from Minecraft environment
        const defaultPrefix = (world.getDynamicProperty("__prefix") as string) || "!";

        // Check if message starts with default prefix
        if (!message.message.startsWith(defaultPrefix)) {
            message.cancel = false;
            return;
        }

        // Check rate limiting for commands
        if (!this.canExecuteCommand()) {
            player.sendMessage("\n§o§7Commands are being rate-limited. Please wait before sending another command.");
            return;
        }

        // Acquire lock for command execution
        this.acquireCommandExecutionLock();

        let verifyPrefixUpdate: boolean = false;

        try {
            const args = message.message.slice(defaultPrefix.length).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase();

            if (commandName) {
                // Retrieve the cached commands from the player's dynamic properties
                const cachedCommands = player.getDynamicProperty("cachedCommands");

                if (!cachedCommands || !this.cachedCommands) {
                    // Cache the commands for the player if needed
                    this.cacheCommands(player);
                } else {
                    // Decrypt the cached commands
                    const decryptedCommands = this.decryptMap(cachedCommands as string, this.securityKey);
                    // Extract the stored security clearance from the decrypted commands
                    const cachedClearance = parseInt(decryptedCommands.get("clearance"));
                    // Retrieve the player's security clearance
                    const playerSecurityClearance = player.getDynamicProperty("securityClearance");
                    if (cachedClearance !== playerSecurityClearance) {
                        // The cached commands do not match the player's current clearance, so we need to update the cache
                        this.cacheCommands(player);
                    }
                }
                const result = this.executeCommand(message, player, commandName, args, defaultPrefix);
                if (result === true) {
                    verifyPrefixUpdate = true;
                }
            }
        } finally {
            // Release command execution lock
            if (verifyPrefixUpdate) {
                this.updatePrefix(player);
            }
            this.releaseCommandExecutionLock();
        }
    }

    /**
     * Updates the command prefix.
     * @param {Player} player - The player requesting the prefix update.
     */
    updatePrefix(player: Player) {
        // Check if prefix update lock is active
        if (this.prefixUpdateLock) {
            player.sendMessage("\n§o§7Cannot update prefix while another update is in progress.");
            return;
        }

        this.prefixUpdateLock = true; // Set prefix update lock

        // Run system task asynchronously to update prefix
        system.run(async () => {
            // Get new prefix
            const newPrefix = world.getDynamicProperty("__prefix") as string;
            try {
                // Encrypt updated command data in batches
                const updatedCommands: [string, EncryptedCommandData][] = [];
                for (const [_, encryptedCommand] of this.commands.entries()) {
                    const decryptedCommand = this.decrypt(encryptedCommand);
                    const commandObject = JSON.parse(decryptedCommand) as Command;
                    commandObject.usage = commandObject.usage.replace(this.prefix + commandObject.name, newPrefix + commandObject.name);
                    commandObject.examples = commandObject.examples.map((example: string) => example.replace(this.prefix + commandObject.name, newPrefix + commandObject.name));

                    // Encrypt updated command data
                    const updatedEncryptedData = this.encrypt(JSON.stringify(commandObject), commandObject.name);
                    updatedCommands.push([updatedEncryptedData.iv, updatedEncryptedData]);
                }

                // Update commands in batch
                for (const [iv, updatedEncryptedData] of updatedCommands) {
                    this.commands.set(iv, updatedEncryptedData);
                }
                this.prefix = newPrefix; // Update prefix
            } finally {
                this.prefixUpdateLock = false; // Release prefix update lock
            }
        });
    }

    /**
     * Caches decrypted commands for a specific player.
     * @param {Player} player - The player for whom to cache the commands.
     * @private
     */
    private cacheCommands(player: Player): void {
        // Construct the help message
        let helpMessage = "\n§4[§6Available Commands§4]§r\n";

        // Retrieve the player's security clearance level
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number;

        // Iterate through commands by category and filter based on player's clearance
        this.commandsByCategory.forEach((commands, category) => {
            const filteredCommands = commands.filter((command) => command.securityClearance <= playerSecurityClearance);
            if (filteredCommands.length > 0) {
                // Append category title
                helpMessage += `\n§4[§6${category}§4]§r\n`;
                // Append command descriptions
                filteredCommands.forEach((command) => {
                    helpMessage += this.getCommandDescription(command);
                });
            }
        });

        // Encrypt and store the cached commands along with the player's clearance level
        const encryptedCache = this.encryptMap(
            new Map([
                ["commands", helpMessage], // Encrypted commands
                ["clearance", playerSecurityClearance.toString()], // Player's security clearance level
            ]),
            this.securityKey
        );
        player.setDynamicProperty("cachedCommands", encryptedCache);
    }

    /**
     * Method to get description of a command.
     * @param {Command} command - The command object.
     * @returns {string} The description of the command.
     * @private
     */
    private getCommandDescription(command: Command): string {
        return `§6${command.name}§7: §o§f${command.description}§r\n`;
    }

    /**
     * Displays available commands based on the player's security clearance.
     * @param {Player} player - The player to whom the commands will be sent.
     * @private
     */
    private displayAllCommands(player: Player): void {
        // Retrieve cached commands from player's dynamic properties
        const cachedCommands = player.getDynamicProperty("cachedCommands") as string;

        if (cachedCommands) {
            // Decrypt cached commands and retrieve the command list
            const decryptedCommands = this.decryptMap(cachedCommands, this.securityKey).get("commands") || "";

            // Send the decrypted commands to the player
            player.sendMessage(decryptedCommands);
        } else {
            // If no commands are cached, inform the player
            player.sendMessage("\n§o§7No commands registered.");
        }
    }

    /**
     * Method to encrypt the entire map as a single unit.
     * @param {Map<string, string>} mapToEncrypt - The map to encrypt.
     * @param {string} encryptionKey - The encryption key.
     * @returns {string} The encrypted data.
     * @private
     */
    private encryptMap(mapToEncrypt: Map<string, string>, encryptionKey: string): string {
        // Convert the map to a JSON string
        const jsonString = JSON.stringify(Array.from(mapToEncrypt.entries()));

        // Encrypt the JSON string
        const encryptedData = CryptoES.AES.encrypt(jsonString, encryptionKey).toString();

        return encryptedData;
    }

    /**
     * Method to decrypt the entire map as a single unit.
     * @param {string} encryptedData - The encrypted data to decrypt.
     * @param {string} decryptionKey - The decryption key.
     * @returns {Map<string, string>} The decrypted map.
     * @private
     */
    private decryptMap(encryptedData: string, decryptionKey: string): Map<string, string> {
        // Decrypt the encrypted data
        const decryptedJsonString = CryptoES.AES.decrypt(encryptedData, decryptionKey).toString(CryptoES.enc.Utf8);

        // Parse the decrypted JSON string into a map
        const parsedMap: [string, string][] = JSON.parse(decryptedJsonString);

        // Reconstruct the map from the parsed array
        const decryptedMap = new Map<string, string>(parsedMap);

        return decryptedMap;
    }

    /**
     * Method to get information about a specific command.
     * @param {string} commandName - The name of the command.
     * @returns {string[]} Information about the command.
     * @private
     */
    private getCommandInfo(commandName: string): string[] {
        const iv = this.generateIV(commandName);
        const encryptedCommand = this.commands.get(iv.toString(CryptoES.enc.Base64));
        if (encryptedCommand) {
            const decryptedCommand = this.decrypt(encryptedCommand);
            const { name, description, usage, examples } = JSON.parse(decryptedCommand);
            return [`\n§4[§6Command§4]§f: §o${name}§r\n`, `§4[§6Usage§4]§f: §o${usage}§r\n`, `§4[§6Description§4]§f: §o${description}§r\n`, `§4[§6Examples§4]§f:\n${examples.map((example: string) => `    §o${example}`).join("\n")}`];
        } else {
            return [`\n§o§7Command "${commandName}" not found.`];
        }
    }

    /**
     * Method to encrypt data.
     * @param {string} data - The data to encrypt.
     * @param {string} commandName - The name of the command.
     * @returns {EncryptedCommandData} The encrypted data.
     * @private
     */
    private encrypt(data: string, commandName: string): EncryptedCommandData {
        const iv = this.generateIV(commandName);
        const encryptedData = CryptoES.AES.encrypt(data, this.securityKey, { iv }).toString();
        return { iv: iv.toString(CryptoES.enc.Base64), encryptedData };
    }

    /**
     * Method to decrypt data.
     * @param {EncryptedCommandData} encryptedData - The encrypted data to decrypt.
     * @returns {string} The decrypted data.
     * @private
     */
    private decrypt(encryptedData: EncryptedCommandData): string {
        const iv = CryptoES.enc.Base64.parse(encryptedData.iv);
        const decryptedData = CryptoES.AES.decrypt(encryptedData.encryptedData, this.securityKey, { iv });
        return decryptedData.toString(CryptoES.enc.Utf8);
    }

    /**
     * Method to generate IV for encryption.
     * @param {string} commandName - The name of the command.
     * @returns {CryptoES.lib.WordArray} The generated IV.
     * @private
     */
    private generateIV(commandName: string): CryptoES.lib.WordArray {
        const uniqueIdentifier = this.securityKey + commandName;
        const iv = CryptoES.SHA256(uniqueIdentifier);
        const truncatedIV = iv.words.slice(0, 4);
        return CryptoES.lib.WordArray.create(truncatedIV);
    }

    /**
     * Method to acquire lock for command execution.
     * @private
     */
    private async acquireCommandExecutionLock() {
        while (this.prefixLock || this.prefixUpdateLock) {
            await new Promise<void>((resolve) => system.runTimeout(() => resolve(), 100));
        }
        this.prefixLock = true;
    }

    /**
     * Method to release lock for command execution.
     * @private
     */
    private releaseCommandExecutionLock() {
        this.prefixLock = false;
    }

    /**
     * Method to execute a command.
     * @param {ChatSendBeforeEvent} message - The message event.
     * @param {Player} player - The player executing the command.
     * @param {string} commandName - The name of the command.
     * @param {string[]} args - The command arguments.
     * @param {string} defaultPrefix - The default prefix for commands.
     * @returns {void | boolean} Indicates whether the command execution succeeded.
     * @private
     */
    private executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): void | boolean {
        const playerSecurityClearance = player.getDynamicProperty("securityClearance") as number as SecurityClearance;
        if (commandName === "help" || args[0]?.toLowerCase() === "help") {
            // Check if the player has clearance for the help command
            if (playerSecurityClearance && playerSecurityClearance >= SecurityClearance.Level1) {
                if (args.length === 0) {
                    this.displayAllCommands(player);
                    return false;
                } else {
                    const specifiedCommandName = commandName === "help" ? args[0] : commandName;
                    const commandInfo = this.getCommandInfo(specifiedCommandName);
                    player.sendMessage(commandInfo || "\n§o§7Command not found.");
                    return false;
                }
            } else {
                // Player does not have sufficient clearance
                player.sendMessage("§o§7You do not have sufficient clearance to use the help command.");
                return false;
            }
        }

        // Get command information
        const iv = this.generateIV(commandName);
        const encryptedCommand = this.commands.get(iv.toString(CryptoES.enc.Base64));
        if (encryptedCommand) {
            try {
                const decryptedCommandString = this.decrypt(encryptedCommand);
                const decryptedCommand = JSON.parse(decryptedCommandString);
                const command: Command = { ...decryptedCommand, execute: new Function(`return ${decryptedCommand.execute}`)() };

                // Check security clearance
                if ((playerSecurityClearance && playerSecurityClearance >= command.securityClearance) || commandName === "op") {
                    // Execute command
                    const validateReturn = command.execute(message, args, this.minecraftEnvironment, CryptoES);
                    if (commandName === "prefix" && validateReturn) {
                        return true;
                    }
                } else {
                    // Player does not have sufficient clearance
                    player.sendMessage("§o§7You do not have sufficient clearance to execute this command.");
                }
            } catch (error) {
                console.error("Error occurred during command execution:", error);
            }
        } else {
            player.sendMessage(`\n§o§7Command "${commandName}" not found. Use ${defaultPrefix}help to see available commands.`);
        }
    }

    /**
     * Method to check if command can be executed based on rate limiting.
     * @returns {boolean} Indicates whether the command can be executed.
     * @private
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
