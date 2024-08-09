import { world, system, PlayerLeaveAfterEvent, Vector3, Player } from "@minecraft/server";

let currentRunId: number | null = null;

// Initial AFK time in ticks; this will be updated based on the user's input.
let AFK_TIME_TICKS = 12000; // Default: 10 minutes in ticks (20 ticks per second * 60 seconds * 10 minutes)

const playerLastActive: { [playerId: string]: number } = {};
const VELOCITY_THRESHOLD = 0.01; // Threshold for detecting movement

/**
 * Converts hours, minutes, and seconds to ticks.
 *
 * @param {number} hours - The number of hours.
 * @param {number} minutes - The number of minutes.
 * @param {number} seconds - The number of seconds.
 * @returns {number} - The total number of ticks corresponding to the input time.
 */
function convertToTicks(hours: number, minutes: number, seconds: number): number {
    return (hours * 3600 + minutes * 60 + seconds) * 20; // 20 ticks per second
}

/**
 * Checks if the player is AFK based on their velocity.
 *
 * @param {Vector3} velocity - The velocity vector of the player.
 * @returns {boolean} - Returns true if the player's velocity is below the threshold and they are considered AFK.
 */
function isPlayerAFK(velocity: Vector3): boolean {
    return Math.abs(velocity.x) < VELOCITY_THRESHOLD && Math.abs(velocity.y) < VELOCITY_THRESHOLD && Math.abs(velocity.z) < VELOCITY_THRESHOLD;
}

/**
 * Checks if the player's security clearance level should be ignored.
 *
 * @param {Player} player - The player object to check.
 * @returns {boolean} - Returns true if the player's security clearance level equals the ignore level.
 */
function isSecurityClearanceIgnored(player: Player): boolean {
    const clearance = player.getDynamicProperty("securityClearance") as number;
    return clearance === 4;
}

/**
 * Updates the player's last active tick to the current system tick.
 * This function is called when the player is detected as moving.
 *
 * @param {string} playerId - The unique ID of the player.
 * @returns {Promise<void>} - A promise that resolves when the player's activity has been updated.
 */
async function updatePlayerActivity(playerId: string): Promise<void> {
    playerLastActive[playerId] = system.currentTick;
}

/**
 * Checks the AFK status of all players. If a player has been AFK for the defined time,
 * they will receive a message and be removed from the activity tracking.
 *
 * @returns {Promise<void>} - A promise that resolves when the AFK status check is complete.
 */
async function checkAFKStatus(): Promise<void> {
    const currentTick = system.currentTick;

    for (const [playerId, lastActiveTick] of Object.entries(playerLastActive)) {
        const player = world.getPlayers().find((p) => p.id === playerId);
        if (player && !isSecurityClearanceIgnored(player)) {
            if (currentTick - lastActiveTick >= AFK_TIME_TICKS) {
                world.getDimension(player.dimension.id).runCommand(`kick ${player.name} \n\n§l§o§7You have been kicked for being AFK!`);
                delete playerLastActive[playerId];
            }
        }
    }
}

/**
 * Monitors all players in the world and checks their movement status.
 * Updates their activity if they are detected as moving.
 *
 * @returns {Promise<void>} - A promise that resolves when player monitoring is complete.
 */
async function monitorPlayers(): Promise<void> {
    const players = world.getPlayers();

    for (const player of players) {
        const velocity = player.getVelocity();

        // Update only if the player is moving and should not be ignored
        if (!isSecurityClearanceIgnored(player) && (!playerLastActive[player.id] || !isPlayerAFK(velocity))) {
            await updatePlayerActivity(player.id);
        }
    }
}

/**
 * Handles player logout events by removing the player from the activity tracking.
 *
 * @param {PlayerLeaveAfterEvent} event - The event data when a player leaves the game.
 */
function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    delete playerLastActive[event.playerId];
}

/**
 * Starts the AFK checker, which monitors player activity and checks for AFK status periodically.
 * It sets up a system interval to perform the checks and handles player logout events.
 *
 * @param {number} hours - The number of hours before a player is considered AFK.
 * @param {number} minutes - The number of minutes before a player is considered AFK.
 * @param {number} seconds - The number of seconds before a player is considered AFK.
 */
export function startAFKChecker(hours: number = 0, minutes: number = 10, seconds: number = 0): void {
    system.run(() => {
        if (currentRunId !== null) {
            world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
            system.clearRun(currentRunId);
            return;
        }

        AFK_TIME_TICKS = convertToTicks(hours, minutes, seconds);

        world.afterEvents.playerLeave.subscribe(onPlayerLogout);
    });

    let isRunning = false;
    let runIdBackup: number;

    currentRunId = system.runInterval(async () => {
        if (isRunning) {
            currentRunId = runIdBackup;
            return; // Skip this iteration if the previous one is still running
        }

        const moduleKey = "paradoxModules";
        const paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const afkBoolean = paradoxModules["afkCheck_b"] as boolean;

        if (afkBoolean === false) {
            world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
            system.clearRun(currentRunId);
            return;
        }

        runIdBackup = currentRunId;
        isRunning = true;

        await monitorPlayers();
        await checkAFKStatus();
        isRunning = false;
    }, 100); // Check every 5 seconds (100 ticks)
}
