import { world, GameMode, system, Vector3, Player } from "@minecraft/server";

let currentJobId: number | null = null;
let currentRunId: number | null = null;

/**
 * Generates a random offset value within the range [-10, 10].
 * @returns {number} A random offset value.
 */
function getRandomOffset(): number {
    return Math.random() * 20 - 10;
}

/**
 * Gets randomized coordinates within a radius of 10 blocks from the player's current location.
 * @param {Player} player - The player whose location is used to calculate randomized coordinates.
 * @returns {Vector3} A vector representing the randomized coordinates.
 */
function getRandomizedCoordinates(player: Player): Vector3 {
    const { x, y, z } = player.location;
    const randomizedX = x + getRandomOffset();
    const randomizedY = y + getRandomOffset();
    const randomizedZ = z + getRandomOffset();
    return { x: randomizedX, y: randomizedY, z: randomizedZ };
}

/**
 * Generator function to check players' flying status and teleport if necessary.
 * @generator
 * @yields {void} Pauses the generator after processing each player.
 */
function* flyCheckGenerator(): Generator<void, void, unknown> {
    const moduleKey = "paradoxModules";

    // Retrieve the current dynamic properties for world border settings
    const paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

    const flyCheckBoolean = paradoxModules["flyCheck_b"] as boolean;
    // Unsubscribe if disabled in-game
    if (flyCheckBoolean === false) {
        system.clearJob(currentJobId);
        system.clearRun(currentRunId);
        return;
    }

    // Exclude creative and spectator game modes
    const gm = {
        excludeGameModes: [GameMode.creative, GameMode.spectator],
    };
    const filteredPlayers = world.getPlayers(gm);

    // Run as each player who is in survival and adventure
    for (const player of filteredPlayers) {
        if (player && (player.getDynamicProperty("securityClearance") as number) === 4) {
            continue;
        }
        const fallCheck = player.isFalling;
        const flyCheck = player.isFlying;
        const currentGameMode = player.getGameMode();

        if (!fallCheck && flyCheck && (currentGameMode === GameMode.survival || currentGameMode === GameMode.adventure)) {
            // Teleport the player to randomized coordinates within a radius of 10
            const randomizedCoords = getRandomizedCoordinates(player);
            player.teleport(randomizedCoords, {
                dimension: player.dimension,
                rotation: { x: randomizedCoords.x, y: randomizedCoords.y },
                facingLocation: { x: randomizedCoords.x, y: randomizedCoords.y, z: randomizedCoords.z },
                checkForBlocks: true,
                keepVelocity: false,
            });
        }
        // Yield after processing each player to allow the generator to pause and resume
        yield;
    }
}

/**
 * Executes the flyCheck generator function with a promise-based approach.
 * This ensures that the fly check job is completed before starting a new one.
 * @returns {Promise<void>} A promise that resolves once the fly check job is finished.
 */
async function executeFlyCheck(): Promise<void> {
    if (currentJobId !== null) {
        // Clear any existing job before starting a new one
        system.clearJob(currentJobId);
    }

    const jobPromise = new Promise<void>((resolve) => {
        function* jobRunner() {
            yield* flyCheckGenerator();
            resolve(); // Resolve the promise once the generator is done
        }
        currentJobId = system.runJob(jobRunner());
    });

    await jobPromise; // Wait for the current job to finish
}

/**
 * Starts the fly check process and schedules it to run at regular intervals.
 * Ensures that only one instance of the fly check process runs at a time.
 */
export async function FlyCheck(): Promise<void> {
    if (currentRunId !== null) {
        // Clear any existing run before starting a new one
        system.clearRun(currentRunId);
    }

    let isRunning = false;
    let runIdBackup: number;

    currentRunId = system.runInterval(async () => {
        if (isRunning) {
            // Restore the backup runId if an overlap is detected
            currentRunId = runIdBackup;
            return; // Skip this iteration if the previous one is still running
        }

        // Backup the current runId before starting the new one
        runIdBackup = currentRunId;
        isRunning = true;

        await executeFlyCheck();
        isRunning = false;
    }, 20); // Check every second (20 ticks)
}
