import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { playerSpawnSubscription } from "../classes/subscriptions/PlayerSpawnSubscriptions";

// Function to execute on world initialization
function onWorldInitialize() {
    // Call the lockDown function when the world initializes
    lockDown();
}

// Function to perform lockdown operations
function lockDown() {
    // Check if the server is under lockdown
    const lockDownCheck = world.getDynamicProperty("lockdown_b");
    if (lockDownCheck) {
        // Define the lockDownMonitor function to handle player spawns during lockdown
        function lockDownMonitor(object: PlayerSpawnAfterEvent) {
            // Default reason for locking it down
            const reason = "Under Maintenance! Sorry for the inconvenience.";
            // Check if the player is initially spawning
            if (object.initialSpawn === true) {
                // Get player's permissions
                const playerPerms = object.player.getDynamicProperty(`__${object.player.id}`);
                const worldPerms = world.getDynamicProperty(`__${object.player.id}`);
                // If player's permissions don't match world's permissions or no world permissions exist,
                // kick the player from the server
                if (!worldPerms || worldPerms !== playerPerms) {
                    world.getDimension(object.player.dimension.id).runCommandAsync(`kick ${object.player.name} §o§7\n\n${reason}`);
                    return;
                }
            }
        }

        // Subscribe the lockDownMonitor function to playerSpawnSubscription
        playerSpawnSubscription.subscribe(lockDownMonitor);
    }
}

// Subscribe to the worldInitializeEvent and export the subscribe method
export function subscribeToWorldInitialize() {
    // Subscribe onWorldInitialize function to the worldInitializeEvent
    world.afterEvents.worldInitialize.subscribe(onWorldInitialize);
}
