import { GameMode, PlayerGameModeChangeAfterEvent, world } from "@minecraft/server";

// Map to track whether each player is in the process of reverting their game mode
const playerRevertingMap = new Map<string, boolean>();

/**
 * Handles game mode change events and enforces allowed game modes.
 * Reverts the game mode to the previous state if the new game mode is not allowed.
 * @param {PlayerGameModeChangeAfterEvent} event - The game mode change event containing player information and the new game mode.
 */
function handleGameModeChange(event: PlayerGameModeChangeAfterEvent): void {
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

    // Get the new and previous game modes of the player
    const newGameMode = event.toGameMode;
    const previousGameMode = event.fromGameMode;

    // Determine if the new game mode is allowed
    let isAllowedNew = false;
    let isAllowedPrevious = false;

    // Check if the new game mode is allowed
    switch (newGameMode) {
        case "adventure":
            isAllowedNew = modeStates.adventure;
            break;
        case "creative":
            isAllowedNew = modeStates.creative;
            break;
        case "survival":
            isAllowedNew = modeStates.survival;
            break;
        case "spectator":
            isAllowedNew = modeStates.spectator;
            break;
    }

    // If the new game mode is allowed, no need to proceed
    if (isAllowedNew) {
        return;
    }

    // Check if the previous game mode is allowed
    switch (previousGameMode) {
        case "adventure":
            isAllowedPrevious = modeStates.adventure;
            break;
        case "creative":
            isAllowedPrevious = modeStates.creative;
            break;
        case "survival":
            isAllowedPrevious = modeStates.survival;
            break;
        case "spectator":
            isAllowedPrevious = modeStates.spectator;
            break;
    }

    // If neither the new nor the previous game mode is allowed, revert to any allowed game mode
    let fallbackGameMode: GameMode | null = null;
    if (modeStates.survival) {
        fallbackGameMode = GameMode.survival;
    } else if (modeStates.adventure) {
        fallbackGameMode = GameMode.adventure;
    } else if (modeStates.creative) {
        fallbackGameMode = GameMode.creative;
    } else if (modeStates.spectator) {
        fallbackGameMode = GameMode.spectator;
    }

    // Revert to the previous game mode if allowed, otherwise switch to the fallback game mode
    if (isAllowedPrevious) {
        player.setGameMode(previousGameMode);
    } else if (fallbackGameMode) {
        player.setGameMode(fallbackGameMode);
    }

    // Notify the player
    player.sendMessage(`§2[§7Paradox§2]§o§7 This game mode is currently disallowed. Game mode corrected.`);

    // Mark the player as reverting and clear the flag after reverting
    playerRevertingMap.set(playerId, true);
    playerRevertingMap.delete(playerId);
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
