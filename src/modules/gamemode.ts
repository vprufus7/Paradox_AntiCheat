import { PlayerGameModeChangeAfterEvent, world } from "@minecraft/server";

// Map to track whether each player is in the process of reverting their game mode
const playerRevertingMap = new Map<string, boolean>();

/**
 * Handles game mode change events and enforces allowed game modes.
 * @param {PlayerGameModeChangeAfterEvent} event - The game mode change event.
 */
function handleGameModeChange(event: PlayerGameModeChangeAfterEvent) {
    const player = event.player;
    const playerId = event.player.id;

    // Check if the player is currently reverting
    if (playerRevertingMap.get(playerId) || (player.getDynamicProperty("securityClearance") as number) === 4) {
        return; // Exit if the player is already reverting
    }

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

    if (!modeStates.gamemodeCheck) {
        world.afterEvents.playerGameModeChange.unsubscribe(handleGameModeChange);
        return; // Exit if gamemode checks are disabled
    }

    // Get the new game mode of the player
    const newGameMode = event.toGameMode;

    // Check if the new game mode is allowed
    let isAllowed = false;
    switch (newGameMode) {
        case "adventure":
            isAllowed = modeStates.adventure;
            break;
        case "creative":
            isAllowed = modeStates.creative;
            break;
        case "survival":
            isAllowed = modeStates.survival;
            break;
        case "spectator":
            isAllowed = modeStates.spectator;
            break;
    }

    // If the game mode is not allowed, revert to the previous game mode
    if (!isAllowed) {
        playerRevertingMap.set(playerId, true); // Mark the player as reverting
        player.setGameMode(event.fromGameMode);
        player.sendMessage(`§f§4[§6Paradox§4]§o§7 This game mode is currently disallowed. Game mode corrected.`);
        playerRevertingMap.delete(playerId); // Clear the reverting flag after the revert
    }
}

/**
 * Monitors game mode changes and enforces allowed game modes.
 */
export function GameModeInspection() {
    // Subscribe to the game mode change event
    world.afterEvents.playerGameModeChange.subscribe((event: PlayerGameModeChangeAfterEvent) => {
        handleGameModeChange(event);
    });
}
