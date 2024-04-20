import { ChatSendBeforeEvent, EntityQueryOptions } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";

/**
 * Represents the despawn command.
 */
export const despawnCommand: Command = {
    name: "despawn",
    description: "Despawns all or specified entities if they exist.",
    usage: "{prefix}despawn <entity_type | all>",
    examples: [`{prefix}despawn all`, `{prefix}despawn iron_golem`, `{prefix}despawn "iron_golem"`, `{prefix}despawn help`],
    category: "Moderation",

    /**
     * Executes the despawn command.
     * @param {Message} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        const parameter = args.join(" ").trim().replace(/["@]/g, "");

        system.run(() => {
            const filter: EntityQueryOptions = { excludeTypes: ["player"] };
            const filteredEntities = world.getDimension("overworld").getEntities(filter);

            const despawnedEntities = new Map();

            filteredEntities.forEach((entity) => {
                const typeId = entity.typeId.replace("minecraft:", "");
                const isAllRequested = parameter === "all";

                if (isAllRequested || typeId === parameter || typeId === parameter.replace("minecraft:", "")) {
                    const count = despawnedEntities.get(typeId) || 0;
                    despawnedEntities.set(typeId, count + 1);
                    entity.remove();
                }
            });

            if (despawnedEntities.size > 0) {
                message.sender.sendMessage("\n§o§7Despawned:");
                despawnedEntities.forEach((count, entity) => {
                    message.sender.sendMessage(` §o§7| [§f${entity}§7] Amount: §4x${count}§f`);
                });
            } else {
                message.sender.sendMessage("§o§7No entities found to despawn!");
            }
        });
    },
};
