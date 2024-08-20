import { Vector3Builder, Vector3Utils } from "../node_modules/@minecraft/math/dist/minecraft-math";
import { world, Player, system, EntityHitEntityAfterEvent } from "@minecraft/server";

// Configuration Constants
const MAX_ATTACKS_PER_SECOND = 14; // Maximum allowed attacks per second
const MAX_ATTACK_DISTANCE = 4.5; // Increased maximum attack distance (in blocks)
const MAX_ORIENTATION_DIFFERENCE = 60; // Increased maximum allowed angle difference (in degrees) between player's view and the target
const BUFFER_SIZE = 10; // Increased buffer size for storing recent attack times

// Interface for player attack information
interface PlayerData {
    lastAttackTime: number; // The tick time of the last attack
    attackTimes: number[]; // Array of time differences between consecutive attacks
    attackCount: number; // Number of consecutive attacks within the specified time frame
}

// Map to store player attack information
const playerData: Map<string, PlayerData> = new Map();

/**
 * Handles the entity hit event to detect killaura behavior.
 *
 * @param {EntityHitEntityAfterEvent} event - The entity hit event.
 */
function onEntityHit(event: EntityHitEntityAfterEvent) {
    const moduleKey = "paradoxModules";
    const paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
    const isKillAuraCheckEnabled = paradoxModules["killAuraCheck_b"] as boolean;

    if (isKillAuraCheckEnabled === false) {
        world.afterEvents.entityHitEntity.unsubscribe(onEntityHit);
        return;
    }

    const attacker = event.damagingEntity;
    const target = event.hitEntity;

    // Only proceed if the attacker and target are players
    if (!(attacker instanceof Player) || !(target instanceof Player)) return;

    const currentTime = system.currentTick;
    let data = playerData.get(attacker.nameTag);

    // Initialize player data if not already present
    if (!data) {
        data = { lastAttackTime: 0, attackTimes: [], attackCount: 0 };
        playerData.set(attacker.nameTag, data);
    }

    const timeDifference = currentTime - data.lastAttackTime;
    const attackerLocation = new Vector3Builder(attacker.location.x, attacker.location.y, attacker.location.z);
    const targetLocation = new Vector3Builder(target.location.x, target.location.y, target.location.z);
    const distance = Vector3Utils.distance(attackerLocation, targetLocation);
    const isFacingTarget = checkIfFacingEntity(attacker, target);

    // Detect killaura behavior based on attack conditions
    if (timeDifference < 1000 / MAX_ATTACKS_PER_SECOND && distance <= MAX_ATTACK_DISTANCE && isFacingTarget) {
        data.attackTimes.push(timeDifference);

        // Maintain the buffer size for attack times
        if (data.attackTimes.length > BUFFER_SIZE) {
            data.attackTimes.shift();
        }

        data.attackCount++;
    } else {
        // Reset the attack count and buffer if conditions are not met
        data.attackCount = 1;
        data.attackTimes = [timeDifference];
    }

    // Flag player for suspicious killaura behavior
    if (data.attackCount >= MAX_ATTACKS_PER_SECOND && isSuspiciousAttackPattern(data.attackTimes)) {
        const healthComponentVictim = target.getComponent("health");

        // Get or initialize the victim's health
        let previousHealth = target.getDynamicProperty("paradoxCurrentHealth") as number;
        if (previousHealth === undefined) {
            previousHealth = healthComponentVictim.currentValue;
            target.setDynamicProperty("paradoxCurrentHealth", previousHealth);
        }

        // Restore the victim's health
        const healthDifference = previousHealth - healthComponentVictim.currentValue;
        healthComponentVictim.setCurrentValue(healthComponentVictim.currentValue + healthDifference);

        // Update the dynamic property with the new health value
        target.setDynamicProperty("paradoxCurrentHealth", healthComponentVictim.currentValue);
    }

    data.lastAttackTime = currentTime;
}

/**
 * Checks if the attacker is facing the target entity within a specified angle.
 *
 * @param {Player} attacker - The player attacking the target.
 * @param {Player} target - The target entity being attacked.
 * @returns {boolean} - True if the attacker is facing the target within the angle threshold.
 */
function checkIfFacingEntity(attacker: Player, target: Player): boolean {
    const attackerDirection = attacker.getViewDirection();
    const attackerVector = new Vector3Builder(attackerDirection.x, attackerDirection.y, attackerDirection.z);
    const targetVector = new Vector3Builder(target.location.x - attacker.location.x, target.location.y - attacker.location.y, target.location.z - attacker.location.z).normalize();

    const dotProduct = Vector3Utils.dot(attackerVector, targetVector);
    const angle = Math.acos(dotProduct) * (180 / Math.PI);

    return angle <= MAX_ORIENTATION_DIFFERENCE;
}

/**
 * Analyzes the pattern of recent attack times to determine if the behavior is suspicious.
 *
 * @param {number[]} attackTimes - Array of time differences between consecutive attacks.
 * @returns {boolean} - True if the attack pattern is suspicious.
 */
function isSuspiciousAttackPattern(attackTimes: number[]): boolean {
    const averageTime = attackTimes.reduce((a, b) => a + b, 0) / attackTimes.length;
    return averageTime < 1000 / MAX_ATTACKS_PER_SECOND; // Threshold for suspicious behavior
}

/**
 * Subscribes to the entity hit event for killaura detection.
 */
export function initializeKillAura() {
    system.run(() => {
        world.afterEvents.entityHitEntity.subscribe(onEntityHit);
    });
}
