import { PlayerSpawnAfterEvent, world } from "@minecraft/server";

/**
 * Function to execute on player spawn.
 */
export function onPlayerSpawn() {
    // Call the initializeEventHandlers function when the world initializes
    initializeEventHandlers();
}

/**
 * Function to initialize event handlers.
 */
function initializeEventHandlers() {
    // Subscribe event handlers to player spawn events
    world.afterEvents.playerSpawn.subscribe(handlePlayerSpawn);
}

/**
 * Function to handle player spawn events.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handlePlayerSpawn(event: PlayerSpawnAfterEvent) {
    // Call additional event handlers as needed
    handleSecurityClearance(event);
    // Add more event handlers here for other functionalities
}

/**
 * Function to handle security clearance during player spawn.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleSecurityClearance(event: PlayerSpawnAfterEvent) {
    // Check if the player is initially spawning
    if (event.initialSpawn === true) {
        // Check player's security clearance
        const securityClearance = event.player.getDynamicProperty("securityClearance") as number;

        // If player doesn't have security clearance, set it to default level 1
        if (!securityClearance || securityClearance < 1 || securityClearance > 4) {
            event.player.setDynamicProperty("securityClearance", 1); // Set default clearance level
        }
    }
}
