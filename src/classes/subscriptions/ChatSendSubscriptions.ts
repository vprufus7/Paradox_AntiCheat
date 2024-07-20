import { commandHandler } from "../../paradox";
import { world, ChatSendBeforeEvent } from "@minecraft/server";

/**
 * Class representing a subscription to the chat send event.
 */
class ChatSendSubscription {
    private callback: ((event: ChatSendBeforeEvent) => void) | null;

    /**
     * Constructs a new instance of ChatSendSubscription.
     * Initializes the callback as null.
     */
    constructor() {
        this.callback = null;
    }

    /**
     * Subscribes to the chat send event.
     * If the subscription is not already active, subscribes to the chat send event and handles the command.
     */
    subscribe() {
        if (this.callback === null) {
            // Define the callback function.
            this.callback = (event: ChatSendBeforeEvent) => {
                const player = event.sender;
                event.cancel = true;
                commandHandler.handleCommand(event, player);
            };
            // Subscribe using the callback.
            world.beforeEvents.chatSend.subscribe(this.callback);
        }
    }

    /**
     * Unsubscribes from the chat send event.
     * If the callback is active, unsubscribes from the chat send event.
     */
    unsubscribe() {
        if (this.callback !== null) {
            world.beforeEvents.chatSend.unsubscribe(this.callback);
            this.callback = null; // Set to null after unsubscribing to indicate no active subscription.
        }
    }
}

/**
 * An instance of ChatSendSubscription used for managing chat send event subscriptions.
 */
export const chatSendSubscription = new ChatSendSubscription();
