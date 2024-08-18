import {
    Dimension,
    Effect,
    EffectAddBeforeEvent,
    EntityEquippableComponent,
    EntityHealthComponent,
    EntityHitEntityAfterEvent,
    EquipmentSlot,
    ItemStack,
    Player,
    PlayerLeaveBeforeEvent,
    PlayerSpawnAfterEvent,
    ProjectileHitEntityAfterEvent,
    system,
    Vector3,
    world,
} from "@minecraft/server";
import { MessageFormData } from "@minecraft/server-ui";

const cooldownTicks = 6000; // 5 minutes cooldown in ticks (6000 ticks = 5 minutes)
const punishmentProperty = "pvpPunishment"; // Dynamic property to track if a player should be punished
const pvpStatusProperty = "pvpEnabled"; // Dynamic property to track if a player has PvP enabled
const globalDynamicPropertyKey = "pvpGlobalEnabled"; // Key for global PvP status dynamic property
const messageCooldownTicks = 100; // Adjust this value as needed
const playerMessageTimestamps = new Map<string, number>(); // Map to store the last message timestamp for each player

// Variables to store the subscription references
let entityHitEntitySubscription: (arg: EntityHitEntityAfterEvent) => void;
let playerLeaveSubscription: (arg: PlayerLeaveBeforeEvent) => void;
let playerSpawnSubscription: (arg: PlayerSpawnAfterEvent) => void;
let projectileHitEntitySubscription: (arg: ProjectileHitEntityAfterEvent) => void;
let effectAddSubscription: (arg: EffectAddBeforeEvent) => void;

// Map to store player data with player ID as the key
const playerDataMap = new Map<
    string,
    {
        inventory: ItemStack[];
        equipment: ItemStack[];
        location: Vector3;
        dimension: Dimension;
    }
>();

/**
 * Determines if a message can be sent to a player based on the cooldown period.
 * This helps prevent spamming by ensuring messages are only sent if a certain amount of time has passed
 * since the last message was sent to the player.
 *
 * @param {string} playerId - The ID of the player to check.
 * @returns {boolean} - Returns `true` if the message can be sent (i.e., the cooldown period has elapsed),
 * otherwise returns `false`.
 */
function canSendMessage(playerId: string): boolean {
    const currentTick = system.currentTick;
    const lastMessageTick = playerMessageTimestamps.get(playerId) || 0;

    // Check if the cooldown period has passed since the last message was sent
    if (currentTick - lastMessageTick >= messageCooldownTicks) {
        // Update the timestamp of the last message sent
        playerMessageTimestamps.set(playerId, currentTick);
        return true;
    }

    return false;
}

/**
 * Initializes the PvP system by setting up event listeners for PvP interactions and player actions.
 * This function should be called to enable the PvP management features in the game.
 */
