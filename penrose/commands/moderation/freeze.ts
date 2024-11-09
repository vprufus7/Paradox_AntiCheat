import { Player, ChatSendBeforeEvent, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

// Define the dimensions and block type of the prison
const PRISON_WIDTH = 5;
const PRISON_HEIGHT = 3;
const PRISON_DEPTH = 5;
const PRISON_BLOCK_TYPE = "minecraft:bedrock"; // Replace with desired block type

// Define dynamic property names for storing player state
const ORIGINAL_LOCATION_PROPERTY = "originalLocation";
const ORIGINAL_DIMENSION_PROPERTY = "originalDimension";
const PRISON_LOCATION_PROPERTY = "prisonLocation";

/**
 * Represents the imprison command which allows administrators to imprison or release players.
 */
export const imprisonCommand: Command = {
    name: "imprison",
    description: "Imprisons the player and freezes them.",
    usage: "{prefix}imprison <player>",
    examples: [`{prefix}imprison`, `{prefix}imprison Player Name`, `{prefix}imprison "Player Name"`, `{prefix}imprison help`],
    category: "Moderation",
    securityClearance: 3,

    /**
     * Executes the imprison command to imprison or release a player.
     * @param {ChatSendBeforeEvent} message - The message event object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Find the player object based on the command arguments or use the sender
        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        let player: Player | undefined = playerName.length > 0 ? world.getAllPlayers().find((p) => p.name === playerName) : message.sender;

        // Inform if the player is not found
        if (!player) {
            message.sender.sendMessage(`§cPlayer "${playerName}" not found.`);
            return;
        }

        /**
         * Builds a prison around the specified player.
         * @param {Player} player - The player to imprison.
         */
        function buildPrison(player: Player) {
            // Function to build the prison blocks around the player
            function buildingPermit() {
                const prisonLocationStr = player.getDynamicProperty(PRISON_LOCATION_PROPERTY);
                if (prisonLocationStr) {
                    const prisonLocation = prisonLocationStr as Vector3;

                    for (let x = 0; x < PRISON_WIDTH; x++) {
                        for (let y = 0; y < PRISON_HEIGHT; y++) {
                            for (let z = 0; z < PRISON_DEPTH; z++) {
                                // Build walls and floor of the prison
                                if (x === 0 || x === PRISON_WIDTH - 1 || z === 0 || z === PRISON_DEPTH - 1 || y === 0 || y === PRISON_HEIGHT - 1) {
                                    world
                                        .getDimension("overworld")
                                        ?.getBlock({ x: prisonLocation.x + x, y: prisonLocation.y + y, z: prisonLocation.z + z })
                                        ?.setType(PRISON_BLOCK_TYPE);
                                }
                            }
                        }

                        // Teleport the player to the center of the prison
                        player.teleport({
                            x: prisonLocation.x + Math.floor(PRISON_WIDTH / 2),
                            y: prisonLocation.y + 1,
                            z: prisonLocation.z + Math.floor(PRISON_DEPTH / 2),
                        });
                    }
                }
            }

            const currentLocation = player.location;
            const currentDimension = player.dimension.id;

            // Store the player's original location, dimension, and the prison location
            if (!player.getDynamicProperty(ORIGINAL_LOCATION_PROPERTY) && !player.getDynamicProperty(ORIGINAL_DIMENSION_PROPERTY) && !player.getDynamicProperty(PRISON_LOCATION_PROPERTY)) {
                const originalLocation: Vector3 = { x: currentLocation.x, y: currentLocation.y, z: currentLocation.z };
                player.setDynamicProperty(ORIGINAL_LOCATION_PROPERTY, originalLocation);
                player.setDynamicProperty(ORIGINAL_DIMENSION_PROPERTY, currentDimension);

                const prisonLocation: Vector3 = {
                    x: Math.floor(currentLocation.x - PRISON_WIDTH / 2),
                    y: Math.floor(200),
                    z: Math.floor(currentLocation.z - PRISON_DEPTH / 2),
                };
                player.setDynamicProperty(PRISON_LOCATION_PROPERTY, prisonLocation);

                // Subscribe to the dimension change event to determine when to build the prison
                const dimensionChangeEvent = world.afterEvents.playerDimensionChange.subscribe((event) => {
                    if (player.id === event.player.id) {
                        buildingPermit();
                        // Unsubscribe from the event after the prison is built
                        world.afterEvents.playerDimensionChange.unsubscribe(dimensionChangeEvent);
                    }
                });

                // Teleport the player to the prison location
                player.teleport(
                    {
                        x: prisonLocation.x + Math.floor(PRISON_WIDTH / 2),
                        y: 200,
                        z: prisonLocation.z + Math.floor(PRISON_DEPTH / 2),
                    },
                    { dimension: world.getDimension("overworld") }
                );

                // If the player did not change dimensions, build the prison immediately
                if (player.dimension.id === currentDimension) {
                    buildingPermit();
                    world.afterEvents.playerDimensionChange.unsubscribe(dimensionChangeEvent);
                }
            }
        }

        /**
         * Freezes the player by applying a weakness effect and disabling movement.
         * @param {Player} player - The player to freeze.
         */
        function freezePlayer(player: Player) {
            player.addEffect("minecraft:weakness", 99999, { amplifier: 255, showParticles: false });
            player.inputPermissions.movementEnabled = false;
            player.inputPermissions.cameraEnabled = false;
        }

        /**
         * Unfreezes the player and removes the prison structure.
         * @param {Player} player - The player to unfreeze and release.
         */
        function unfreezePlayer(player: Player) {
            const originalLocationStr = player.getDynamicProperty(ORIGINAL_LOCATION_PROPERTY);
            const originalDimensionStr = player.getDynamicProperty(ORIGINAL_DIMENSION_PROPERTY);
            const prisonLocationStr = player.getDynamicProperty(PRISON_LOCATION_PROPERTY);

            if (originalLocationStr && originalDimensionStr && prisonLocationStr) {
                const originalLocation = originalLocationStr as Vector3;
                const originalDimension = originalDimensionStr as string;
                const prisonLocation = prisonLocationStr as Vector3;

                // Remove the prison blocks
                for (let x = 0; x < PRISON_WIDTH; x++) {
                    for (let y = 0; y < PRISON_HEIGHT; y++) {
                        for (let z = 0; z < PRISON_DEPTH; z++) {
                            if (x === 0 || x === PRISON_WIDTH - 1 || z === 0 || z === PRISON_DEPTH - 1 || y === 0 || y === PRISON_HEIGHT - 1) {
                                world
                                    .getDimension("overworld")
                                    ?.getBlock({ x: prisonLocation.x + x, y: prisonLocation.y + y, z: prisonLocation.z + z })
                                    ?.setType("minecraft:air");
                            }
                        }
                    }
                }

                // Teleport the player back to their original location and dimension
                const originalDimensionObj = world.getDimension(originalDimension);
                if (originalDimensionObj) {
                    player.teleport(originalLocation, { dimension: originalDimensionObj });
                } else {
                    console.log(`Original dimension "${originalDimension}" not found.`);
                }

                // Clear dynamic properties
                player.setDynamicProperty(PRISON_LOCATION_PROPERTY, undefined);
                player.setDynamicProperty(ORIGINAL_LOCATION_PROPERTY, undefined);
                player.setDynamicProperty(ORIGINAL_DIMENSION_PROPERTY, undefined);

                player.inputPermissions.movementEnabled = true;
                player.inputPermissions.cameraEnabled = true;
                player.removeEffect("minecraft:weakness");
            } else {
                console.log(`No original location, dimension, or prison location found for player ${player.name}`);
            }
        }

        // Execute the command logic in the game tick loop
        system.run(() => {
            if (player && player.isValid()) {
                // Check if player is already imprisoned
                const isImprisoned = player.getDynamicProperty(PRISON_LOCATION_PROPERTY);

                if (isImprisoned) {
                    // Unfreeze and release the player
                    unfreezePlayer(player);
                    player.sendMessage(`§2[§7Paradox§2]§o§7 You have been released from imprisonment.`);
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player ${player.name} has been released.`);
                } else {
                    // Imprison the player
                    freezePlayer(player);
                    buildPrison(player);
                    player.sendMessage(`§2[§7Paradox§2]§o§7 You have been imprisoned.`);
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player ${player.name} has been imprisoned.`);
                }
            }
        });
    },
};
