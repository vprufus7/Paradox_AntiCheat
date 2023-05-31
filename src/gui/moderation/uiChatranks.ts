import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiCHATRANKS(notifyResult: ModalFormResponse, onlineList: string[], predefinedrank: string[], player: Player) {
    const [value, predefinedrankvalue, customrank, ChatRanksToggle] = notifyResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to enable Notifications.`);
    }
    if (!customrank) {
        try {
            const memberscurrentags = member.getTags();
            let custom: string;
            memberscurrentags.forEach((t) => {
                if (t.startsWith("Rank:")) {
                    custom = t;
                }
            });
            if (member.hasTag(custom)) {
                member.removeTag(custom);
            }
        } catch (error) {
            //This will throw if the player has no tags
            //sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
        }
        member.addTag("Rank:" + predefinedrank[predefinedrankvalue as number]);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has updated ${member.name} Rank.`);
        return paradoxui(player);
    }
    if (customrank) {
        try {
            const memberscurrentags = member.getTags();
            let custom: string;
            memberscurrentags.forEach((t) => {
                if (t.startsWith("Rank:")) {
                    custom = t;
                }
            });
            if (member.hasTag(custom)) {
                member.removeTag(custom);
            }
        } catch (error) {
            // This will throw if the player has no tags that match.
            //sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Something went wrong! Error: ${error}`);
        }
        member.addTag("Rank:" + customrank);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has updated ${member.name} Rank.`);
        if (ChatRanksToggle === true && chatRanksBoolean === false) {
            // Allow
            dynamicPropertyRegistry.set("chatranks_b", true);
            world.setDynamicProperty("chatranks_b", true);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6ChatRanks§r!`);
        }
        if (ChatRanksToggle === false && chatRanksBoolean === true) {
            // Deny
            dynamicPropertyRegistry.set("chatranks_b", false);
            world.setDynamicProperty("chatranks_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4ChatRanks§r!`);
        }
        return paradoxui(player);
    }
    return paradoxui;
}
