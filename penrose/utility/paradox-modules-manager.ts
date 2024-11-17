import { World } from "@minecraft/server";

// This will hold the parsed `paradoxModules` to avoid repeated parsing of the dynamic property
let paradoxModulesCache: { [key: string]: any } | null = null;

/**
 * Type guard to check if a value is a plain object (not an array or null).
 * This ensures that we safely treat objects and avoid errors when setting values.
 *
 * @param value - The value to check.
 * @returns {boolean} - True if the value is a plain object, false otherwise.
 */
function isObject(value: any): value is { [key: string]: any } {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Retrieves the current `paradoxModules` object from the world dynamic property.
 * It first checks the cache, and if the cache is empty, it fetches and parses it from the world dynamic property.
 *
 * @param {World} world - The Minecraft world instance.
 * @returns {object} - The `paradoxModules` object.
 *
 * @example
 * // Retrieving the paradoxModules object
 * const paradoxModules = getParadoxModules(world);
 * console.log(paradoxModules);
 */
export const getParadoxModules = (world: World): any => {
    // If the cache is not populated, fetch from the world dynamic property and parse it
    if (!paradoxModulesCache) {
        const moduleKey = "paradoxModules";
        const storedModules = world.getDynamicProperty(moduleKey) as string;
        paradoxModulesCache = storedModules ? JSON.parse(storedModules) : {}; // Parse the JSON or return an empty object if not found
    }
    return paradoxModulesCache;
};

/**
 * Updates the `paradoxModules` dynamic property with the provided object and updates the cache.
 *
 * @param {World} world - The Minecraft world instance.
 * @param {object} updatedModules - The new `paradoxModules` object to save.
 *
 * @example
 * // Updating paradoxModules with new settings
 * updateParadoxModules(world, { newSetting: true });
 */
export const updateParadoxModules = (world: World, updatedModules: { [key: string]: any }): void => {
    paradoxModulesCache = updatedModules; // Update the in-memory cache
    const moduleKey = "paradoxModules";
    world.setDynamicProperty(moduleKey, JSON.stringify(updatedModules)); // Save the updated modules back to the world dynamic property
};

/**
 * Adds or updates a setting in `paradoxModules` and updates the cache.
 * This is a utility to simplify setting values in `paradoxModules`.
 * It supports both flat and nested objects for entire settings.
 *
 * @param {World} world - The Minecraft world instance.
 * @param {string} key - The key to add or update.
 * @param {string | number | boolean | object} value - The value to assign to the key, can be an object or any primitive value.
 *
 * @example
 * // Setting a simple key-value pair in paradoxModules
 * setSettingInParadoxModules(world, 'someNewSetting', true);
 *
 * // Updating a setting to an object (e.g., setting platformBlock_settings as an object)
 * setSettingInParadoxModules(world, "platformBlock_settings", {
 *     enabled: true,
 *     maxHeight: 100
 * });
 */
export const setSettingInParadoxModules = (world: World, key: string, value: string | number | boolean | { [key: string]: any }): void => {
    const paradoxModules = getParadoxModules(world); // Retrieve current paradoxModules

    // Check if the value is an object (excluding arrays and null)
    if (isObject(value)) {
        paradoxModules[key] = value; // If it's an object, assign directly
    } else {
        paradoxModules[key] = value; // Otherwise, assign the primitive value
    }

    updateParadoxModules(world, paradoxModules); // Save the updated paradoxModules to the world dynamic property
};

/**
 * Gets a specific setting from `paradoxModules`.
 * This function provides easy access to retrieve a single value by key from the `paradoxModules` object.
 *
 * @param {World} world - The Minecraft world instance.
 * @param {string} key - The key to retrieve from `paradoxModules`.
 * @returns {any} - The value associated with the given key.
 *
 * @example
 * // Retrieving a specific setting from paradoxModules
 * const someSetting = getSettingFromParadoxModules(world, 'someNewSetting');
 * console.log(someSetting); // Outputs: true or false depending on the setting
 */
export const getSettingFromParadoxModules = (world: World, key: string): any => {
    const paradoxModules = getParadoxModules(world);
    return paradoxModules[key]; // Return the value associated with the key
};

/**
 * Initializes the tracking of `paradoxModules` and ensures it's up to date by fetching it into the cache.
 * This function should be called once when your script starts to make sure that `paradoxModules` is accessible.
 *
 * @param {World} world - The Minecraft world instance.
 *
 * @example
 * // Initialize paradoxModules tracking on script start
 * initializeParadoxModules(world);
 */
export const initializeParadoxModules = (world: World): void => {
    // Retrieve and ensure the latest state of paradoxModules by populating the cache
    getParadoxModules(world); // Ensures the cache is populated and up to date
};
