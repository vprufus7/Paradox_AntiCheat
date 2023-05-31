import { Player, world } from "@minecraft/server";
import { ModalFormResponse } from "@minecraft/server-ui";
import { sendMsg, sendMsgToPlayer } from "../../util";

export function UIREPORTPLAYER(reportplayerResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value, reason] = reportplayerResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    if (!member) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r !report <player> <reason>§r`);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Make sure they dont report themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot report yourself.`);
    }

    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Reported ${member.name}§r with reason: ${reason}`);

    sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.name}§r has reported ${member.name}§r with reason: ${reason}`);

    return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Your Report has been sent.`);
}
