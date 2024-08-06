import { Player, world, system } from "@minecraft/server";

/**
 * Handles world border enforcement based on current settings.
 */
function* worldBorderGenerator(): Generator<void, void, unknown> {
    const moduleKey = "paradoxModules";
    let jobId = yield undefined;

    while (true) {
        // Retrieve the current dynamic properties for world border settings
        const paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

        const worldBorderEnabled = paradoxModules["worldBorderCheck_b"] as boolean;
        const overworldBorder = paradoxModules["overworldSize_n"] as number;
        const netherBorder = paradoxModules["netherSize_n"] as number;
        const endBorder = paradoxModules["endSize_n"] as number;

        // Unsubscribe if world border feature is disabled
        if (!worldBorderEnabled) {
            if (typeof jobId !== "undefined") {
                system.clearRun(jobId as number);
            }
            return;
        }

        const players = world.getPlayers();

        for (const player of players) {
            const { x, y, z } = player.location;

            // Handle world border enforcement for each dimension
            if (player.dimension.id === "minecraft:overworld" && overworldBorder > 0) {
                checkAndTeleportPlayer(player, x, y, z, overworldBorder, "overworld");
            } else if (player.dimension.id === "minecraft:nether" && netherBorder > 0) {
                checkAndTeleportPlayer(player, x, y, z, netherBorder, "nether");
            } else if (player.dimension.id === "minecraft:the_end" && endBorder > 0) {
                checkAndTeleportPlayer(player, x, y, z, endBorder, "end");
            }
            yield; // Yield after processing each player to avoid blocking
        }
        yield; // Yield control to other tasks
    }
}

/**
 * Checks if the player is outside the world border and teleports them if necessary.
 */
function checkAndTeleportPlayer(player: Player, x: number, y: number, z: number, borderSize: number, dimension: string) {
    const borderOffset = borderSize - 3;

    if (x > borderSize || x < -borderSize || z > borderSize || z < -borderSize) {
        const targetX = x < -borderSize ? -borderOffset + 6 : x >= borderSize ? borderOffset - 6 : x;
        const targetZ = z < -borderSize ? -borderOffset + 6 : z >= borderSize ? borderOffset - 6 : z;
        const safeY = findSafeY(player, targetX, y, targetZ);

        player.sendMessage(`§4[§6Paradox§4]§o§7 You have reached the world border in the ${dimension}.`);
        player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
    }
}

/**
 * Finds a safe Y coordinate for teleportation.
 */
function findSafeY(player: Player, x: number, y: number, z: number): number {
    let safeY = y;

    while (true) {
        const headPosition = { x: x, y: safeY + 1, z: z };
        const bodyPosition = { x: x, y: safeY, z: z };
        const feetPosition = { x: x, y: safeY - 1, z: z };

        const headBlock = player.dimension.getBlock(headPosition);
        const bodyBlock = player.dimension.getBlock(bodyPosition);
        const feetBlock = player.dimension.getBlock(feetPosition);

        if (headBlock?.isAir && bodyBlock?.isAir && feetBlock?.isAir) {
            break; // Safe position found
        } else {
            safeY += 1; // Move up one block and check again
        }
    }

    return safeY;
}

/**
 * Initializes and manages the world border check.
 */
export function WorldBorder() {
    /**
     * A teleport method is called in the generator function.
     *
     * During initial start it is read-only, but transitions
     * to read-write. However, until the transistion happens
     * we experience spam/errors depending on how the code
     * is implemented. To work around it, we call runJob()
     * inside of run(). This mitigates the spam/errors.
     * Giving us the desired results and intended behavior.
     */
    system.run(() => {
        const generator = worldBorderGenerator();
        const jobId = system.runJob(generator);
        generator.next();
        generator.next(jobId); // Pass the jobId to the generator
    });
}
