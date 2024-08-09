import { world, system, ItemTypes } from "@minecraft/server";

const object = { cooldown: "String" };

// WeakMap to store cooldown times
const cooldownTimer = new WeakMap<typeof object, number>();

// Store the job ID to clear it when needed
let lagClearJobId: number | null = null;

/**
 * Generator function for lag clearing tasks.
 * Sends countdown messages and performs lag clearing when the countdown ends.
 * @param {number} endTick - The tick when the next lag clear is scheduled to occur.
 * @param {Object} clockSettings - The time settings for the countdown.
 * @param {number} clockSettings.hours - The number of hours for the countdown.
 * @param {number} clockSettings.minutes - The number of minutes for the countdown.
 * @param {number} clockSettings.seconds - The number of seconds for the countdown.
 * @yields {void} - Yields control to allow other tasks to run.
 */
function* lagClearGenerator(endTick: number, clockSettings: { hours: number; minutes: number; seconds: number }): Generator<void, void, unknown> {
    const moduleKey = "paradoxModules";
    const messageIntervals = [60, 5, 4, 3, 2, 1]; // List of countdown intervals to send messages
    let lastMessageIndex = -1; // To keep track of the last message index sent

    while (true) {
        const paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const lagClearBoolean = paradoxModules["lagclear_b"] as boolean;

        if (lagClearBoolean === false) {
            // Stop the generator if lag clear is disabled
            if (lagClearJobId !== null) {
                system.clearJob(lagClearJobId);
                lagClearJobId = null; // Clear the stored job ID
            }
            return;
        }

        const currentTick = system.currentTick;
        const ticksLeft = endTick - currentTick;

        if (ticksLeft <= 0) {
            // Time's up, clear items and entities
            clearEntityItems();
            clearEntities();
            world.sendMessage(`§4[§6Paradox§4]§o§7 Server lag has been cleared!`);

            cooldownTimer.set(object, currentTick);

            // Restart the timer with updated endTick
            const newEndTick = currentTick + (clockSettings.hours * 72000 + clockSettings.minutes * 1200 + clockSettings.seconds * 20);
            endTick = newEndTick; // Update endTick for next iteration
            lastMessageIndex = -1; // Reset the message index for new countdown
        } else {
            const secondsLeft = Math.round(ticksLeft / 20);
            const nextMessageIndex = messageIntervals.findIndex((interval) => interval === secondsLeft);

            if (nextMessageIndex !== -1 && nextMessageIndex !== lastMessageIndex) {
                const message = `${messageIntervals[nextMessageIndex]} second${messageIntervals[nextMessageIndex] > 1 ? "s" : ""}`;
                world.sendMessage(`§4[§6Paradox§4]§o§7 Server lag will be cleared in ${message}!`);
                lastMessageIndex = nextMessageIndex; // Update last message index
            }
            yield; // Yield to allow other tasks to run
        }
    }
}

/**
 * Clears items in the overworld.
 * Iterates over item entities and removes them if they are valid items.
 */
async function clearEntityItems() {
    const filter = { type: "item" };
    const entitiesCache = world.getDimension("overworld").getEntities(filter);
    for (const entity of entitiesCache) {
        const itemName = entity.getComponent("item");
        if (itemName && ItemTypes.getAll().includes(itemName.itemStack.type)) {
            entity.remove();
        }
    }
}

/**
 * Clears entities in the overworld.
 * Iterates over non-exception entities and removes them if they are monsters without name tags.
 */
async function clearEntities() {
    const entityException = ["minecraft:ender_dragon", "minecraft:shulker", "minecraft:hoglin", "minecraft:zoglin", "minecraft:piglin_brute", "minecraft:evocation_illager", "minecraft:vindicator", "minecraft:elder_guardian"];
    const filter = { families: ["monster"] };
    const entitiesCache = world.getDimension("overworld").getEntities(filter);
    for (const entity of entitiesCache) {
        if (!entityException.includes(entity.typeId) && !entity.nameTag) {
            entity.remove();
        }
    }
}

/**
 * Initializes and manages the lag clear job.
 * Sets up a job to run the lag clear generator with the specified countdown settings.
 * @param {number} [hours=0] - The number of hours for the countdown.
 * @param {number} [minutes=5] - The number of minutes for the countdown.
 * @param {number} [seconds=0] - The number of seconds for the countdown.
 */
export function LagClear(hours: number = 0, minutes: number = 5, seconds: number = 0) {
    const clockSettings = { hours, minutes, seconds };
    const totalTicks = hours * 72000 + minutes * 1200 + seconds * 20;
    const endTick = system.currentTick + totalTicks;

    // Clear any existing job before starting a new one
    if (lagClearJobId !== null) {
        system.clearJob(lagClearJobId);
    }

    system.run(() => {
        lagClearJobId = system.runJob(lagClearGenerator(endTick, clockSettings));
    });
}
