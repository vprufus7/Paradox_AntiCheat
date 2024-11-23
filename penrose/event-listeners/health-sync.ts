import { world, Player, EntityHealthChangedAfterEvent } from "@minecraft/server";

/**
 * Synchronize the player's dynamic property "paradoxCurrentHealth" when their health changes.
 * @param player The player whose health needs to be synchronized.
 */
function initializePlayerHealth(player: Player): void {
    const healthComponent = player.getComponent("health");
    if (healthComponent) {
        const currentHealth = healthComponent.currentValue;
        const storedHealth = player.getDynamicProperty("paradoxCurrentHealth") as number;

        if (storedHealth === undefined || currentHealth !== storedHealth) {
            player.setDynamicProperty("paradoxCurrentHealth", currentHealth);
        }
    }
}

/**
 * Handle health change events to synchronize the player's health property.
 * @param event The event data containing health change information.
 */
function handleHealthChange(event: EntityHealthChangedAfterEvent): void {
    const entity = event.entity;
    if (entity instanceof Player) {
        const currentHealth = event.newValue;
        entity.setDynamicProperty("paradoxCurrentHealth", currentHealth);
    }
}

/**
 * Manage health change and initial spawn event listeners.
 */
export const healthChangeListener = {
    isActive: false,
    playerSpawnCallback: null as unknown as (event: any) => void,
    healthChangeCallback: null as unknown as (event: EntityHealthChangedAfterEvent) => void,

    /**
     * Start listening for playerSpawn and health change events.
     */
    start(): void {
        if (!this.isActive) {
            // Create and store the callback for playerSpawn
            this.playerSpawnCallback = (event: any): void => {
                const player = event.player;
                if (event.initialSpawn) {
                    initializePlayerHealth(player);
                }
            };

            // Subscribe to playerSpawn
            world.afterEvents.playerSpawn.subscribe(this.playerSpawnCallback);

            // Create and store the callback for health changes
            this.healthChangeCallback = handleHealthChange;

            // Subscribe to health changes
            world.afterEvents.entityHealthChanged.subscribe(this.healthChangeCallback);

            this.isActive = true;
        }
    },

    /**
     * Stop listening for playerSpawn and health change events.
     */
    stop(): void {
        if (this.isActive) {
            // Unsubscribe from playerSpawn
            if (this.playerSpawnCallback) {
                world.afterEvents.playerSpawn.unsubscribe(this.playerSpawnCallback);
                this.playerSpawnCallback = null;
            }

            // Unsubscribe from health changes
            if (this.healthChangeCallback) {
                world.afterEvents.entityHealthChanged.unsubscribe(this.healthChangeCallback);
                this.healthChangeCallback = null;
            }

            this.isActive = false;
        }
    },
};
