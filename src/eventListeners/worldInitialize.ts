import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { lockdownCommand } from "../commands/moderation/lockdown";
import { MinecraftEnvironment } from "../classes/container/Dependencies";

// Store the lockDownMonitor function reference
let lockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;
let wrappedLockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;

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
    handleLockDown();
}

export function subscribeToWorldInitialize() {
    world.afterEvents.worldInitialize.subscribe(onWorldInitialize);
}
