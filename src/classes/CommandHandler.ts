import { Player, ChatSendBeforeEvent, world, system } from "@minecraft/server";
import CryptoES from "../node_modules/crypto-es/lib/index";
import { MinecraftEnvironment } from "./container/Dependencies";

// Define the structure for encrypted command data
interface EncryptedCommandData {
    iv: string; // Initialization vector used for encryption
    encryptedData: string; // Encrypted command data
}

// Define the structure for a command
export interface Command {
    name: string; // Name of the command
    description: string; // Description of the command
    usage: string; // Usage instructions for the command
    examples: string[]; // Examples of how to use the command
    execute: (message: ChatSendBeforeEvent, args?: string[], minecraftEnvironment?: MinecraftEnvironment) => void | boolean; // Function to execute the command
}

export class CommandHandler {
    private commands: Map<string, EncryptedCommandData>; // Store encrypted command data
    private minecraftEnvironment: MinecraftEnvironment; // Add minecraftEnvironment property
    private prefix: string; // Store the prefix
    private prefixLock: boolean; // Flag to indicate if prefix update is in progress

    // Define rate-limiting parameters
    private readonly rateLimitInterval: number = 1000; // Interval in milliseconds
    private readonly maxCommandsPerInterval: number = 5; // Maximum number of commands allowed per interval
    private commandCount: number = 0;
    private lastCommandTimestamp: number = 0;

    constructor(
        private securityKey: string,
        minecraftEnvironment: MinecraftEnvironment
    ) {
        this.commands = new Map(); // Initialize the commands map
        this.minecraftEnvironment = minecraftEnvironment; // Initialize minecraftEnvironment
        // Retrieve the prefix from the environment
        this.prefix = (this.minecraftEnvironment.getWorld().getDynamicProperty("__prefix") as string) || "!"; // Default prefix is '!' if none is set
        this.prefixLock = false; // Initialize prefixLock flag
    }

    // Method to register a new command
    registerCommand(commands: Command[]) {
        // Ensure that the prefixLock is false before registering commands
        if (this.prefixLock) {
            throw new Error("Cannot register commands while prefix update is in progress.");
        }

        commands.forEach((command) => {
            // Replace the placeholder {prefix} with the actual prefix in usage and examples
            command.usage = command.usage.replace("{prefix}", this.prefix);
            command.examples = command.examples.map((example) => example.replace("{prefix}", this.prefix));

            // Serialize the execute function to a string
            const serializedExecute = command.execute.toString();

            // Encrypt command data before storing
            const encryptedData = this.encrypt(JSON.stringify({ ...command, execute: serializedExecute }), command.name);

            // Generate iv for this command and use it as the key
            this.commands.set(encryptedData.iv, encryptedData);
        });
    }

    // Method to handle incoming commands
    handleCommand(message: ChatSendBeforeEvent, player: Player) {
        // Check if the message starts with the default prefix
        const defaultPrefix = (world.getDynamicProperty("__prefix") as string) || "!";
        const prefixLength = defaultPrefix.length;

        // Set message.cancel to false if the message does not start with the prefix
        if (!message.message.startsWith(defaultPrefix)) {
            message.cancel = false;
            return;
        }

        // Throttle command execution based on rate-limiting
        if (!this.canExecuteCommand()) {
            player.sendMessage("\n§o§7Commands are being rate-limited. Please wait before sending another command.");
            return;
        }

        // Acquire lock before executing the command
        this.acquireCommandExecutionLock();

        let verifyPrefixUpdate: boolean = false;

        try {
            // Extract the command name and arguments
            const args = message.message.slice(prefixLength).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase();

            // Execute the command if a valid command name is provided
            if (commandName) {
                const result = this.executeCommand(message, player, commandName, args, defaultPrefix);
                if (result === true) {
                    verifyPrefixUpdate = true;
                }
            }
        } finally {
            if (verifyPrefixUpdate) {
                // Prefix update is verified, proceed with updating the prefix
                this.updatePrefix(this.minecraftEnvironment.getWorld().getDynamicProperty("__prefix") as string);
            }
            // Release lock after command execution is complete
            this.releaseCommandExecutionLock();
        }
    }

