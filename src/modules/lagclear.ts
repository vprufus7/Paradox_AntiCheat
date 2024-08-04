import { world, system, ItemTypes } from "@minecraft/server";

const object = { cooldown: "String" };

// WeakMap to store cooldown times
const cooldownTimer = new WeakMap<typeof object, number>();

// Store the interval ID to clear it when needed
let lagClearIntervalId: number | null = null;

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

function lagClear(id: number, endTime: number, clockSettings: { hours: number; minutes: number; seconds: number }) {
    const moduleKey = "paradoxModules";
    const paradoxModules = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
    const lagClearBoolean = paradoxModules["lagclear_b"];

    if (lagClearBoolean === false) {
        if (id !== lagClearIntervalId) {
            system.clearRun(id);
        }
        return;
    }

    const now = Date.now();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
        clearEntityItems();
        clearEntities();
        world.sendMessage(`§4[§6Paradox§4]§o§7 Server lag has been cleared!`);

        cooldownTimer.set(object, now);

        // Restart the timer with updated endTime
        const newEndTime = Date.now() + (clockSettings.hours * 60 * 60 * 1000 + clockSettings.minutes * 60 * 1000 + clockSettings.seconds * 1000);
        if (lagClearIntervalId !== null) {
            system.clearRun(lagClearIntervalId);
        }
        lagClearIntervalId = system.runInterval(() => {
            lagClear(lagClearIntervalId, newEndTime, clockSettings);
        }, 20);
    } else {
        const timeLeftSeconds = Math.round(timeLeft / 1000);
        if (timeLeftSeconds <= 60) {
            const messages: { [key: number]: string } = {
                60: "1 minute",
                5: "5 seconds",
                4: "4 seconds",
                3: "3 seconds",
                2: "2 seconds",
                1: "1 second",
            };
            const message = messages[timeLeftSeconds as keyof typeof messages];
            if (message) {
                world.sendMessage(`§4[§6Paradox§4]§o§7 Server lag will be cleared in ${message}!`);
            }
        }
    }
}

export function LagClear(hours: number = 0, minutes: number = 5, seconds: number = 0) {
    const clockSettings = { hours, minutes, seconds };
    const msSettings = hours * 60 * 60 * 1000 + minutes * 60 * 1000 + seconds * 1000;
    const endTime = Date.now() + msSettings;

    // Clear any existing interval before starting a new one
    if (lagClearIntervalId !== null) {
        system.clearRun(lagClearIntervalId);
    }

    lagClearIntervalId = system.runInterval(() => {
        lagClear(lagClearIntervalId, endTime, clockSettings);
    }, 20);
}
