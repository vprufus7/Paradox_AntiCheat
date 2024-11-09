import { ChatSendBeforeEvent, EntityHealthComponent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { initializePvPSystem, stopPvPSystem } from "../../modules/pvp-manager";

/**
 * Represents the PvP toggle command.
 */
export const pvpToggleCommand: Command = {
    name: "pvp",
    description: "Toggles PvP mode for the player or globally, or shows the current PvP status.",
    specialNote: "* To bypass PvP for safe zones you must give them a tag: paradoxBypassPvPCheck",
    usage: "{prefix}pvp [ global | status | help ]",
    examples: [`{prefix}pvp`, `{prefix}pvp global`, `{prefix}pvp status`, `{prefix}pvp help`],
    category: "Utility",
    securityClearance: 1,

    /**
     * Executes the pvp command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: async (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const isGlobal = args.includes("global");
        const showStatus = args.includes("status");
        const playerClearance = player.getDynamicProperty("securityClearance") as number;
        const dynamicPropertyKey = "pvpEnabled"; // Key for PvP status dynamic property on the player
        const globalDynamicPropertyKey = "pvpGlobalEnabled"; // Key for global PvP status dynamic property
        const cooldownPropertyKey = "pvpToggleCooldown"; // Key for storing the last toggle tick
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const currentTick = system.currentTick;
        // Define cooldown time in ticks (5 minutes = 5 * 60 * 20 ticks)
        const PVP_TOGGLE_COOLDOWN_TICKS = 5 * 60 * 20;

        async function setPvP(status: boolean): Promise<void> {
            return new Promise((resolve) => {
                system.run(() => {
                    world.gameRules.pvp = status;
                    resolve();
                });
            });
        }

        if (showStatus) {
            const isPvPEnabled = (player.getDynamicProperty(dynamicPropertyKey) as boolean) || false;
            const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) || world.gameRules.pvp;

            const messageLines = [`§2[§7Paradox§2]§o§7 PvP Status Overview:`, `  | Global PvP: ${isPvPGlobalEnabled ? "§aEnabled§7" : "§4Disabled§7"}`, `  | Your PvP: ${isPvPEnabled ? "§aEnabled§7" : "§4Disabled§7"}`];

            player.sendMessage(messageLines.join("\n"));
            return;
        }

        if (isGlobal) {
            if (playerClearance < 4) {
                player.sendMessage(`§cYou do not have permission to toggle PvP globally.`);
                return;
            }

            // Get the current global PvP status
            const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) || world.gameRules.pvp;

            // Toggle the global PvP status
            if (isPvPGlobalEnabled) {
                // Disable global PvP
                await setPvP(false);
                world.setDynamicProperty(globalDynamicPropertyKey, false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Global PvP has been §4disabled§7.`);
                system.run(() => {
                    stopPvPSystem();
                });
            } else {
                // Enable global PvP
                await setPvP(true);
                const players = world.getAllPlayers();
                for (const player of players) {
                    const healthComponent = player.getComponent("health") as EntityHealthComponent;
                    if (healthComponent) {
                        player.setDynamicProperty("paradoxCurrentHealth", healthComponent.currentValue);
                    }
                }
                world.setDynamicProperty(globalDynamicPropertyKey, true);
                initializePvPSystem();
                player.sendMessage(`§2[§7Paradox§2]§o§7 Global PvP has been §aenabled§7.`);
            }
        } else {
            // Get the current PvP status of the player from dynamic properties
            const isPvPEnabled = (player.getDynamicProperty(dynamicPropertyKey) as boolean) || false;
            const lastToggleTick = (player.getDynamicProperty(cooldownPropertyKey) as number) || 0;

            // Check if the cooldown period has passed
            if (currentTick - lastToggleTick < PVP_TOGGLE_COOLDOWN_TICKS) {
                const ticksRemaining = PVP_TOGGLE_COOLDOWN_TICKS - (currentTick - lastToggleTick);
                const secondsRemaining = Math.ceil(ticksRemaining / 20); // Convert ticks to seconds

                let timeRemainingMessage;
                if (secondsRemaining > 60) {
                    const minutesRemaining = Math.floor(secondsRemaining / 60);
                    const remainingSeconds = secondsRemaining % 60;
                    timeRemainingMessage = `${minutesRemaining} minutes${remainingSeconds > 0 ? ` and ${remainingSeconds} seconds` : ""}`;
                } else {
                    timeRemainingMessage = `${secondsRemaining} seconds`;
                }

                player.sendMessage(`§2[§7Paradox§2]§o§7 You can toggle PvP again in ${timeRemainingMessage}.`);
                return;
            }

            // Toggle the PvP status for the player
            if (isPvPEnabled) {
                // Disable PvP
                player.setDynamicProperty(dynamicPropertyKey, false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 PvP has been §4disabled§7 for you.`);
            } else {
                // Enable PvP
                player.setDynamicProperty(dynamicPropertyKey, true);
                player.sendMessage(`§2[§7Paradox§2]§o§7 PvP has been §aenabled§7 for you.`);
            }

            // Update the cooldown tick count
            player.setDynamicProperty(cooldownPropertyKey, currentTick);
        }
    },
};
