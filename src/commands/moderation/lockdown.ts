import { PlayerSpawnAfterEvent } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

// Define the lockdownCommand object
export const lockdownCommand: Command = {
    name: "lockdown",
    description: "Initiates server lockdown for maintenance.",
    usage: "{prefix}lockdown [optional]",
    examples: [`{prefix}lockdown`, `{prefix}lockdown help`],
    execute: (message, _, minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const playerSpawnSubscription = minecraftEnvironment.getPlayerSpawnSubscription();

        // Get Dynamic Property Boolean to check if the server is already in lockdown
        const lockdownBoolean = world.getDynamicProperty("lockdown_b");

        // If already locked down, unlock the server and return
        if (lockdownBoolean) {
            player.sendMessage(`§o§7Server lockdown has been disabled!`);
            world.setDynamicProperty("lockdown_b", false); // Set lockdown_b to false to unlock the server
            playerSpawnSubscription.unsubscribe(lockDownMonitor); // Unsubscribe from playerSpawnSubscription
            return;
        }

        // Default reason for locking it down
        const reason = "Under Maintenance! Sorry for the inconvenience.";

        // Run the lockdown operation asynchronously
        system.run(() => {
            // Lock down the server
            const players = world.getAllPlayers();
            for (const target of players) {
                const playerPerms = target.getDynamicProperty(`__${target.id}`);
                const worldPerms = world.getDynamicProperty(`__${target.id}`);
                if (!worldPerms || worldPerms !== playerPerms) {
                    // Kick players from server
                    world.getDimension(target.dimension.id).runCommandAsync(`kick ${target.name} §o§7\n\n${reason}`);
                }
            }
            // Set lockdown_b to true to indicate server lockdown
            world.setDynamicProperty("lockdown_b", true);
            player.sendMessage(`§o§7Server lockdown has been enabled!`);

            // Subscribe to playerSpawnSubscription
            playerSpawnSubscription.subscribe(lockDownMonitor);
        });

        // Function to monitor player spawns during lockdown
        function lockDownMonitor(object: PlayerSpawnAfterEvent) {
            // Default reason for locking it down
            const reason = "Under Maintenance! Sorry for the inconvenience.";
            if (object.initialSpawn === true) {
                const playerPerms = object.player.getDynamicProperty(`__${object.player.id}`);
                const worldPerms = world.getDynamicProperty(`__${object.player.id}`);
                if (!worldPerms || worldPerms !== playerPerms) {
                    // Kick players from server
                    world.getDimension(object.player.dimension.id).runCommandAsync(`kick ${object.player.name} §o§7\n\n${reason}`);
                    return;
                }
            }
        }
    },
};
