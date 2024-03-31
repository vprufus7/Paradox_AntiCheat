import { chatSendSubscription } from "./classes/subscriptions/ChatSendSubscriptions";
import { subscribeToWorldInitialize } from "./eventListeners/worldInitialize";
import { clearSecretKey } from "./security/generateRandomKey";

chatSendSubscription.subscribe();

subscribeToWorldInitialize();
clearSecretKey();