function setupPvPSystem() {
    // Event: When effect is added to an entity
    effectAddSubscription = world.beforeEvents.effectAdd.subscribe((event) => {
        const { entity } = event;

        if (!(entity instanceof Player)) {
            return;
        }

        const effects = entity.getEffects();

        entity.setDynamicProperty("storedEffects", JSON.stringify(effects));
    });

    // Event: When one entity hits another entity
    entityHitEntitySubscription = world.afterEvents.entityHitEntity.subscribe((event) => {
        // Get the current global PvP status
        const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) || world.gameRules.pvp;
        if (!isPvPGlobalEnabled) {
            unsubscribePvPSystem();
        }
        const attacker = event.damagingEntity;
        const victim = event.hitEntity;

        // Ensure both entities are players
        if (attacker instanceof Player && victim instanceof Player) {
            // Get PvP status from dynamic properties
            let isPvPEnabledForVictim = victim.getDynamicProperty(pvpStatusProperty) || world.gameRules.pvp;

            // Check if the victim has PvP disabled
            if (!isPvPEnabledForVictim) {
                const healthComponentVictim = victim.getComponent("health");
                if (healthComponentVictim) {
                    // Calculate the amount of health the victim had taken
                    const beforeHealthVictim = victim.getDynamicProperty("paradoxCurrentHealth") as number;
                    const currentHealthVictim = healthComponentVictim.currentValue;
                    const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
                    // Calculate to restore taken health
                    const restoreHealthVictim = currentHealthVictim + healthDiffVictim;

                    // Adjust the attacker's health based on the victim's health taken
                    const healthComponentAttacker = attacker.getComponent("health");
                    if (healthComponentAttacker) {
                        const newHealthAttacker = healthComponentAttacker.currentValue - healthDiffVictim;
                        healthComponentAttacker.setCurrentValue(newHealthAttacker);
                    }

                    // Restore the victim's lost health
                    healthComponentVictim.setCurrentValue(restoreHealthVictim);
                }

                if (canSendMessage(attacker.id)) {
                    attacker.sendMessage(`§4[§6Paradox§4]§o§7 ${victim.name} has PvP disabled!`);
                }
            }

            // Check if the attacker has PvP disabled and enable it if necessary
            let isPvPEnabledForAttacker = attacker.getDynamicProperty(pvpStatusProperty) || world.gameRules.pvp;
            if (!isPvPEnabledForAttacker) {
                attacker.setDynamicProperty(pvpStatusProperty, true);

                attacker.sendMessage("§4[§6Paradox§4]§o§7 PvP has been enabled for you!");

                // Update PvP toggle cooldown
                attacker.setDynamicProperty("pvpToggleCooldown", system.currentTick);
            }

            // Start or refresh the cooldown for the attacker
            const currentTick = system.currentTick;
            const cooldownExpiryTick = currentTick + cooldownTicks;
            attacker.setDynamicProperty("pvpCooldown", cooldownExpiryTick);

            if (canSendMessage(attacker.id)) {
                // Notify the attacker that they are in PvP with the cooldown timer
                const remainingMinutes = Math.floor(cooldownTicks / 1200); // Convert ticks to minutes (assuming 20 ticks per second)
                attacker.sendMessage(`§4[§6Paradox§4]§o§7 You are now in PvP! You cannot log out for ${remainingMinutes} minutes.`);
            }
        }
    });

    // Event: When a player logs out
    playerLeaveSubscription = world.beforeEvents.playerLeave.subscribe(async (event) => {
        // Get the current global PvP status
        const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) || world.gameRules.pvp;
        if (!isPvPGlobalEnabled) {
            unsubscribePvPSystem();
            return; // Exit early if PvP is disabled
        }

        const player = event.player;

        const healthComponent = player.getComponent("health") as EntityHealthComponent;
        if (healthComponent) {
            player.setDynamicProperty("paradoxCurrentHealth", healthComponent.currentValue);
        }

        playerMessageTimestamps.delete(player.id);

        // Check if the player is in cooldown
        const cooldownExpiryTick = player.getDynamicProperty("pvpCooldown") as number;
        const currentTick = system.currentTick;

        // If the player logs out before the cooldown expires, drop their inventory and mark them for punishment
        if (cooldownExpiryTick && currentTick < cooldownExpiryTick) {
            // Set punishment property
            player.setDynamicProperty(punishmentProperty, true);

            // Save data to the map
            const inventoryComponent = player.getComponent("inventory")?.container;
            const equipmentComponent = player.getComponent("equippable");

            const inventoryItems: ItemStack[] = [];
            const equipmentItems: ItemStack[] = [];

            // Collect inventory items
            if (inventoryComponent) {
                for (let slot = 0; slot < inventoryComponent.size; slot++) {
                    const item = inventoryComponent.getItem(slot);
                    if (item) {
                        inventoryItems.push(item);
                    }
                }
            }

            // Collect equipment items
            if (equipmentComponent) {
                for (const slot of Object.values(EquipmentSlot)) {
                    const item = equipmentComponent.getEquipment(slot);
                    // Skip the Mainhand slot to prevent duplicates
                    if (slot === EquipmentSlot.Mainhand) {
                        continue;
                    }

                    if (item) {
                        equipmentItems.push(item);
                    }
                }
            }

            // Save player data
            playerDataMap.set(player.id, {
                inventory: inventoryItems,
                equipment: equipmentItems,
                location: player.location,
                dimension: player.dimension,
            });

            // Drop stored player data
            await dropStoredPlayerData(player.id);
        }
    });

    // Event: When a player spawns
    playerSpawnSubscription = world.afterEvents.playerSpawn.subscribe((event) => {
        function alertNotice(player: Player) {
            const alertGUI = new MessageFormData();
            alertGUI.title("               PvP Punishment"); // title does not center automatically
            alertGUI.body("You have been punished for logging out during PvP! Your inventory and equipment has been wiped out!");
            alertGUI.button2("Confirm");
            alertGUI.button1("Quit");
            alertGUI
                .show(player)
                .then((result) => {
                    if (result && result.canceled && result.cancelationReason === "UserBusy") {
                        return alertNotice(player);
                    }

                    if (result.selection === 0) {
                        world.getDimension(player.dimension.id).runCommand(`kick ${player.name} §o§7\n\nYou have selected to quit the game.`);
                    }
                })
                .catch((error: Error) => {
                    console.error("Paradox Unhandled Rejection: ", error);
                    if (error instanceof Error) {
                        // Check if error.stack exists before trying to split it
                        if (error.stack) {
                            const stackLines: string[] = error.stack.split("\n");
                            if (stackLines.length > 1) {
                                const sourceInfo: string[] = stackLines;
                                console.error("Error originated from:", sourceInfo[0]);
                            }
                        }
                    }
                });
        }

        // Get the current global PvP status
        const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) || world.gameRules.pvp;
        if (!isPvPGlobalEnabled) {
            unsubscribePvPSystem();
        }
        const player = event.player;

        const healthComponent = player.getComponent("health") as EntityHealthComponent;
        if (healthComponent) {
            player.setDynamicProperty("paradoxCurrentHealth", healthComponent.currentValue);
        }

        // Check if the player should be punished
        if (player.getDynamicProperty(punishmentProperty)) {
            clearPlayerInventory(player);
            player.setDynamicProperty(punishmentProperty, false); // Clear the punishment property after punishing the player
            alertNotice(player);
        }
    });

    // Event: When a projectile hits an entity
    projectileHitEntitySubscription = world.afterEvents.projectileHitEntity.subscribe((event) => {
        // Determine if PvP is globally enabled
        const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) || world.gameRules.pvp;
        if (!isPvPGlobalEnabled) {
            unsubscribePvPSystem();
        }

        const attacker = event.source;
        const victim = event.getEntityHit().entity as Player;
        const projectileType = event.projectile.typeId;

        if (victim instanceof Player && projectileType === "minecraft:arrow") {
            handleArrowHit(victim);
        }

        if (attacker instanceof Player && victim instanceof Player) {
            handlePvP(attacker, victim);
        }
    });
}

