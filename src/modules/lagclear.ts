import { world, system, ItemTypes } from "@minecraft/server";

const object = { cooldown: "String" };

// WeakMap to store cooldown times
const cooldownTimer = new WeakMap<typeof object, number>();

// Store the job ID to clear it when needed
let lagClearJobId: number | null = null;

/**
 * Generator function for lag clearing tasks
 */
function* lagClearGenerator(endTime: number, clockSettings: { hours: number; minutes: number; seconds: number }): Generator<void, void, unknown> {
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

        const now = Date.now();
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
            // Time's up, clear items and entities
            clearEntityItems();
            clearEntities();
            world.sendMessage(`§4[§6Paradox§4]§o§7 Server lag has been cleared!`);

            cooldownTimer.set(object, now);

            // Restart the timer with updated endTime
            const newEndTime = Date.now() + (clockSettings.hours * 60 * 60 * 1000 + clockSettings.minutes * 60 * 1000 + clockSettings.seconds * 1000);
            endTime = newEndTime; // Update endTime for next iteration
            lastMessageIndex = -1; // Reset the message index for new countdown
        } else {
            const timeLeftSeconds = Math.round(timeLeft / 1000);
            const nextMessageIndex = messageIntervals.findIndex((interval) => interval === timeLeftSeconds);

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
 */
export function LagClear(hours: number = 0, minutes: number = 5, seconds: number = 0) {
    const clockSettings = { hours, minutes, seconds };
    const msSettings = hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000;
    const endTime = Date.now() + msSettings;

    // Clear any existing job before starting a new one
    if (lagClearJobId !== null) {
        system.clearJob(lagClearJobId);
    }

    system.run(() => {
        lagClearJobId = system.runJob(lagClearGenerator(endTime, clockSettings));
    });
}
