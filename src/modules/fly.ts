import { world, GameMode, system, Vector3, Player } from "@minecraft/server";

let currentJobId: number | null = null;
let currentRunId: number | null = null;

// Helper function to generate a random offset in the range [-10, 10]
function getRandomOffset(): number {
    return Math.random() * 20 - 10;
}

// Function to get randomized coordinates within a radius of 10 blocks from the player's current location
function getRandomizedCoordinates(player: Player): Vector3 {
    const { x, y, z } = player.location;
    const randomizedX = x + getRandomOffset();
    const randomizedY = y + getRandomOffset();
    const randomizedZ = z + getRandomOffset();
    return { x: randomizedX, y: randomizedY, z: randomizedZ };
}

function* flyCheck(): Generator<void, void, unknown> {
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
        //excludeGameModes: [GameMode.creative, GameMode.spectator],
        excludeGameModes: [GameMode.creative],
    };
    const filteredPlayers = world.getPlayers(gm);

    // Run as each player who is in survival and adventure
    for (const player of filteredPlayers) {
        if ((player.getDynamicProperty("securityClearance") as number) === 4) {
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

export function FlyCheck() {
    if (currentJobId !== null) {
        // Clear any existing job before starting a new one
        system.clearJob(currentJobId);
    }

    if (currentRunId !== null) {
        // Clear any existing run before starting a new one
        system.clearRun(currentRunId);
    }

    currentRunId = system.runInterval(() => {
        currentJobId = system.runJob(flyCheck());
    }, 20);
}
