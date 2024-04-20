import { commandHandler } from "../../paradox";
import { world, ChatSendBeforeEvent } from "@minecraft/server";

/**
 * Class representing a subscription to the chat send event.
 */
class ChatSendSubscription {
    private subscription: any;

    /**
     * Constructs a new instance of ChatSendSubscription.
     * Initializes the subscription as null.
     */
    constructor() {
        this.subscription = null;
    }

    /**
     * Subscribes to the chat send event.
     * If the subscription is not already active, subscribes to the chat send event and handles the command.
     */
    subscribe() {
        if (!this.subscription) {
            this.subscription = world.beforeEvents.chatSend.subscribe((object: ChatSendBeforeEvent) => {
                const player = object.sender;
                object.cancel = true;
                commandHandler.handleCommand(object, player);
            });
        }
    }

    /**
     * Unsubscribes from the chat send event.
     * If the subscription is active, unsubscribes from the chat send event.
     */
    unsubscribe() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }
    }
}

/**
 * An instance of ChatSendSubscription used for managing chat send event subscriptions.
 */
export const chatSendSubscription = new ChatSendSubscription();
