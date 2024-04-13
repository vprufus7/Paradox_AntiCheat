import { chatSendSubscription } from "./classes/subscriptions/ChatSendSubscriptions";
import { subscribeToWorldInitialize } from "./eventListeners/worldInitialize";
import { clearSecretKey } from "./security/generateRandomKey";
import { CommandHandler } from "./classes/CommandHandler";
import { world } from "@minecraft/server";
import { secretKey } from "./security/generateRandomKey";
import { opCommand } from "./commands/moderation/op";
import { MinecraftEnvironment } from "./classes/container/Dependencies";
import { deopCommand } from "./commands/moderation/deop";
import { punishCommand } from "./commands/moderation/punish";
import { vanishCommand } from "./commands/moderation/vanish";
import { prefixCommand } from "./commands/moderation/prefix";
import { despawnCommand } from "./commands/moderation/despawn";
import { kickCommand } from "./commands/moderation/kick";
import { lockdownCommand } from "./commands/moderation/lockdown";

// Subscribe to chat send events
chatSendSubscription.subscribe();

// Subscribe to world initialization events
subscribeToWorldInitialize();

// Ensure the security key is set
let checkKey = world.getDynamicProperty("securityKey");
if (!checkKey || typeof checkKey !== "string") {
    world.setDynamicProperty("securityKey", secretKey);
}
checkKey = null;

// Get the Minecraft environment instance
const minecraftEnvironment = MinecraftEnvironment.getInstance();

// Initialize the CommandHandler with the security key and Minecraft environment
const commandHandler = new CommandHandler(world.getDynamicProperty("securityKey") as string, minecraftEnvironment);

// Register commands with the CommandHandler
commandHandler.registerCommand([opCommand, deopCommand, punishCommand, vanishCommand, prefixCommand, despawnCommand, kickCommand, lockdownCommand]);

// Clear the secret key
clearSecretKey();

export { commandHandler };
