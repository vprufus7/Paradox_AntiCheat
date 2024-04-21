import { Player, PlayerSpawnAfterEvent, system, world } from "@minecraft/server";

/**
 * Function to execute lockdown operations if the server is under lockdown.
 */
function lockDownMonitor(object: PlayerSpawnAfterEvent) {
    const lockDownCheck = world.getDynamicProperty("lockdown_b");
    if (!lockDownCheck) {
        unsubscribeFromPlayerSpawn();
        return;
    }

    const reason = "Under Maintenance! Sorry for the inconvenience.";
    if (object.initialSpawn === true) {
        handlePlayerSpawnDuringLockdown(object, reason);
    }
}

/**
 * Handles player spawn events during lockdown.
 * @param {PlayerSpawnAfterEvent} object - The event object containing information about the player spawn.
 * @param {string} reason - The reason for lockdown.
 */
function handlePlayerSpawnDuringLockdown(object: PlayerSpawnAfterEvent, reason: string) {
    const playerPerms = object.player.getDynamicProperty(`__${object.player.id}`);
    const worldPerms = world.getDynamicProperty(`__${object.player.id}`);
    if (!worldPerms || worldPerms !== playerPerms) {
        kickPlayerDuringLockdown(object.player, reason);
    }
}

/**
 * Kicks the player from the server during lockdown.
 * @param {Player} player - The player to kick.
 * @param {string} reason - The reason for the kick.
 */
function kickPlayerDuringLockdown(player: Player, reason: string) {
    const kickMessage = `kick ${player.name} §o§7\n\n${reason}`;
    world.getDimension(player.dimension.id).runCommandAsync(kickMessage);
}

/**
 * Subscribes the lockDownMonitor function to playerSpawn events.
 */
function subscribeToPlayerSpawn() {
    world.afterEvents.playerSpawn.subscribe(lockDownMonitor);
}

/**
 * Unsubscribes the lockDownMonitor function from playerSpawn events.
 */
function unsubscribeFromPlayerSpawn() {
    system.run(() => {
        world.afterEvents.playerSpawn.unsubscribe(lockDownMonitor);
    });
}

/**
 * Function to execute lockdown operations when the world initializes.
 */
function lockDown() {
    const lockDownCheck = world.getDynamicProperty("lockdown_b");
    if (lockDownCheck) {
        subscribeToPlayerSpawn();
    }
}

/**
 * Function to execute on world initialization.
 */
function onWorldInitialize() {
    lockDown();
}

/**
 * Subscribes to the worldInitializeEvent and exports the subscribe method.
 */
export function subscribeToWorldInitialize() {
    world.afterEvents.worldInitialize.subscribe(onWorldInitialize);
}
