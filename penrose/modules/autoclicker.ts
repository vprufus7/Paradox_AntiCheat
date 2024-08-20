import { world, Player, EntityHitEntityAfterEvent, system } from "@minecraft/server";

// Define constants
const MAX_CPS = 14; // Maximum allowed clicks per second
const TICKS_PER_SECOND = 20; // Number of ticks in one second
const CLICK_HISTORY_SIZE = 100; // Maximum size of the click history array

// Define interface for player click tracking
interface Click {
    tick: number; // The tick at which the click occurred
}

interface PlayerWithClicks extends Player {
    clicks?: Click[]; // Array to store click timestamps
}

/**
 * Calculate the number of clicks per second for a player.
 * @param player - The player whose CPS is to be calculated.
 * @returns The number of clicks per second.
 */
function calculateClicksPerSecond(player: PlayerWithClicks): number {
    const currentTick = system.currentTick;
    const clicks = player.clicks ?? [];

    // Count clicks within the last second
    let recentClicksCount = 0;
    for (const click of clicks) {
        if (currentTick - click.tick < TICKS_PER_SECOND) {
            recentClicksCount++;
        }
    }

    return recentClicksCount;
}

/**
 * Validate the player's clicks per second and handle victim's health restoration if CPS exceeds the limit.
 * @param player - The player whose CPS is to be validated.
 * @param victim - The entity that was hit by the player.
 */
function validateAndRestoreHealth(player: PlayerWithClicks, victim: Player): void {
    const cps = calculateClicksPerSecond(player);
    if (cps > MAX_CPS) {
        // Get the victim's health component
        const healthComponent = victim.getComponent("health");
        if (healthComponent) {
            // Retrieve or initialize the victim's health before the attack
            let initialHealth = victim.getDynamicProperty("paradoxCurrentHealth") as number;
            if (initialHealth === undefined) {
                initialHealth = healthComponent.currentValue;
                victim.setDynamicProperty("paradoxCurrentHealth", initialHealth);
            }

            const currentHealth = healthComponent.currentValue;
            const healthLost = initialHealth - currentHealth;
            // Restore the victim's health to the initial value
            const restoredHealth = currentHealth + healthLost;

            healthComponent.setCurrentValue(restoredHealth);
            victim.setDynamicProperty("paradoxCurrentHealth", restoredHealth);
        }
    }
}

/**
 * Track clicks made by a player and update the click history.
 * @param event - The event containing information about the hit.
 */
function handleClickEvent(event: EntityHitEntityAfterEvent): void {
    const moduleKey = "paradoxModules";
    const paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
    const autoClickerBoolean = paradoxModules["autoCLickerCheck_b"] as boolean;

    if (autoClickerBoolean === false) {
        world.afterEvents.entityHitEntity.unsubscribe(handleClickEvent);
        return;
    }
    const { damagingEntity, hitEntity } = event;

    // Proceed only if both entities involved are players
    if (!(damagingEntity instanceof Player && hitEntity instanceof Player)) {
        return;
    }

    const attacker = damagingEntity as PlayerWithClicks;
    const victim = hitEntity as Player;

    // Update attacker's click history
    const currentTick = system.currentTick;
    if (!attacker.clicks) {
        attacker.clicks = [];
    }
    attacker.clicks.unshift({ tick: currentTick });

    // Trim click history to maintain size
    if (attacker.clicks.length > CLICK_HISTORY_SIZE) {
        attacker.clicks.pop();
    }

    // Validate CPS and restore victim's health if necessary
    validateAndRestoreHealth(attacker, victim);
}

/**
 * Initialize the AutoClicker functionality by subscribing to the entity hit event.
 */
export function initializeAutoClicker(): void {
    // Subscribe to the entityHit event to track player clicks
    system.run(() => {
        world.afterEvents.entityHitEntity.subscribe(handleClickEvent);
    });
}
