import { PlayerSpawnAfterEvent, world } from "@minecraft/server";

/**
 * Function to execute on player spawn.
 */
function onPlayerSpawn() {
    // Call the initializeSecurityClearance function when the world initializes
    initializeSecurityClearance();
}

/**
 * Function to initialize player security clearance monitoring.
 */
function initializeSecurityClearance() {
    // Subscribe the securityClearanceMonitor function to player spawn events
    world.afterEvents.playerSpawn.subscribe(securityClearanceMonitor);
}

/**
 * Function to monitor player security clearance during spawn.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function securityClearanceMonitor(event: PlayerSpawnAfterEvent) {
    // Check if the player is initially spawning
    if (event.initialSpawn === true) {
        // Check player's security clearance
        const securityClearance = event.player.getDynamicProperty("securityClearance");

        // If player doesn't have security clearance, set it to default level 1
        if (!securityClearance || (securityClearance as number) > 4 || (securityClearance as number) < 1) {
            event.player.setDynamicProperty("securityClearance", 1); // Set default clearance level
        }
    }
}

/**
 * Subscribe to player spawn events.
 */
export function subscribeToPlayerSpawn() {
    // Call the onPlayerSpawn function
    onPlayerSpawn();
}
