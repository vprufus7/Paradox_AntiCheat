import { world } from "@minecraft/server";

/**
 * A modular database class for managing key-value pairs using dynamic properties.
 * Optimized for Minecraft Bedrock Edition scripting.
 */
export class OptimizedDatabase {
    private name: string;
    private pointerKey: string;

    /**
     * Constructs an instance of OptimizedDatabase.
     * @param name - The name of the database. Must be unique, non-empty, and follow specific constraints.
     * @throws Will throw an error if the name is empty, exceeds 16 characters, or contains invalid characters.
     */
    constructor(name: string) {
        if (!name || name.length === 0) {
            throw new Error("Database name cannot be empty.");
        }
        if (name.includes('"')) {
            throw new Error('Database name cannot include the character `"`.');
        }

        this.name = name;
        this.pointerKey = `${this.name}/pointers`;

        // Initialize the pointers array if it doesn't exist.
        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
        }
    }

    /**
     * Retrieves the list of pointers stored in the database.
     * @returns An array of strings representing the dynamic keys in the database.
     */
    private _getPointers(): string[] {
        const pointers = world.getDynamicProperty(this.pointerKey) as string | null;
        return pointers ? JSON.parse(pointers) : [];
    }

    /**
     * Updates the list of pointers in the database.
     * @param pointers - An array of strings representing the dynamic keys to store.
     */
    private _setPointers(pointers: string[]): void {
        world.setDynamicProperty(this.pointerKey, JSON.stringify(pointers));
    }

    /**
     * Stores a key-value pair in the database.
     * @param key - The key to store the value under. Must be unique within the database.
     * @param value - The value to associate with the key. Must be serializable to JSON.
     */
    public set(key: string, value: any): void {
        const pointers = this._getPointers();
        const dynamicKey = `${this.name}/${key}`;

        if (!pointers.includes(dynamicKey)) {
            pointers.push(dynamicKey);
            this._setPointers(pointers);
        }

        world.setDynamicProperty(dynamicKey, JSON.stringify(value));
    }

    /**
     * Retrieves a value associated with a given key.
     * @param key - The key to retrieve the value for.
     * @returns The value associated with the key, or `undefined` if the key does not exist.
     */
    public get<T = any>(key: string): T | undefined {
        const dynamicKey = `${this.name}/${key}`;
        const value = world.getDynamicProperty(dynamicKey) as string | null;
        return value ? (JSON.parse(value) as T) : undefined;
    }

    /**
     * Deletes a key-value pair from the database.
     * @param key - The key to delete from the database.
     */
    public delete(key: string): void {
        const pointers = this._getPointers();
        const dynamicKey = `${this.name}/${key}`;

        if (pointers.includes(dynamicKey)) {
            world.setDynamicProperty(dynamicKey, null);
            this._setPointers(pointers.filter((ptr) => ptr !== dynamicKey));
        }
    }

    /**
     * Clears all key-value pairs from the database.
     */
    public clear(): void {
        const pointers = this._getPointers();
        pointers.forEach((dynamicKey) => world.setDynamicProperty(dynamicKey, null));
        this._setPointers([]);
    }

    /**
     * Retrieves all entries (key-value pairs) in the database.
     * @returns An array of tuples where each tuple contains a key and its associated value.
     */
    public entries(): [string, any][] {
        return this._getPointers().map((ptr) => {
            const key = ptr.split("/").pop()!; // Extract the actual key
            const value = this.get(key);
            return [key, value];
        });
    }
}
