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
    if (event.initialSpawn === true) {
        // If player is initially spawning
        handleBanCheck(event);
        handleSecurityClearance(event);
    }
    // Add more event handlers here for other functionalities
}

/**
 * Function to handle banning check during player spawn.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleBanCheck(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const bannedPlayersString = world.getDynamicProperty("bannedPlayers") as string;
    let bannedPlayers: string[] = [];

    try {
        bannedPlayers = bannedPlayersString ? JSON.parse(bannedPlayersString) : [];
    } catch (error) {
        bannedPlayers = [];
    }

    // Check if the player is in the banned list
    if (bannedPlayers.includes(player.name)) {
        // Check player's security clearance
        const playerClearance = player.getDynamicProperty("securityClearance") as number;

        if (playerClearance === 4) {
            // Remove player from banned list and notify
            bannedPlayers = bannedPlayers.filter((name) => name !== player.name);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
            const validate = player.hasTag(`paradoxBanned:`);
            if (validate) {
                player.removeTag(`paradoxBanned:`);
            }
            player.sendMessage(`§o§7Your ban was canceled due to high security clearance.`);
        } else {
            // If the player is banned and has clearance < 4, add ban tag and kick
            const validate = player.hasTag(`paradoxBanned:`);
            if (!validate) {
                player.addTag(`paradoxBanned:`);
            }
            const dimension = world.getDimension(player.dimension.id);
            dimension.runCommand(`kick ${player.name} §o§7\n\nYou are banned. Please contact an admin for more information.`);
        }
    }
}

/**
 * Function to handle security clearance during player spawn.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleSecurityClearance(event: PlayerSpawnAfterEvent) {
    // Check player's security clearance
    const securityClearance = event.player.getDynamicProperty("securityClearance") as number;

    // If player doesn't have security clearance, set it to default level 1
    if (!securityClearance || securityClearance < 1 || securityClearance > 4) {
        event.player.setDynamicProperty("securityClearance", 1); // Set default clearance level
    }
}
