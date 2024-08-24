import { PlayerGameModeChangeAfterEvent, world } from "@minecraft/server";

// Map to track whether each player is in the process of reverting their game mode
const playerRevertingMap = new Map<string, boolean>();

/**
 * Handles game mode change events and enforces allowed game modes.
 * Reverts the game mode to the previous state if the new game mode is not allowed.
 * @param {PlayerGameModeChangeAfterEvent} event - The game mode change event containing player information and the new game mode.
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
        settings: "gamemode_settings",
    };

    // Retrieve the current dynamic properties for game mode settings
    let paradoxModules: { [key: string]: any } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

    // Initialize mode states with default values
    const modeStates = {
        adventure: paradoxModules[modeKeys.settings]?.adventure ?? true,
        creative: paradoxModules[modeKeys.settings]?.creative ?? true,
        survival: paradoxModules[modeKeys.settings]?.survival ?? true,
        spectator: paradoxModules[modeKeys.settings]?.spectator ?? true,
    };

    // Get the new game mode of the player
    const newGameMode = event.toGameMode;

    // Determine if the new game mode is allowed
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
        player.setGameMode(event.fromGameMode); // Revert to the previous game mode
        player.sendMessage(`§2[§7Paradox§2]§o§7 This game mode is currently disallowed. Game mode corrected.`);
        playerRevertingMap.delete(playerId); // Clear the reverting flag after the revert
    }
}

/**
 * Monitors game mode changes and enforces allowed game modes.
 * Subscribes to the game mode change event and handles it using the `handleGameModeChange` function.
 */
export function startGameModeCheck() {
    // Subscribe to the game mode change event
    world.afterEvents.playerGameModeChange.subscribe(handleGameModeChange);
}

/**
 * Stops monitoring game mode changes.
 */
export function stopGameModeCheck() {
    // Unsubscribe to the game mode change event
    world.afterEvents.playerGameModeChange.unsubscribe(handleGameModeChange);
}
