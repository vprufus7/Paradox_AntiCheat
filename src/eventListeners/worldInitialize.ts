import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { lockdownCommand } from "../commands/moderation/lockdown";
import { MinecraftEnvironment } from "../classes/container/Dependencies";
import { LagClear } from "../modules/lagclear";

// Store the lockDownMonitor function reference
let lockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;
let wrappedLockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;

function initializeParadoxModules() {
    // Retrieve and update module state
    const moduleKey = "paradoxModules";
    let paradoxModules: { [key: string]: boolean | { hours: number; minutes: number; seconds: number } } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

    // Ensure paradoxModules is initialized with an empty object if it doesn't exist
    if (typeof paradoxModules !== "object" || paradoxModules === null) {
        paradoxModules = {};
        world.setDynamicProperty("paradoxModules", JSON.stringify(paradoxModules));
    }

    // Iterate over the properties and start corresponding modules if their value is true
    for (const [key, value] of Object.entries(paradoxModules)) {
        switch (key) {
            case "lagclear_b":
                if (value === true) {
                    const settings = (paradoxModules["lagclear_settings"] as { hours: number; minutes: number; seconds: number }) || { hours: 0, minutes: 5, seconds: 0 };
                    LagClear(settings.hours, settings.minutes, settings.seconds);
                }
                break;
            // Add more cases for other modules here
            default:
                // Handle unknown properties or log them if needed
                // console.warn(`§o§7Unknown module property: ${key}`);
                break;
        }
    }
}

function subscribeToLockDown() {
    const environment = MinecraftEnvironment.getInstance();
    lockDownMonitor = lockdownCommand.execute(undefined, undefined, environment, undefined, true) as (event: PlayerSpawnAfterEvent) => void;
    if (lockDownMonitor) {
        wrappedLockDownMonitor = (event: PlayerSpawnAfterEvent) => {
            const isLockdownActive = world.getDynamicProperty("lockdown_b");
            if (!isLockdownActive) {
                unsubscribeFromLockDown();
                return;
            }
            lockDownMonitor(event); // Call the original lockDownMonitor
        };
        world.afterEvents.playerSpawn.subscribe(wrappedLockDownMonitor);
    }
}

function unsubscribeFromLockDown() {
    system.run(() => {
        if (wrappedLockDownMonitor) {
            world.afterEvents.playerSpawn.unsubscribe(wrappedLockDownMonitor);
            wrappedLockDownMonitor = undefined; // Clear the reference
        }
        lockDownMonitor = undefined; // Clear the reference to the original function
        world.afterEvents.worldInitialize.unsubscribe(onWorldInitialize);
    });
}

function handleLockDown() {
    const isLockdownActive = world.getDynamicProperty("lockdown_b");
    if (isLockdownActive) {
        subscribeToLockDown();
    }
}

function onWorldInitialize() {
    initializeParadoxModules(); // Ensure paradoxModules is initialized and modules are started
    handleLockDown();
}

export function subscribeToWorldInitialize() {
    world.afterEvents.worldInitialize.subscribe(onWorldInitialize);
}
