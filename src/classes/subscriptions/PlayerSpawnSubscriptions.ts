// PlayerSpawnSubscription.js

import { PlayerSpawnAfterEvent, world } from "@minecraft/server";

// Define an interface to describe the structure of each subscription object
interface Subscription {
    callback: (object: PlayerSpawnAfterEvent) => void;
    subscription: any; // Replace 'any' with the actual type of the subscription object if possible
}

class PlayerSpawnSubscription {
    private subscriptions: Subscription[];

    constructor() {
        this.subscriptions = []; // Initialize subscriptions array
    }

    subscribe(callback: (object: PlayerSpawnAfterEvent) => void) {
        // Check if the callback function is already subscribed
        if (!this.subscriptions.some((sub) => sub.callback === callback)) {
            // Subscribe to the event and add the callback function to the subscriptions array
            const subscription = world.afterEvents.playerSpawn.subscribe(callback);
            this.subscriptions.push({ callback, subscription });
        }
    }

    unsubscribe(callback: (object: PlayerSpawnAfterEvent) => void) {
        // Find the subscription corresponding to the callback function
        const index = this.subscriptions.findIndex((sub) => sub.callback === callback);
        if (index !== -1) {
            // Unsubscribe from the event and remove the subscription from the subscriptions array
            this.subscriptions[index].subscription.unsubscribe();
            this.subscriptions.splice(index, 1);
        }
    }
}

export const playerSpawnSubscription = new PlayerSpawnSubscription();
