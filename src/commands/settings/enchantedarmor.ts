import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, getScore, sendMsg, sendMsgToPlayer } from "../../util.js";

function enchantedArmorHelp(player: Player, prefix: string, encharmorscore: number) {
    let commandStatus: string;
    if (!config.customcommands.enchantedarmor) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (encharmorscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: enchantedarmor`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: enchantedarmor [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles Anti Enchanted Armor for all players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}enchantedarmor`,
        `    ${prefix}enchantedarmor help`,
    ]);
}

/**
 * @name enchantedarmor
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function enchantedarmor(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/enchantedarmor.js:33)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    const encharmorscore = getScore("encharmor", player);

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.enchantedarmor) {
        return enchantedArmorHelp(player, prefix, encharmorscore);
    }

    if (encharmorscore <= 0) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config encharmor 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has enabled §6Anti Enchanted Armor§r!`);
    } else if (encharmorscore >= 1) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config encharmor 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.name}§r has disabled §4Anti Enchanted Armor§r!`);
    }
    return await player.runCommandAsync(`scoreboard players operation @a encharmor = paradox:config encharmor`);
}
