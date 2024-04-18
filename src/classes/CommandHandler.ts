import { Player, ChatSendBeforeEvent, world, system } from "@minecraft/server";
import CryptoES from "../node_modules/crypto-es/lib/index";
import { MinecraftEnvironment } from "./container/Dependencies";

// Interface for encrypted command data
interface EncryptedCommandData {
    iv: string;
    encryptedData: string;
}

// Interface for command structure
export interface Command {
    name: string;
    description: string;
    usage: string;
    examples: string[];
    category: string;
    execute: (message: ChatSendBeforeEvent, args?: string[], minecraftEnvironment?: MinecraftEnvironment, cryptoES?: typeof CryptoES) => Promise<void | boolean> | void;
}

// Class to handle commands
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

    // Constructor
    constructor(
        private securityKey: string,
        private minecraftEnvironment: MinecraftEnvironment
    ) {
        // Initialize prefix with default or dynamic prefix from Minecraft environment
        this.prefix = (this.minecraftEnvironment.getWorld().getDynamicProperty("__prefix") as string) || "!";
    }

    // Method to register commands
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

        // Cache the decrypted commands
        this.cacheCommands();
    }

    // Method to handle incoming commands
    handleCommand(message: ChatSendBeforeEvent, player: Player) {
        // Get default prefix from Minecraft environment
        const defaultPrefix = (world.getDynamicProperty("__prefix") as string) || "!";

        // Check if message starts with default prefix
        if (!message.message.startsWith(defaultPrefix)) {
            message.cancel = false;
            return;
        }

        // Check if the command is an op command
        const isOpCommand = message.message.slice(defaultPrefix.length).trim().split(/ +/)[0].toLowerCase() === "op";

        // Check permissions for non-op commands
        if (!isOpCommand) {
            const playerPerms = message.sender.getDynamicProperty(`__${message.sender.id}`);
            const worldPerms = this.minecraftEnvironment.getWorld().getDynamicProperty(`__${message.sender.id}`);
            if (!worldPerms || worldPerms !== playerPerms) {
                player.sendMessage("§o§7You do not have permissions.");
                return;
            }
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

    // Method to update command prefix
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

    // Method to cache decrypted commands
    private cacheCommands() {
        let helpMessage = "\n§4[§6Available Commands§4]§r\n";
        this.commandsByCategory.forEach((commands, category) => {
            helpMessage += `\n§4[§6${category}§4]§r\n`; // Print category title
            commands.forEach((command) => {
                helpMessage += this.getCommandDescription(command); // Print command description
            });
        });
        // Cache decrypted commands
        const encryptedCache = this.encryptMap(new Map([["commands", helpMessage]]), this.securityKey);
        this.cachedCommands = encryptedCache;

        // Wipe the commandsByCategory map
        this.commandsByCategory.clear();
    }

    // Method to get description of a command
    private getCommandDescription(command: Command): string {
        return `§6${command.name}§7: §o§f${command.description}§r\n`;
    }

    // Method to display all available commands
    private displayAllCommands(player: Player) {
        if (this.cachedCommands) {
            player.sendMessage(this.decryptMap(this.cachedCommands, this.securityKey).get("commands") || ""); // Send cached commands if available
        } else {
            player.sendMessage("\n§o§7No commands registered.");
        }
    }

    // Method to encrypt the entire map as a single unit
    private encryptMap(mapToEncrypt: Map<string, string>, encryptionKey: string): string {
        // Convert the map to a JSON string
        const jsonString = JSON.stringify(Array.from(mapToEncrypt.entries()));

        // Encrypt the JSON string
        const encryptedData = CryptoES.AES.encrypt(jsonString, encryptionKey).toString();

        return encryptedData;
    }

    // Method to decrypt the entire map as a single unit
    private decryptMap(encryptedData: string, decryptionKey: string): Map<string, string> {
        // Decrypt the encrypted data
        const decryptedJsonString = CryptoES.AES.decrypt(encryptedData, decryptionKey).toString(CryptoES.enc.Utf8);

        // Parse the decrypted JSON string into a map
        const parsedMap: [string, string][] = JSON.parse(decryptedJsonString);

        // Reconstruct the map from the parsed array
        const decryptedMap = new Map<string, string>(parsedMap);

        return decryptedMap;
    }

    // Method to get information about a specific command
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

    // Method to encrypt data
    private encrypt(data: string, commandName: string): EncryptedCommandData {
        const iv = this.generateIV(commandName);
        const encryptedData = CryptoES.AES.encrypt(data, this.securityKey, { iv }).toString();
        return { iv: iv.toString(CryptoES.enc.Base64), encryptedData };
    }

    // Method to decrypt data
    private decrypt(encryptedData: EncryptedCommandData): string {
        const iv = CryptoES.enc.Base64.parse(encryptedData.iv);
        const decryptedData = CryptoES.AES.decrypt(encryptedData.encryptedData, this.securityKey, { iv });
        return decryptedData.toString(CryptoES.enc.Utf8);
    }

    // Method to generate IV for encryption
    private generateIV(commandName: string): CryptoES.lib.WordArray {
        const uniqueIdentifier = this.securityKey + commandName;
        const iv = CryptoES.SHA256(uniqueIdentifier);
        const truncatedIV = iv.words.slice(0, 4);
        return CryptoES.lib.WordArray.create(truncatedIV);
    }

    // Method to acquire lock for command execution
    private async acquireCommandExecutionLock() {
        while (this.prefixLock || this.prefixUpdateLock) {
            await new Promise<void>((resolve) => system.runTimeout(() => resolve(), 100));
        }
        this.prefixLock = true;
    }

    // Method to release lock for command execution
    private releaseCommandExecutionLock() {
        this.prefixLock = false;
    }

    // Method to execute a command
    private executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): void | boolean {
        if (commandName === "help" || args[0]?.toLowerCase() === "help") {
            if (args.length === 0) {
                this.displayAllCommands(player);
                return false;
            } else {
                const specifiedCommandName = commandName === "help" ? args[0] : commandName;
                const commandInfo = this.getCommandInfo(specifiedCommandName);
                player.sendMessage(commandInfo || "\n§o§7Command not found.");
                return false;
            }
        }

        const iv = this.generateIV(commandName);
        const encryptedCommand = this.commands.get(iv.toString(CryptoES.enc.Base64));
        if (encryptedCommand) {
            try {
                const decryptedCommandString = this.decrypt(encryptedCommand);
                const decryptedCommand = JSON.parse(decryptedCommandString);
                const executeFunction = new Function(`return ${decryptedCommand.execute}`)();
                const command: Command = { ...decryptedCommand, execute: executeFunction };
                const validateReturn = command.execute(message, args, this.minecraftEnvironment, CryptoES);
                if (commandName === "prefix" && validateReturn) {
                    return true;
                }
            } catch (error) {
                console.error("Error occurred during command execution:", error);
            }
        } else {
            player.sendMessage(`\n§o§7Command "${commandName}" not found. Use ${defaultPrefix}help to see available commands.`);
        }
    }

    // Method to check if command can be executed based on rate limiting
    private canExecuteCommand(): boolean {
        const now = Date.now();
        if (now - this.lastCommandTimestamp >= this.rateLimitInterval) {
            this.commandCount = 0;
            this.lastCommandTimestamp = now;
        }
        return this.commandCount++ < this.maxCommandsPerInterval;
    }
}
