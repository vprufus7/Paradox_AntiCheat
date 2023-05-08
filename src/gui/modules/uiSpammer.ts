import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { SpammerA } from "../../penrose/beforechatevent/spammer/spammer_a.js";
import { SpammerB } from "../../penrose/beforechatevent/spammer/spammer_b.js";
import { SpammerC } from "../../penrose/beforechatevent/spammer/spammer_c.js";
import { SpammerD } from "../../penrose/beforechatevent/spammer/spammer_d.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";

export function uiSPAMMER(spamResult: ModalFormResponse, player: Player) {
    const [SpammerAToggle, SpammerBToggle, SpammerCToggle, SpammerDToggle] = spamResult.formValues;
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Get Dynamic Property Boolean
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");
    const spammerBBoolean = dynamicPropertyRegistry.get("spammerb_b");
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");
    const spammerDBoolean = dynamicPropertyRegistry.get("spammerd_b");
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to configure Spammer`);
    }
    if (SpammerAToggle === true && spammerABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammera_b", true);
        world.setDynamicProperty("spammera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerA§r!`);
        SpammerA();
    }
    if (SpammerAToggle === false && spammerABoolean === true) {
        //Deny
        dynamicPropertyRegistry.set("spammera_b", false);
        world.setDynamicProperty("spammera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerA§r!`);
    }
    if (SpammerBToggle === true && spammerBBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammerb_b", true);
        world.setDynamicProperty("spammerb_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerB§r!`);
        SpammerB();
    }
    if (SpammerBToggle === false && spammerBBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("spammerb_b", false);
        world.setDynamicProperty("spammerb_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerB§r!`);
    }
    if (SpammerCToggle === true && spammerCBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammerc_b", true);
        world.setDynamicProperty("spammerc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerC§r!`);
        SpammerC();
    }
    if (SpammerCToggle === false && spammerCBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("spammerc_b", false);
        world.setDynamicProperty("spammerc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerC§r!`);
    }
    if (SpammerDToggle === true && spammerDBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammerd_b", true);
        world.setDynamicProperty("spammerd_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerD§r!`);
        SpammerD();
    }
    if (SpammerDToggle === false && spammerDBoolean == true) {
        // Deny
        dynamicPropertyRegistry.set("spammerd_b", false);
        world.setDynamicProperty("spammerd_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerD§r!`);
    }

    //show the main ui to the player once complete.
    return paradoxui(player);
}
