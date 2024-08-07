import { PlayerSpawnAfterEvent, world } from "@minecraft/server";

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

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
    const player = event.player;
    const playerClearance = player.getDynamicProperty("securityClearance") as number;
    const playerId = player.id;

    // If player doesn't have security clearance, set it to default level 1
    if (!playerClearance || playerClearance < 1 || playerClearance > 4) {
        event.player.setDynamicProperty("securityClearance", 1); // Set default clearance level
    }

    // Retrieve the security clearance data
    const moduleKey = "paradoxOPSEC";
    const securityListObject = world.getDynamicProperty(moduleKey) as string;

    if (!securityListObject) {
        // If the dynamic property does not exist, skip security clearance handling
        return;
    }

    // Parse the security clearance data
    const securityClearanceData: SecurityClearanceData = JSON.parse(securityListObject);

    // Retrieve security clearance list and host data
    const securityClearanceList = securityClearanceData.securityClearanceList;
    const hostId = securityClearanceData.host?.id;

    if (playerId === hostId) {
        // Skip if the player is the host
        return;
    }

    // If player's clearance is 4, reset to 1
    if (playerClearance === 4) {
        // Verify if the player is in the security clearance list
        const isInSecurityList = securityClearanceList.some((playerInfo: PlayerInfo) => playerInfo.id === playerId);

        if (!isInSecurityList) {
            player.setDynamicProperty("securityClearance", 1);
        }
    }
}