/**
 * Unsubscribes from all PvP-related events.
 * This function is called when PvP is disabled globally.
 */
function unsubscribePvPSystem() {
    if (entityHitEntitySubscription) {
        world.afterEvents.entityHitEntity.unsubscribe(entityHitEntitySubscription);
        entityHitEntitySubscription = undefined;
    }

    if (playerLeaveSubscription) {
        world.beforeEvents.playerLeave.unsubscribe(playerLeaveSubscription);
        playerLeaveSubscription = undefined;
    }

    if (playerSpawnSubscription) {
        world.afterEvents.playerSpawn.unsubscribe(playerSpawnSubscription);
        playerSpawnSubscription = undefined;
    }

    if (projectileHitEntitySubscription) {
        world.afterEvents.projectileHitEntity.unsubscribe(projectileHitEntitySubscription);
        projectileHitEntitySubscription = undefined;
    }

    if (effectAddSubscription) {
        world.beforeEvents.effectAdd.unsubscribe(effectAddSubscription);
        effectAddSubscription = undefined;
    }
}

/**
 * Drops all items stored in the player data map for a given player.
 *
 * @param {string} playerId - The ID of the player whose data is to be dropped.
 */
async function dropStoredPlayerData(playerId: string) {
    const data = playerDataMap.get(playerId);

    if (!data) return; // Exit if no data found

    // Drop items from inventory and equipment
    system.run(() => {
        dropItems(data.inventory, data.dimension, data.location);
        dropItems(data.equipment, data.dimension, data.location);
    });

    // Remove data from the map
    playerDataMap.delete(playerId);
}

/**
 * Spawns items in the specified dimension at the given location.
 *
 * @param {ItemStack[]} items - An array of items to spawn.
 * @param {Dimension} dimension - The dimension where items will be spawned.
 * @param {Vector3} location - The location where items will be spawned.
 */
function dropItems(items: ItemStack[], dimension: Dimension, location: Vector3) {
    for (const itemStack of items) {
        if (itemStack) {
            dimension.spawnItem(itemStack, location);
        }
    }
}

/**
 * Clears all items in a player's inventory and equipment slots.
 * This function is typically called when a player rejoins after logging out during PvP.
 *
 * @param {Player} player - The player whose inventory and equipment will be cleared.
 */
