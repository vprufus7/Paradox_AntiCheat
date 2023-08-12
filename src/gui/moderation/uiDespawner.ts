import { EntityItemComponent, EntityQueryOptions, Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export async function uiDESPAWNER(despawnerResult: ModalFormResponse, player: Player) {
    const [entityValue, DespawnAllToggle] = despawnerResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }
    // try to find the entity or despawn them all if requested
    const filter: EntityQueryOptions = {
        excludeTypes: ["player"],
    };
    const filteredEntities = world.getDimension("overworld").getEntities(filter);
    if (DespawnAllToggle === false) {
        // Specified entity
        let counter = 0;
        let requestedEntity: string = "";
        for (const entity of filteredEntities) {
            const filteredEntity = entity.typeId.replace("minecraft:", "");
            requestedEntity = (entityValue as string).replace("minecraft:", "");
            // If an entity was specified then handle it here
            if (filteredEntity === requestedEntity || filteredEntity === entityValue) {
                counter = ++counter;
                // Despawn this entity
                entity.triggerEvent("paradox:kick");
                continue;
                // If all entities were specified then handle this here
            }
        }
        if (counter > 0) {
            sendMsgToPlayer(player, ` §6|§f §4[§f${requestedEntity}§4]§f §6Amount: §4x${counter}§f`);
        } else {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f No entity found to despawn!`);
        }
    }
    if (DespawnAllToggle === true) {
        const entityCount: { [key: string]: number } = {};
        for (const entity of filteredEntities) {
            let filteredEntity = entity.typeId.replace("minecraft:", "");
            if (filteredEntity === "item") {
                const itemContainer = entity.getComponent("item") as unknown as EntityItemComponent;
                const itemName = itemContainer.itemStack;
                if (itemName !== undefined) {
                    filteredEntity = itemName.typeId.replace("minecraft:", "");
                }
            }
            if (!entityCount[filteredEntity]) {
                entityCount[filteredEntity] = 1;
            } else {
                entityCount[filteredEntity]++;
            }
            // Despawn this entity
            entity.triggerEvent("paradox:kick");
        }
        let totalCounter = 0;
        let entityMessage = "";
        for (const entity in entityCount) {
            if (entityCount.hasOwnProperty(entity)) {
                const count = entityCount[entity];
                if (count > 0) {
                    entityMessage += ` §6|§f §4[§f${entity}§4]§f §6Amount: §4x${count}§f\n`;
                    totalCounter += count;
                }
            }
        }
        if (totalCounter > 0) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Despawned:`);
            sendMsgToPlayer(player, entityMessage);
        } else {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f No entities found to despawn!`);
        }
    }
    return paradoxui;
}
