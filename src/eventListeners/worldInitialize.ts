import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";

/**
 * Function to execute on world initialization.
 */
function onWorldInitialize() {
    // Call the lockDown function when the world initializes
    lockDown();
}

/**
 * Function to perform lockdown operations.
 */
function lockDown() {
    // Check if the server is under lockdown
    const lockDownCheck = world.getDynamicProperty("lockdown_b");
    if (lockDownCheck) {
        // Subscribe the lockDownMonitor function to playerSpawnSubscription
        world.afterEvents.playerSpawn.subscribe(lockDownMonitor);
    }
}

/**
 * Defines the lockDownMonitor function to handle player spawns during lockdown.
 * @param {PlayerSpawnAfterEvent} object - The event object containing information about the player spawn.
 */
function lockDownMonitor(object: PlayerSpawnAfterEvent) {
    const lockDownCheck = world.getDynamicProperty("lockdown_b");
    if (!lockDownCheck) {
        system.run(() => {
            world.afterEvents.playerSpawn.unsubscribe(lockDownMonitor);
        });
        return;
    }
    // Default reason for locking it down
    const reason = "Under Maintenance! Sorry for the inconvenience.";
    // Check if the player is initially spawning
    if (object.initialSpawn === true) {
        // Get player's permissions
        const playerPerms = object.player.getDynamicProperty(`__${object.player.id}`);
        const worldPerms = world.getDynamicProperty(`__${object.player.id}`);
        // If player's permissions don't match world's permissions or no world permissions exist,
        if (!worldPerms || worldPerms !== playerPerms) {
            // kick the player from the server
            world.getDimension(object.player.dimension.id).runCommandAsync(`kick ${object.player.name} §o§7\n\n${reason}`);
            return;
        }
    }
}

/**
 * Subscribes to the worldInitializeEvent and exports the subscribe method.
 */
export function subscribeToWorldInitialize() {
    // Subscribe onWorldInitialize function to the worldInitializeEvent
    world.afterEvents.worldInitialize.subscribe(onWorldInitialize);
}