function clearPlayerInventory(player: Player) {
    const inventory = player.getComponent("inventory")?.container;

    // Clear inventory items
    if (inventory) {
        for (let slot = 0; slot < inventory.size; slot++) {
            inventory.setItem(slot, undefined); // Clear the slot
        }
    }

    // Clear equipment items
    const equipmentComponent = player.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent;
    if (equipmentComponent) {
        // Iterate over each equipment slot
        for (let slot of Object.values(EquipmentSlot)) {
            // Clear the slot
            equipmentComponent.setEquipment(slot, undefined);
        }
    }
}

/**
 * Handles the effects on a player when hit by an arrow.
 * @param {Player} victim - The player who was hit by the arrow.
 */
function handleArrowHit(victim: Player): void {
    const isPvPEnabledForVictim = victim.getDynamicProperty(pvpStatusProperty) || world.gameRules.pvp;

    if (!isPvPEnabledForVictim) {
        removeNewEffects(victim);
    }
}

/**
 * Removes effects from the player that are not in the stored effects.
 * @param {Player} victim - The player whose effects need to be checked and potentially removed.
 */
function removeNewEffects(victim: Player): void {
    const currentEffects = victim.getEffects();
    const storedEffectsString = victim.getDynamicProperty("storedEffects") as string;

    let storedEffects: Effect[] = [];
    if (storedEffectsString) {
        storedEffects = JSON.parse(storedEffectsString);
    }

    const storedEffectsMap = new Map(storedEffects.map((effect) => [effect.typeId, effect]));

    currentEffects.forEach((effect) => {
        if (!storedEffectsMap.has(effect.typeId)) {
            victim.removeEffect(effect.typeId);
        }
    });
}

/**
 * Handles PvP logic when two players interact.
 * @param {Player} attacker - The player who is attacking.
 * @param {Player} victim - The player who is being attacked.
 */
function handlePvP(attacker: Player, victim: Player): void {
    const isPvPEnabledForVictim = victim.getDynamicProperty(pvpStatusProperty) || world.gameRules.pvp;

    if (!isPvPEnabledForVictim) {
        extinguishFireIfNecessary(victim);
        adjustHealth(attacker, victim);
    }

    enablePvPIfNeeded(attacker);
    updatePvPCooldown(attacker);
}

/**
 * Extinguishes fire on the player if necessary.
 * @param {Player} victim - The player who may need to be extinguished.
 */
function extinguishFireIfNecessary(victim: Player): void {
    victim.extinguishFire(false);
}

/**
 * Adjusts health values between the attacker and the victim.
 * @param {Player} attacker - The player who is attacking.
 * @param {Player} victim - The player who is being attacked.
 */
function adjustHealth(attacker: Player, victim: Player): void {
    const healthComponentVictim = victim.getComponent("health");
    if (healthComponentVictim) {
        const beforeHealthVictim = victim.getDynamicProperty("paradoxCurrentHealth") as number;
        const currentHealthVictim = healthComponentVictim.currentValue;
        const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
        const restoreHealthVictim = currentHealthVictim + healthDiffVictim;

        const healthComponentAttacker = attacker.getComponent("health");
        if (healthComponentAttacker) {
            healthComponentAttacker.setCurrentValue(healthComponentAttacker.currentValue - healthDiffVictim);
        }

        healthComponentVictim.setCurrentValue(restoreHealthVictim);
    }
}

/**
 * Enables PvP for the attacker if it was previously disabled.
 * @param {Player} attacker - The player who is attacking.
 */
function enablePvPIfNeeded(attacker: Player): void {
    const isPvPEnabledForAttacker = attacker.getDynamicProperty(pvpStatusProperty) || world.gameRules.pvp;
    if (!isPvPEnabledForAttacker) {
        attacker.setDynamicProperty(pvpStatusProperty, true);
        attacker.sendMessage("§4[§6Paradox§4]§o§7 PvP has been enabled for you!");
        attacker.setDynamicProperty("pvpToggleCooldown", system.currentTick);
    }
}

/**
 * Updates the PvP cooldown for the attacker.
 * @param {Player} attacker - The player who is attacking.
 */
function updatePvPCooldown(attacker: Player): void {
    const currentTick = system.currentTick;
    const cooldownExpiryTick = currentTick + cooldownTicks;
    attacker.setDynamicProperty("pvpCooldown", cooldownExpiryTick);
}

/**
 * Initializes the PvP system by calling the internal setup function.
 * This function should be called from another script to enable PvP features.
 */
export function initializePvPSystem() {
    setupPvPSystem();
}
