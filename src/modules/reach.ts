import { world, Player, system } from "@minecraft/server";

// Configuration constants
const MAX_ATTACK_DISTANCE = 4.5;
const HISTORY_SIZE = 10; // Number of recent positions to keep
const playerData = new Map<string, PlayerData>();

interface Position {
    x: number;
    y: number;
    z: number;
}

interface PlayerData {
    history: PlayerHistoryEntry[];
}

interface PlayerHistoryEntry {
    position: Position;
    velocity: Position;
    timestamp: number;
}

/**
 * Calculate the Euclidean distance between two positions.
 * @param pos1 - The first position.
 * @param pos2 - The second position.
 * @returns The Euclidean distance between the two positions.
 */
function calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

/**
 * Perform cubic interpolation to estimate a position based on four points.
 * @param p0 - The position at time t-1.
 * @param p1 - The position at time t.
 * @param p2 - The position at time t+1.
 * @param p3 - The position at time t+2.
 * @param t - The interpolation factor (0 <= t <= 1).
 * @returns The interpolated position.
 */
function cubicInterpolate(p0: Position, p1: Position, p2: Position, p3: Position, t: number): Position {
    const t2 = t * t;
    const t3 = t2 * t;
    const result: Position = {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
    };

    return result;
}

/**
 * Update the stored player data with the latest position and velocity.
 * @param player - The player whose data is being updated.
 */
function updatePlayerData(player: Player): void {
    const currentTick = system.currentTick;
    const currentPosition = player.location;
    const currentVelocity = player.getVelocity();
    let data = playerData.get(player.name);
    if (!data) {
        data = { history: [] };
        playerData.set(player.name, data);
    }

    data.history.push({ position: currentPosition, velocity: currentVelocity, timestamp: currentTick });

    if (data.history.length > HISTORY_SIZE) {
        data.history.shift();
    }

    // Ensure the dynamic property for health is set
    if (player.getDynamicProperty("paradoxCurrentHealth") === undefined) {
        const healthComponent = player.getComponent("health");
        if (healthComponent) {
            player.setDynamicProperty("paradoxCurrentHealth", healthComponent.currentValue);
        }
    }
}

/**
 * Estimate the position of the player at a given hit time using cubic interpolation.
 * @param player - The player whose position is being estimated.
 * @param hitTime - The target time to estimate the player's position.
 * @returns The estimated position of the player, or undefined if not enough data is available.
 */
function estimatePositionUsingInterpolation(player: Player, hitTime: number): Position | undefined {
    const data = playerData.get(player.name);
    if (!data || data.history.length < 4) return undefined;

    const [p0, p1, p2, p3] = data.history;

    // Calculate timeRatio
    const timeRatio = (hitTime - p1.timestamp) / (p2.timestamp - p1.timestamp);

    // Handle cases where timeRatio is out of range
    if (timeRatio <= 0) {
        return p1.position;
    } else if (timeRatio >= 1) {
        return p2.position;
    }

    return cubicInterpolate(p0.position, p1.position, p2.position, p3.position, timeRatio);
}

/**
 * Initialize the entity hit detection system.
 */
export function initializeEntityHitDetection(): void {
    system.runInterval(() => {
        const PLAYERS = world.getPlayers();
        for (const player of PLAYERS) {
            updatePlayerData(player);
        }
    }, 1);

    world.afterEvents.entityHitEntity.subscribe((eventData) => {
        const currentTick = system.currentTick;
        const attacker = eventData.damagingEntity;
        const victim = eventData.hitEntity;

        if (attacker instanceof Player && victim instanceof Player) {
            const attackerPosition = attacker.location;
            const victimPosition = victim.location;

            // Get the victim's health component
            const healthComponentVictim = victim.getComponent("health");
            if (healthComponentVictim) {
                // Get the victim's health before the attack
                let beforeHealthVictim = victim.getDynamicProperty("paradoxCurrentHealth") as number;
                if (beforeHealthVictim === undefined) {
                    // Initialize the dynamic property if it is not defined
                    beforeHealthVictim = healthComponentVictim.currentValue;
                    victim.setDynamicProperty("paradoxCurrentHealth", beforeHealthVictim);
                }

                // Estimate the attacker’s position at the time of hit
                const estimatedPosition = estimatePositionUsingInterpolation(attacker, currentTick - 1);
                if (estimatedPosition) {
                    const distance = calculateDistance(attackerPosition, victimPosition);
                    // Determine the health loss if the attack distance is greater than allowed
                    if (distance > MAX_ATTACK_DISTANCE) {
                        const currentHealthVictim = healthComponentVictim.currentValue;
                        const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
                        // Calculate to restore taken health
                        const restoreHealthVictim = currentHealthVictim + healthDiffVictim;

                        // Restore the victim's lost health
                        healthComponentVictim.setCurrentValue(restoreHealthVictim);

                        // Update the dynamic property with the new health value
                        victim.setDynamicProperty("paradoxCurrentHealth", healthComponentVictim.currentValue);
                    }
                }
            }
        }
    });
}
