import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { lockdownCommand } from "../commands/moderation/lockdown";
import { MinecraftEnvironment } from "../classes/container/dependencies";
import { LagClear } from "../modules/lag-clear";
import { GameModeInspection } from "../modules/game-mode";
import { WorldBorder } from "../modules/world-border";
import { FlyCheck } from "../modules/fly";
import { startAFKChecker } from "../modules/afk";
import { initializePvPSystem } from "../modules/pvp-manager";
import { InitializeEntityHitDetection } from "../modules/reach";
import { initializeAutoClicker } from "../modules/autoclicker";
import { initializeKillAura } from "../modules/killaura";
import { initScaffoldDetection } from "../modules/scaffold";

// Store the lockDownMonitor function reference
let lockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;
let wrappedLockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;

/**
 * Initializes and updates paradoxModules from the world dynamic property.
 * Starts corresponding modules based on their configured values.
 */
function initializeParadoxModules() {
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
    for (const [key, value] of Object.entries(paradoxModules)) {
        switch (key) {
            case "lagClearCheck_b":
                if (value === true) {
                    const settings = (paradoxModules["lagClear_settings"] as { hours: number; minutes: number; seconds: number }) || { hours: 0, minutes: 5, seconds: 0 };
                    LagClear(settings.hours, settings.minutes, settings.seconds);
                }
                break;
            case "gamemodeCheck_b":
                if (value === true) {
                    GameModeInspection();
                }
                break;
            case "worldBorderCheck_b":
                if (value === true) {
                    WorldBorder();
                }
                break;
            case "flyCheck_b":
                if (value === true) {
                    FlyCheck();
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
                    InitializeEntityHitDetection();
                }
                break;
            case "autoClickerCheck_b":
                if (value === true) {
                    initializeAutoClicker();
                }
                break;
            case "killAuraCheck_b":
                if (value === true) {
                    initializeKillAura();
                }
                break;
            case "scaffoldCheck_b":
                if (value === true) {
                    initScaffoldDetection();
                }
                break;
            // Add more cases for other modules here
            default:
                // Handle unknown properties or log them if needed
                // console.warn(`§2[§7Paradox§2]§o§7 Unknown module property: ${key}`);
                break;
        }
    }
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
 */
function handlePvP() {
    const pvpSetting = world.getDynamicProperty("pvpGlobalEnabled") as boolean;
    if (pvpSetting === undefined) {
        world.setDynamicProperty("pvpGlobalEnabled", world.gameRules.pvp);
    }
    const isPvPGlobalEnabled = pvpSetting || world.gameRules.pvp;
    if (isPvPGlobalEnabled) {
        initializePvPSystem(); // Initialize the PvP system
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