    // Method to update prefix
    updatePrefix(newPrefix: string) {
        // Ensure that no other prefix update is in progress
        if (this.prefixLock) {
            throw new Error("Cannot update prefix while another update is in progress.");
        }

        // Set prefixLock to true to indicate that update is in progress
        this.prefixLock = true;

        try {
            // Update the stored prefix
            this.prefix = newPrefix;

            // Update the usage and examples of all registered commands
            this.commands.forEach((encryptedCommand) => {
                const decryptedCommandString = this.decrypt(encryptedCommand);
                const decryptedCommand = JSON.parse(decryptedCommandString);

                // Replace the placeholder {prefix} with the new prefix in usage and examples
                decryptedCommand.usage = decryptedCommand.usage.replace(/{prefix}/g, newPrefix);
                decryptedCommand.examples = decryptedCommand.examples.map((example: string) => example.replace(/{prefix}/g, newPrefix));

                // Encrypt and update the command data
                const updatedEncryptedData = this.encrypt(JSON.stringify(decryptedCommand), decryptedCommand.name);
                this.commands.set(updatedEncryptedData.iv, updatedEncryptedData);
            });
        } finally {
            // Reset prefixLock flag after update is complete
            this.prefixLock = false;
        }
    }

    // Method to display all available commands
    private displayAllCommands(player: Player) {
        let helpMessage = "\n§4[§6Available Commands§4]§r\n\n";
        this.commands.forEach((command) => {
            const decryptedCommand = this.decrypt(command);
            const { name, description } = JSON.parse(decryptedCommand);
            helpMessage += `§6${name}§7: §o§f${description}§r\n`;
        });
        player.sendMessage(helpMessage);
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

    // Method to encrypt data using AES encryption
    private encrypt(data: string, commandName: string): EncryptedCommandData {
        const iv = this.generateIV(commandName); // Generate a consistent IV based on the command name
        const encryptedData = CryptoES.AES.encrypt(data, this.securityKey, { iv }).toString();
        return { iv: iv.toString(CryptoES.enc.Base64), encryptedData };
    }

    // Method to decrypt data using AES decryption
    private decrypt(encryptedData: EncryptedCommandData): string {
        const iv = CryptoES.enc.Base64.parse(encryptedData.iv);
        const decryptedData = CryptoES.AES.decrypt(encryptedData.encryptedData, this.securityKey, { iv });
        return decryptedData.toString(CryptoES.enc.Utf8);
    }

    // Method to generate a consistent IV based on the security key and command name
    private generateIV(commandName: string): CryptoES.lib.WordArray {
        // Combine the security key and command name to generate a unique identifier
        const uniqueIdentifier = this.securityKey + commandName;
        // Use a cryptographic hash function to derive IV from the unique identifier
        const iv = CryptoES.SHA256(uniqueIdentifier);
        // Take the first 16 bytes of the hash as the IV (AES IV is typically 16 bytes)
        const truncatedIV = iv.words.slice(0, 4); // Each word is 32 bits, so 4 words = 16 bytes
        return CryptoES.lib.WordArray.create(truncatedIV); // Return truncated IV as WordArray
    }

    // Method to acquire the lock before executing a command
    private async acquireCommandExecutionLock() {
        while (this.prefixLock) {
            // If prefix update is in progress, wait and check again
            await new Promise<void>((resolve) => system.runTimeout(() => resolve(), 100)); // Wait for 100 milliseconds
        }
        // Set prefixLock to true to indicate that command execution is in progress
        this.prefixLock = true;
    }

    // Method to release the lock after command execution is complete
    private releaseCommandExecutionLock() {
        // Reset prefixLock flag after command execution is complete
        this.prefixLock = false;
    }

    // Method to execute a command and return a boolean indicating completion status
    private executeCommand(message: ChatSendBeforeEvent, player: Player, commandName: string, args: string[], defaultPrefix: string): void | boolean {
        if (commandName === "help" || args[0]?.toLowerCase() === "help") {
            // Check if the player has permissions to use the "help" command
            const playerPerms = message.sender.getDynamicProperty(`__${message.sender.id}`);
            const worldPerms = this.minecraftEnvironment.getWorld().getDynamicProperty(`__${message.sender.id}`);
            if (!worldPerms || worldPerms !== playerPerms) {
                player.sendMessage("§o§7You do not have permissions.");
                return;
            }
            // Handle help command
            if (args.length === 0) {
                this.displayAllCommands(player);
                return; // Command execution for help command is successful
            } else {
                // Get command info if specified
                const specifiedCommandName = commandName === "help" ? args[0] : commandName;
                const commandInfo = this.getCommandInfo(specifiedCommandName);
                player.sendMessage(commandInfo || "\n§o§7Command not found.");
                return; // Command execution for help with specified command is successful
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
                const validateReturn = command.execute(message, args, this.minecraftEnvironment);
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

    // Method to check if a command can be executed based on rate-limiting
    private canExecuteCommand(): boolean {
        const now = Date.now();
        if (now - this.lastCommandTimestamp >= this.rateLimitInterval) {
            // Reset command count and update last command timestamp if the interval has passed
            this.commandCount = 0;
            this.lastCommandTimestamp = now;
        }
        return this.commandCount++ < this.maxCommandsPerInterval;
    }
}
