import { World, System, GameMode, EquipmentSlot, world, system } from "@minecraft/server";
import { MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { PlayerSpawnSubscription } from "../subscriptions/PlayerSpawnSubscriptions";

export class MinecraftEnvironment {
    private static instance: MinecraftEnvironment;
    private playerSpawnSubscription?: PlayerSpawnSubscription;

    private constructor() {
        // Empty?
    }

    // Method to get a singleton instance of MinecraftEnvironment
    public static getInstance(): MinecraftEnvironment {
        if (!MinecraftEnvironment.instance) {
            // If no instance exists, create a new one and store it
            MinecraftEnvironment.instance = new MinecraftEnvironment();
        }
        // Return the singleton instance
        return MinecraftEnvironment.instance;
    }

    // Getter method for retrieving the world instance
    public getWorld(): World {
        return world;
    }

    // Getter method for retrieving the system instance
    public getSystem(): System {
        return system;
    }

    // Getter method for retrieving the gameMode instance
    public getGameMode(): typeof GameMode {
        return GameMode;
    }

    // Getter method for retrieving the equipmentSlot instance
    public getEquipmentSlot(): typeof EquipmentSlot {
        return EquipmentSlot;
    }

    // Method to initialize modalFormData
    public initializeModalFormData(): ModalFormData {
        // Return a new instance of ModalFormData
        return new ModalFormData();
    }

    // Method to initialize messageFormData
    public initializeMessageFormData(): MessageFormData {
        // Return a new instance of ModalFormData
        return new MessageFormData();
    }

    // Getter method for retrieving the playerSpawnSubscription instance
    public getPlayerSpawnSubscription(): PlayerSpawnSubscription {
        if (!this.playerSpawnSubscription) {
            this.playerSpawnSubscription = new PlayerSpawnSubscription();
        }
        return this.playerSpawnSubscription;
    }
}
