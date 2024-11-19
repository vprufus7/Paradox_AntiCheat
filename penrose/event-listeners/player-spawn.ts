import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { getParadoxModules } from "../utility/paradox-modules-manager";

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

/**
 * Function to execute when a player spawns.
 * Initializes event handlers for player spawn events.
 */
export function onPlayerSpawn() {
    // Call the initializeEventHandlers function when the world initializes
    initializeEventHandlers();
}

/**
 * Function to initialize event handlers for player spawn events.
 * Subscribes to the player spawn event to handle additional logic.
 */
function initializeEventHandlers() {
    // Subscribe event handlers to player spawn events
    world.afterEvents.playerSpawn.subscribe(handlePlayerSpawn);
}

/**
 * Handles player spawn events.
 * This function is triggered when a player spawns in the world.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handlePlayerSpawn(event: PlayerSpawnAfterEvent) {
    // Call additional event handlers as needed
    if (event.initialSpawn === true) {
        // If player is initially spawning
        isPlatformBlocked(event);
        handleBanCheck(event);
        handleSecurityClearance(event);
    }
    // Add more event handlers here for other functionalities
}

/**
 * Checks if the player's platform is blocked.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function isPlatformBlocked(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const platformBlockSettingKey = "platformBlock_settings";

    // Retrieve the platform block settings from Dynamic Properties
    let platformSettings: { [key: string]: boolean } = {};

    // Parse platform block settings if the property exists and is defined
    const settings = getParadoxModules(world);
    platformSettings = settings[platformBlockSettingKey] || {};

    // Determine the player's platform type and check if it's blocked
    const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();
    if (!playerPlatform || (platformSettings && platformSettings[playerPlatform] === true)) {
        const dimension = world.getDimension(player.dimension.id);
        dimension.runCommand(`kick ${player.name} §o§7\n\nThis platform is not authorized!`);
    }
}

/**
 * Checks if a player is banned during their spawn event.
 * Updates the banned players list and handles ban tags and kick actions.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleBanCheck(event: PlayerSpawnAfterEvent) {
    const BANNED_PLAYERS_KEY = "bannedPlayers";
    const GLOBAL_BANNED_PLAYERS_KEY = "globalBannedPlayers";
    const BAN_TAG = `paradoxBanned:`;

    const player = event.player;
    const playerName = player.name; // Cache player name

    // Function to lazily parse dynamic properties
    const getDynamicList = (key: string): string[] => {
        const data = world.getDynamicProperty(key) as string;
        return data ? JSON.parse(data) : [];
    };

    // 1. Check for global ban first (prioritized)
    const globalBannedPlayers = getDynamicList(GLOBAL_BANNED_PLAYERS_KEY);
    if (globalBannedPlayers.includes(playerName)) {
        const dimension = world.getDimension(player.dimension.id);
        dimension.runCommand(`kick ${playerName} §o§7\n\nYou are globally banned. Please contact an admin for more information.`);
        return; // Exit early
    }

    // 2. Check for local ban only if not globally banned
    const bannedPlayers = getDynamicList(BANNED_PLAYERS_KEY);
    if (bannedPlayers.includes(playerName)) {
        const playerClearance = (player.getDynamicProperty("securityClearance") as number) || 0;

        if (playerClearance >= 4) {
            // High clearance: remove from ban list and notify
            const updatedBannedPlayers = bannedPlayers.filter((name) => name !== playerName);
            world.setDynamicProperty(BANNED_PLAYERS_KEY, JSON.stringify(updatedBannedPlayers));

            if (player.hasTag(BAN_TAG)) {
                player.removeTag(BAN_TAG);
            }
            player.sendMessage(`§2[§7Paradox§2]§o§7 Your ban was canceled due to high security clearance.`);
        } else {
            // Low clearance: ensure ban tag and kick the player
            if (!player.hasTag(BAN_TAG)) {
                player.addTag(BAN_TAG);
            }
            const dimension = world.getDimension(player.dimension.id);
            dimension.runCommand(`kick ${playerName} §o§7\n\nYou are banned. Please contact an admin for more information.`);
        }
    }
}

/**
 * Handles security clearance during player spawn.
 * Ensures player's security clearance is set correctly and updates as needed.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleSecurityClearance(event: PlayerSpawnAfterEvent) {
    const DEFAULT_CLEARANCE = 1;
    const MAX_CLEARANCE = 4;
    const MODULE_KEY = "paradoxOPSEC";

    const player = event.player;
    const playerId = player.id;

    // Get or initialize player's security clearance
    let playerClearance = player.getDynamicProperty("securityClearance") as number;
    if (!playerClearance || playerClearance < DEFAULT_CLEARANCE || playerClearance > MAX_CLEARANCE) {
        player.setDynamicProperty("securityClearance", DEFAULT_CLEARANCE);
        playerClearance = DEFAULT_CLEARANCE;
    }

    // Retrieve security clearance data
    const securityListObject = world.getDynamicProperty(MODULE_KEY) as string;
    if (!securityListObject) {
        // Skip if no security data is available
        return;
    }

    // Parse security clearance data lazily only if needed
    const securityClearanceData: SecurityClearanceData = (() => {
        try {
            return JSON.parse(securityListObject);
        } catch {
            return { securityClearanceList: [], host: null } as SecurityClearanceData;
        }
    })();

    // Skip processing if the player is the host
    if (securityClearanceData.host?.id === playerId) {
        return;
    }

    // Handle specific clearance levels
    if (playerClearance === MAX_CLEARANCE) {
        // Verify if the player is in the security clearance list
        const isInSecurityList = securityClearanceData.securityClearanceList.some((playerInfo: PlayerInfo) => playerInfo.id === playerId);

        // Reset clearance if not authorized
        if (!isInSecurityList) {
            player.setDynamicProperty("securityClearance", DEFAULT_CLEARANCE);
        }
    }
}
