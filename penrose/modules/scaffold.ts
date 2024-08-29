import { system, Player, world, Block, PlayerLeaveBeforeEvent, PlayerPlaceBlockBeforeEvent, Vector3, GameMode } from "@minecraft/server";

// Configuration Constants
const SCAFFOLD_THRESHOLD = 3; // Number of blocks placed in quick succession
const TIME_WINDOW = 20; // Time window in ticks (20 ticks = 1 second)

// Data structure to keep track of block placements
const playerBlockPlacements: Map<string, { positions: Block[]; times: number[] }> = new Map();

// Variables to store the subscription references
let blockPlacementCallback: (arg: PlayerPlaceBlockBeforeEvent) => void;
let playerLeaveCallback: (arg: PlayerLeaveBeforeEvent) => void;

/**
 * Unsubscribes from the scaffold detection events.
 */
export function stopScaffoldCheck() {
    if (blockPlacementCallback) {
        world.beforeEvents.playerPlaceBlock.unsubscribe(blockPlacementCallback);
        blockPlacementCallback = undefined;
    }
    if (playerLeaveCallback) {
        world.beforeEvents.playerLeave.unsubscribe(playerLeaveCallback);
        playerLeaveCallback = undefined;
    }
    playerBlockPlacements.clear();
}

/**
 * Helper function to get the player's ID.
 *
 * @param {Player} player - The player object.
 * @returns {string} - The ID of the player.
 */
function getPlayerId(player: Player): string {
    return player.id;
}

/**
 * Detects if the player is using scaffolding hacks and returns the positions of suspicious blocks.
 *
 * @param {Player} player - The player object.
 * @returns {Vector3[]} - An array of block positions that are considered suspicious.
 */
function detectScaffolding(player: Player): Vector3[] {
    const playerId = getPlayerId(player);
    const data = playerBlockPlacements.get(playerId);

    if (!data || data.positions.length < SCAFFOLD_THRESHOLD) {
        return [];
    }

    // Check if the blocks were placed within the TIME_WINDOW
    const recentTimes = data.times.slice(-SCAFFOLD_THRESHOLD);
    const timeDifference = recentTimes[recentTimes.length - 1] - recentTimes[0];

    if (timeDifference > TIME_WINDOW) {
        return [];
    }

    // Check if the blocks are placed in a line (horizontally or vertically)
    const positions = data.positions.slice(-SCAFFOLD_THRESHOLD);
    const xSet = new Set(positions.map((pos) => pos.x));
    const ySet = new Set(positions.map((pos) => pos.y));
    const zSet = new Set(positions.map((pos) => pos.z));

    // If all x, y, or z coordinates are the same, it's likely scaffolding
    if (xSet.size === 1 || ySet.size === 1 || zSet.size === 1) {
        return positions.map((block) => block.location);
    }

    return [];
}

/**
 * Initializes the scaffold detection logic by subscribing to relevant events.
 * This function sets up event listeners to detect potential scaffold hacks by players.
 */
export function startScaffoldCheck() {
    // Event listener for block placements
    blockPlacementCallback = (event: PlayerPlaceBlockBeforeEvent) => {
        const player = event.player;
        const block = event.block;
        const playerId = getPlayerId(player);
        const gamemode = player.getGameMode();

        // Disregard spectator and creative mode
        if (gamemode === GameMode.spectator || gamemode === GameMode.creative) {
            return;
        }

        // Ignore block placements while the player is sneaking
        if (player.isSneaking) {
            return;
        }

        // Initialize player's block placement tracking if not already done
        if (!playerBlockPlacements.has(playerId)) {
            playerBlockPlacements.set(playerId, { positions: [], times: [] });
        }

        const data = playerBlockPlacements.get(playerId)!;
        data.positions.push(block);
        data.times.push(system.currentTick);

        // Keep the buffer size manageable by removing old entries
        if (data.positions.length > SCAFFOLD_THRESHOLD * 2) {
            data.positions.shift();
            data.times.shift();
        }

        // Detect potential scaffolding and replace flagged blocks with air
        const suspiciousBlocks = detectScaffolding(player);
        if (suspiciousBlocks.length > 0) {
            system.run(() => {
                const inventory = player.getComponent("inventory");
                if (inventory && inventory.container) {
                    const blockItemStack = block?.getItemStack(1, true);
                    if (blockItemStack) {
                        inventory.container.addItem(blockItemStack);
                    }
                }
                suspiciousBlocks.forEach((pos) => {
                    player.dimension.getBlock(pos).setType("minecraft:air");
                });
            });
        }
    };

    // Event listener for player leave to clean up data
    playerLeaveCallback = (event: PlayerLeaveBeforeEvent) => {
        const playerId = event.player.id;
        playerBlockPlacements.delete(playerId);
    };

    // Subscribe to events
    world.beforeEvents.playerPlaceBlock.subscribe(blockPlacementCallback);
    world.beforeEvents.playerLeave.subscribe(playerLeaveCallback);
}
