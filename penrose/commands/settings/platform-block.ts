import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

/**
 * Represents the platformBlock command.
 */
export const platformBlockCommand: Command = {
    name: "platformblock",
    description: "Blocks players from joining based on their platform.",
    usage: "{prefix}platformblock <platform> [ -e | -d ]",
    examples: [`{prefix}platformblock console -e`, `{prefix}platformblock desktop -d`, `{prefix}platformblock mobile --enable`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the platformBlock command to enable or disable platform-based restrictions.
     * @param {ChatSendBeforeEvent} message - The chat message triggering the command.
     * @param {string[]} args - The command arguments (e.g., platform and action).
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";
        const platformBlockSettingsKey = "platformBlockSettings";

        // Parse and normalize command arguments
        const platform = args[0]?.toLowerCase() as "console" | "desktop" | "mobile";
        const action = args[1]?.toLowerCase();

        // Validate platform argument
        if (!["console", "desktop", "mobile"].includes(platform)) {
            player.sendMessage(`§cInvalid platform. Use console, desktop, or mobile.`);
            return;
        }

        // Map flags and arguments for enable/disable actions
        const enableFlags = ["--enable", "-e"];
        const disableFlags = ["--disable", "-d"];
        let blockPlatform: boolean | null = null;

        if (enableFlags.includes(action)) {
            blockPlatform = true;
        } else if (disableFlags.includes(action)) {
            blockPlatform = false;
        } else {
            player.sendMessage(`§cInvalid action. Use "-e" to block or "-d" to allow.`);
            return;
        }

        // Get current paradoxModules settings and ensure platformBlockSettings exists
        let paradoxModules: { [key: string]: any } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        if (!paradoxModules[platformBlockSettingsKey]) {
            paradoxModules[platformBlockSettingsKey] = {};
        }

        // Restrict the player from blocking their own platform
        const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();
        if (blockPlatform && playerPlatform === platform) {
            player.sendMessage(`§cYou cannot block your own platform.`);
            return;
        }

        // Update the specific platform's block setting temporarily for validation
        paradoxModules[platformBlockSettingsKey][platform] = blockPlatform;

        // Check if blocking this platform will block all three
        const blockedPlatforms = ["console", "desktop", "mobile"].filter((platformType) => paradoxModules[platformBlockSettingsKey][platformType] === true);

        if (blockedPlatforms.length > 2) {
            // Revert the change to keep at least one platform unblocked
            paradoxModules[platformBlockSettingsKey][platform] = !blockPlatform;
            player.sendMessage(`§cCannot block all platforms. At least one platform must remain unblocked.`);
            return;
        }

        // Commit the validated platform block settings
        world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));

        // Notify the player of the change
        const status = blockPlatform ? "blocked" : "allowed";
        player.sendMessage(`§2[§7Paradox§2]§o§7 ${platform.charAt(0).toUpperCase() + platform.slice(1)} players are now ${status} from joining.`);
    },
};
