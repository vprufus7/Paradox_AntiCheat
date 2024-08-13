import { ChatSendAfterEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { GameModeInspection } from "../../modules/game-mode";

/**
 * Represents the gamemode command.
 */
export const gameModeCommand: Command = {
    name: "gamemode",
    description: "Allows or disallows game modes, and lists current configurations.",
    usage: "{prefix}gamemode [ -a | -c | -s | -sp | -e | -d | --enable | --disable | -l | --list ]",
    examples: [`{prefix}gamemode -a`, `{prefix}gamemode -c -s`, `{prefix}gamemode -a -c -sp`, `{prefix}gamemode --enable`, `{prefix}gamemode --disable`, `{prefix}gamemode -l`, `{prefix}gamemode --list`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the gamemode command.
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        const modeKeys = {
            adventure: "adventuregm_b",
            creative: "creativegm_b",
            survival: "survivalgm_b",
            spectator: "spectatorgm_b",
            gamemodeCheck: "gamemodeCheck_b",
        };

        let paradoxModules: { [key: string]: boolean } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

        // Initial mode states
        const modeStates = {
            adventure: paradoxModules[modeKeys.adventure] ?? true,
            creative: paradoxModules[modeKeys.creative] ?? true,
            survival: paradoxModules[modeKeys.survival] ?? true,
            spectator: paradoxModules[modeKeys.spectator] ?? true,
            gamemodeCheck: paradoxModules[modeKeys.gamemodeCheck] ?? true,
        };

        // Function to format the game mode settings message
        const formatSettingsMessage = (modeStates: { [key: string]: boolean }) => {
            const lines = [
                `§f§4[§6Paradox§4]§o§7 Current Game Mode Settings:`,
                `  | Adventure: ${modeStates.adventure ? "§aAllowed§7" : "§4Disallowed§7"}`,
                `  | Creative: ${modeStates.creative ? "§aAllowed§7" : "§4Disallowed§7"}`,
                `  | Survival: ${modeStates.survival ? "§aAllowed§7" : "§4Disallowed§7"}`,
                `  | Spectator: ${modeStates.spectator ? "§aAllowed§7" : "§4Disallowed§7"}`,
                `  | Gamemode Checks: ${modeStates.gamemodeCheck ? "§aEnabled§7" : "§4Disabled§7"}.`,
            ];
            return lines.join("\n");
        };

        // Handle listing of settings
        if (args.includes("-l") || args.includes("--list")) {
            player.sendMessage(formatSettingsMessage(modeStates));
            return; // Exit after listing settings
        }

        let needsInspectionUpdate = false;

        // Determine the modes to toggle
        args.forEach((arg) => {
            switch (arg.toLowerCase()) {
                case "-a":
                    modeStates.adventure = !modeStates.adventure;
                    needsInspectionUpdate = true;
                    break;
                case "-c":
                    modeStates.creative = !modeStates.creative;
                    needsInspectionUpdate = true;
                    break;
                case "-s":
                    modeStates.survival = !modeStates.survival;
                    needsInspectionUpdate = true;
                    break;
                case "-sp":
                    modeStates.spectator = !modeStates.spectator;
                    needsInspectionUpdate = true;
                    break;
                case "-e":
                case "--enable":
                    modeStates.gamemodeCheck = true;
                    needsInspectionUpdate = true;
                    break;
                case "-d":
                case "--disable":
                    modeStates.gamemodeCheck = false;
                    needsInspectionUpdate = true;
                    break;
                default:
                    player.sendMessage("§f§4[§6Paradox§4]§o§7 Invalid argument. Use -a, -c, -s, -sp, --enable, --disable, or --list.");
                    return;
            }
        });

        // Ensure at least one game mode remains enabled if checks are enabled
        if (modeStates.gamemodeCheck) {
            const enabledModes = Object.entries(modeStates).filter(([key, state]) => key !== "gamemodeCheck" && state).length;

            if (enabledModes === 0) {
                player.sendMessage("§f§4[§6Paradox§4]§o§7 You cannot disable all game modes. At least one must remain enabled.");
                return;
            }
        }

        // Update dynamic properties
        paradoxModules[modeKeys.adventure] = modeStates.adventure;
        paradoxModules[modeKeys.creative] = modeStates.creative;
        paradoxModules[modeKeys.survival] = modeStates.survival;
        paradoxModules[modeKeys.spectator] = modeStates.spectator;
        paradoxModules[modeKeys.gamemodeCheck] = modeStates.gamemodeCheck;
        world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));

        // Notify player of the changes
        player.sendMessage(formatSettingsMessage(modeStates));

        // Call GameModeInspection() if checks are enabled or updated
        if ((needsInspectionUpdate && modeStates.gamemodeCheck) || modeStates.gamemodeCheck) {
            system.run(() => {
                GameModeInspection();
            });
        }
    },
};
