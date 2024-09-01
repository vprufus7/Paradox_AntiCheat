import { World, System, GameMode, EquipmentSlot, world, system } from "@minecraft/server";
import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";

/**
 * Class representing the Minecraft environment.
 */
export class MinecraftEnvironment {
    private static instance: MinecraftEnvironment;

    /**
     * Constructs a new instance of MinecraftEnvironment.
     * Private to enforce singleton pattern.
     */
    private constructor() {
        // Empty constructor
    }

    /**
     * Retrieves the singleton instance of MinecraftEnvironment.
     * @returns {MinecraftEnvironment} The singleton instance.
     */
    public static getInstance(): MinecraftEnvironment {
        if (!MinecraftEnvironment.instance) {
            MinecraftEnvironment.instance = new MinecraftEnvironment();
        }
        return MinecraftEnvironment.instance;
    }

    /**
     * Retrieves the World instance.
     * @returns {World} The World instance.
     */
    public getWorld(): World {
        return world;
    }

    /**
     * Retrieves the System instance.
     * @returns {System} The System instance.
     */
    public getSystem(): System {
        return system;
    }

    /**
     * Retrieves the GameMode class.
     * @returns {typeof GameMode} The GameMode class.
     */
    public getGameMode(): typeof GameMode {
        return GameMode;
    }

    /**
     * Retrieves the EquipmentSlot class.
     * @returns {typeof EquipmentSlot} The EquipmentSlot class.
     */
    public getEquipmentSlot(): typeof EquipmentSlot {
        return EquipmentSlot;
    }

    /**
     * Initializes a new ModalFormData instance.
     * @returns {ModalFormData} A new instance of ModalFormData.
     */
    public initializeModalFormData(): ModalFormData {
        return new ModalFormData();
    }

    /**
     * Initializes a new MessageFormData instance.
     * @returns {MessageFormData} A new instance of MessageFormData.
     */
    public initializeMessageFormData(): MessageFormData {
        return new MessageFormData();
    }

    /**
     * Initializes a new ActionFormData instance.
     * @returns {ActionFormData} A new instance of MessageFormData.
     */
    public initializeActionFormData(): ActionFormData {
        return new ActionFormData();
    }
}
