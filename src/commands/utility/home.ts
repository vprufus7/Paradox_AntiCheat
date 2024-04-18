import { Command } from "../../classes/CommandHandler";
import { Vector3 } from "@minecraft/server";

export const homeCommand: Command = {
    name: "home",
    description: "Manage home locations.",
    usage: "{prefix}home <set | delete | teleport | list | help> [homeName]",
    examples: [`{prefix}home set MyHome`, `{prefix}home delete MyHome`, `{prefix}home teleport MyHome`, `{prefix}home list`, `{prefix}home help`],
    category: "Utility",
    execute: (message, args, minecraftEnvironment, cryptoES) => {
        const system = minecraftEnvironment.getSystem();
        const player = message.sender;

        // Define the prefix for unencrypted home tags
        const UNENCRYPTED_HOME_TAG_PREFIX = "home:";

        // Define the prefix for encrypted home tags
        const ENCRYPTED_HOME_TAG_PREFIX = "encrypted_home:";

        // Transform the player ID to generate a unique key
        const obfuscatedKey = cryptoES.SHA256(message.sender.id).toString();

        // Helper function to encrypt data
        function encryptData(data: string): string {
            return cryptoES.AES.encrypt(data, obfuscatedKey).toString();
        }

        // Helper function to decrypt data
        function decryptData(encryptedData: string): string {
            const bytes = cryptoES.AES.decrypt(encryptedData, obfuscatedKey);
            return bytes.toString(cryptoES.enc.Utf8);
        }

        // Helper function to format dimension strings
        function formatDimension(dimension: string): string {
            // Capitalize the first letter of each word
            const formattedDimension = dimension.replace(/(^|_)(\w)/g, (_, __, letter) => letter.toUpperCase());

            // Replace "TheEnd" with "The End"
            if (formattedDimension === "TheEnd") {
                return "The End";
            }

            return formattedDimension;
        }

        // Helper function to save home location
        function saveHomeLocation(homeName: string, location: Vector3, dimension: string): boolean {
            const existingHome = player.getTags().find((tag) => {
                if (tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX)) {
                    const decryptedTag = decryptData(tag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                    const [, existingHomeName] = decryptedTag.split(":");
                    return existingHomeName === homeName;
                }
                return false; // Skip non-encrypted tags
            });

            if (existingHome) {
                return true; // Home with the same name already exists
            }

            const unencryptedTag = `${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}:${dimension.replace("minecraft:", "")}`;
            const encryptedTag = `${ENCRYPTED_HOME_TAG_PREFIX}${encryptData(unencryptedTag)}`;
            player.addTag(encryptedTag);
            return false;
        }

        // Helper function to delete home location
        function deleteHomeLocation(homeName: string): boolean {
            const encryptedTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
            for (const encryptedTag of encryptedTags) {
                const decryptedTag = decryptData(encryptedTag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                if (decryptedTag.startsWith(`${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:`)) {
                    player.removeTag(encryptedTag);
                    return true; // Home deleted successfully
                }
            }
            return false; // Home not found
        }

        // Helper function to list all home locations
        function listHomeLocations(): void {
            const encryptedTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
            if (encryptedTags.length > 0) {
                player.sendMessage("§o§7Your saved home locations:");
                encryptedTags.forEach((encryptedTag) => {
                    const decryptedTag = decryptData(encryptedTag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                    const [, homeName, location, dimension] = decryptedTag.split(":");
                    const [x, y, z] = location.split(",");
                    const formattedDimension = formatDimension(dimension);
                    player.sendMessage(` §o§7| [§f${homeName}§7] Dimension: §4${formattedDimension}§f, §7Location:§f ${x}, ${y}, ${z}`);
                });
            } else {
                player.sendMessage("§o§7You have no saved home locations!");
            }
        }

        // Helper function to teleport to a home location
        function teleportToHomeLocation(homeName: string): void {
            const encryptedTags = player.getTags().filter((tag) => tag.startsWith(ENCRYPTED_HOME_TAG_PREFIX));
            for (const encryptedTag of encryptedTags) {
                const decryptedTag = decryptData(encryptedTag.replace(ENCRYPTED_HOME_TAG_PREFIX, ""));
                if (decryptedTag.startsWith(`${UNENCRYPTED_HOME_TAG_PREFIX}${homeName}:`)) {
                    const [, , location, dimension] = decryptedTag.split(":");
                    const [x, y, z] = location.split(",");
                    const teleportLocation = { x: parseFloat(x), y: parseFloat(y), z: parseFloat(z) };
                    const dimensionType = minecraftEnvironment.getWorld().getDimension(dimension);
                    const teleportOptions = { dimension: dimensionType };
                    const success = player.tryTeleport(teleportLocation, teleportOptions);
                    if (success) {
                        player.sendMessage(`§o§7Welcome to "${homeName}" ${player.name}!`);
                    } else {
                        player.sendMessage(`§o§7Failed to teleport to "${homeName}"! Please try again.`);
                    }
                    return;
                }
            }
            player.sendMessage(`§o§7Home location "${homeName}" not found!`);
        }

        const subCommand = args[0]?.toLowerCase();
        const homeName = args.slice(1).join(" ");

        switch (subCommand) {
            case "set":
                const id = system.run(() => {
                    const location = player.location; // Get the player's current location
                    const dimension = player.dimension.id; // Get the name of the player's current dimension
                    const existingHome = saveHomeLocation(homeName, location, dimension);
                    if (existingHome) {
                        player.sendMessage(`§o§7A home named "${homeName}" already exists!`);
                        return system.clearRun(id);
                    }
                    player.sendMessage(`§o§7Home location "${homeName}" set successfully!`);
                });
                break;
            case "delete":
                system.run(() => {
                    const homeDeleted = deleteHomeLocation(homeName);
                    if (homeDeleted) {
                        player.sendMessage(`§o§7Home location "${homeName}" deleted successfully!`);
                    } else {
                        player.sendMessage(`§o§7Home location "${homeName}" not found!`);
                    }
                });
                break;
            case "teleport":
                system.run(() => {
                    teleportToHomeLocation(homeName);
                });
                break;
            case "list":
                listHomeLocations();
                break;
            default:
                player.sendMessage("\n§o§7Invalid subcommand!");
                break;
        }
    },
};
