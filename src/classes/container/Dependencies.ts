import { World, System, GameMode, EquipmentSlot } from "@minecraft/server"; // Import EquipmentSlot

import { MessageFormData, ModalFormData } from "@minecraft/server-ui";

export class MinecraftEnvironment {
    private static instance: MinecraftEnvironment;
    private world?: World;
    private system?: System;

    private constructor(world?: World, system?: System) {
        this.world = world;
        this.system = system;
    }

    // Method to get a singleton instance of MinecraftEnvironment
    public static getInstance(world?: World, system?: System): MinecraftEnvironment {
        if (!MinecraftEnvironment.instance) {
            // If no instance exists, create a new one and store it
            MinecraftEnvironment.instance = new MinecraftEnvironment(world, system);
        }
        // Return the singleton instance
        return MinecraftEnvironment.instance;
    }

    // Getter method for retrieving the world instance
    public getWorld(): World | undefined {
        return this.world;
    }

    // Getter method for retrieving the system instance
    public getSystem(): System | undefined {
        return this.system;
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
}
