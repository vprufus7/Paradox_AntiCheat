import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { lockdownCommand } from "../commands/moderation/lockdown";
import { MinecraftEnvironment } from "../classes/container/dependencies";
import { startLagClear } from "../modules/lag-clear";
import { startGameModeCheck } from "../modules/game-mode";
import { startWorldBorderCheck } from "../modules/world-border";
import { startFlyCheck } from "../modules/fly";
import { startAFKChecker } from "../modules/afk";
import { initializePvPSystem } from "../modules/pvp-manager";
import { startHitReachCheck } from "../modules/reach";
import { startAutoClicker } from "../modules/autoclicker";
import { startKillAuraCheck } from "../modules/killaura";
import { startScaffoldCheck } from "../modules/scaffold";
import { startNamespoofDetection } from "../modules/namespoof";
import { startXrayDetection } from "../modules/xray";

// Store the lockDownMonitor function reference
let lockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;
let wrappedLockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;

/**
 * Migrates outdated keys in paradoxModules to their updated versions based on a given mapping.
 */
function migrateParadoxModulesKeys(migrations: { [oldKey: string]: string }) {
    const moduleKey = "paradoxModules";
    const getParadoxModules = world.getDynamicProperty(moduleKey) as string;
    let paradoxModules: { [key: string]: any } = getParadoxModules ? JSON.parse(getParadoxModules) : {};

    if (typeof paradoxModules === "object" && paradoxModules !== null) {
        let updated = false;

        for (const [oldKey, newKey] of Object.entries(migrations)) {
            // Check if the old key exists
            if (paradoxModules[oldKey] !== undefined) {
                // Rename the key to the new key
                paradoxModules[newKey] = paradoxModules[oldKey];
                delete paradoxModules[oldKey]; // Remove the old key
                updated = true;
            }
        }

        // Save the updated paradoxModules back to dynamic property if changes were made
        if (updated) {
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
        }
    }
}

/**
 * Initializes and updates paradoxModules from the world dynamic property.
 * Starts corresponding modules based on their configured values.
 */
function initializeParadoxModules() {
    /**
     * A mapping of outdated keys to their updated versions for `paradoxModules`.
     * This is used to ensure backward compatibility when key names are updated.
     *
     * @example
     * const keyMigrations = {
     *     platformBlockSettings: "platformBlock_settings", // Renames platformBlockSettings to platformBlock_settings
     *     oldSetting1: "newSetting1", // Renames oldSetting1 to newSetting1
     *     oldSetting2: "newSetting2", // Renames oldSetting2 to newSetting2
     * };
     */
    const keyMigrations = {
        platformBlockSettings: "platformBlock_settings",
    };

    // Migrate outdated keys first
    migrateParadoxModulesKeys(keyMigrations);

    // Retrieve and update module state
    const moduleKey = "paradoxModules";
    const getParadoxModules = world.getDynamicProperty(moduleKey) as string;
    let paradoxModules: { [key: string]: boolean | { hours: number; minutes: number; seconds: number } } = getParadoxModules ? JSON.parse(getParadoxModules) : null;

    // Ensure paradoxModules is initialized with an empty object if it doesn't exist
    if (typeof paradoxModules !== "object" || paradoxModules === null) {
        paradoxModules = {};
        world.setDynamicProperty("paradoxModules", JSON.stringify(paradoxModules));
    }

    // Iterate over the properties and start corresponding modules if their value is true
    system.run(() => {
        for (const [key, value] of Object.entries(paradoxModules)) {
            switch (key) {
                case "lagClearCheck_b":
                    if (value === true) {
                        const settings = (paradoxModules["lagClear_settings"] as { hours: number; minutes: number; seconds: number }) || { hours: 0, minutes: 5, seconds: 0 };
                        startLagClear(settings.hours, settings.minutes, settings.seconds);
                    }
                    break;
                case "gamemodeCheck_b":
                    if (value === true) {
                        startGameModeCheck();
                    }
                    break;
                case "worldBorderCheck_b":
                    if (value === true) {
                        startWorldBorderCheck();
                    }
                    break;
                case "flyCheck_b":
                    if (value === true) {
                        startFlyCheck();
                    }
                    break;
                case "afkCheck_b":
                    if (value === true) {
                        const settings = (paradoxModules["afk_settings"] as { hours: number; minutes: number; seconds: number }) || { hours: 0, minutes: 10, seconds: 0 };
                        startAFKChecker(settings.hours, settings.minutes, settings.seconds);
                    }
                    break;
                case "hitReachCheck_b":
                    if (value === true) {
                        startHitReachCheck();
                    }
                    break;
                case "autoClickerCheck_b":
                    if (value === true) {
                        startAutoClicker();
                    }
                    break;
                case "killAuraCheck_b":
                    if (value === true) {
                        startKillAuraCheck();
                    }
                    break;
                case "scaffoldCheck_b":
                    if (value === true) {
                        startScaffoldCheck();
                    }
                    break;
                case "nameSpoofCheck_b":
                    if (value === true) {
                        startNamespoofDetection();
                    }
                    break;
                case "xrayDetection_b":
                    if (value === true) {
                        startXrayDetection();
                    }
                    break;
                // Add more cases for other modules here
                default:
                    // Handle unknown properties or log them if needed
                    // console.warn(`§2[§7Paradox§2]§o§7 Unknown module property: ${key}`);
                    break;
            }
        }
    });
}

/**
 * Subscribes to the lockdown event and sets up a monitor for player spawns.
 * If lockdown is active, the player spawn event will be handled by the lockdown monitor.
 */
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

/**
 * Unsubscribes from the lockdown event and cleans up references to monitoring functions.
 * Stops handling player spawn events for lockdown if no longer active.
 */
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

/**
 * Checks if lockdown is active and subscribes to the lockdown events if so.
 */
function handleLockDown() {
    const isLockdownActive = world.getDynamicProperty("lockdown_b");
    if (isLockdownActive) {
        subscribeToLockDown();
    }
}

/**
 * Checks if PvP is globally enabled and initializes the PvP system if so.
 * Sets the PvP game rule to true if the dynamic property is enabled.
 */
function handlePvP() {
    const isPvPGlobalEnabled = world.getDynamicProperty("pvpGlobalEnabled") ?? false;

    if (isPvPGlobalEnabled) {
        // Ensure the game rule is set to true if PvP is enabled globally
        world.gameRules.pvp = true;

        // Initialize the PvP system
        initializePvPSystem();
    }
}

/**
 * Initializes paradoxModules and handles lockdown on world initialization.
 */
function onWorldInitialize() {
    initializeParadoxModules(); // Ensure paradoxModules is initialized and modules are started
    handleLockDown(); // Handle lockdown if it's active
    handlePvP(); // Handle PvP if it's enabled
}

/**
 * Subscribes to the world initialization event.
 * Sets up paradoxModules and handles lockdown when the world initializes.
 */
export function subscribeToWorldInitialize() {
    world.afterEvents.worldInitialize.subscribe(onWorldInitialize);
}
