import { ChatSendAfterEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { WorldBorder } from "../../modules/world-border";

/**
 * Represents the worldborder command.
 */
export const worldBorderCommand: Command = {
    name: "worldborder",
    description: "Sets the world border and restricts players to that border.",
    usage: `{prefix}worldborder [ --overworld | -o <size> ] [ --nether | -n <size> ]
            [ --end | -e <size> ] [ -d | --disable ] [ -l | --list ]`,
    examples: [
        `{prefix}worldborder -o 10000 -n 5000 -e 10000`,
        `{prefix}worldborder --overworld 10000 --nether 5000`,
        `{prefix}worldborder --overworld 10000`,
        `{prefix}worldborder --nether 5000`,
        `{prefix}worldborder -n 5000`,
        `{prefix}worldborder disable`,
        `{prefix}worldborder -l`,
        `{prefix}worldborder --list`,
    ],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the worldborder command.
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        const modeKeys = {
            overworld: "overworldSize_n",
            nether: "netherSize_n",
            end: "endSize_n",
            worldBorderCheck: "worldBorderCheck_b",
        };

        let paradoxModules: { [key: string]: boolean | number } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};

        // Initial mode states
        const modeStates = {
            overworld: paradoxModules[modeKeys.overworld] ?? 0,
            nether: paradoxModules[modeKeys.nether] ?? 0,
            end: paradoxModules[modeKeys.end] ?? 0,
            worldBorderCheck: paradoxModules[modeKeys.worldBorderCheck] ?? false,
        };

        if (!args.length) {
            const prefix = (world.getDynamicProperty("__prefix") as string) || "!";
            player.sendMessage(`§f§4[§6Paradox§4]§o§7 Usage: {prefix}worldborder <value> [optional]. For help, use ${prefix}worldborder help.`);
            return;
        }

        if (args[0] === "--disable" || args[0] === "-d") {
            player.sendMessage(`§4[§6Paradox§4]§o§7 World Border has been §4disabled§7.`);
            paradoxModules[modeKeys.worldBorderCheck] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            return;
        }

        if (args[0] === "-l" || args[0] === "--list") {
            player.sendMessage(
                [
                    `§4[§6Paradox§4]§o§7 Current World Border Settings:`,
                    `  | §7World Border Check: ${modeStates.worldBorderCheck ? "§aEnabled§7" : "§4Disabled§7"}`,
                    `  | §7Overworld Border Size§7: §4[ §f${modeStates.overworld}§4 ]§7`,
                    `  | §7Nether Border Size§7: §4[ §f${modeStates.nether}§4 ]§7`,
                    `  | §7End Border Size§7: §4[ §f${modeStates.end}§4 ]§7`,
                ].join("\n")
            );
            return;
        }

        const paramIndexes: { [key: string]: number } = {
            "--overworld": -1,
            "-o": -1,
            "--nether": -1,
            "-n": -1,
            "--end": -1,
            "-e": -1,
        };

        for (let i = 0; i < args.length; i++) {
            if (paramIndexes[args[i]] !== undefined) {
                paramIndexes[args[i]] = i;
            }
        }

        let overworldSize = modeStates.overworld as number;
        let netherSize = modeStates.nether as number;
        let endSize = modeStates.end as number;

        for (let i = 0; i < args.length; i++) {
            const arg = args[i].toLowerCase();
            switch (arg) {
                case "--overworld":
                case "-o":
                    overworldSize = Number(args[i + 1]);
                    break;
                case "--nether":
                case "-n":
                    netherSize = Number(args[i + 1]);
                    break;
                case "--end":
                case "-e":
                    endSize = Number(args[i + 1]);
                    break;
            }
        }

        if (overworldSize || netherSize || endSize) {
            player.sendMessage(
                [
                    `§4[§6Paradox§4]§o§7 World Border has been ${modeStates.worldBorderCheck ? "§aupdated§7" : "§aenabled§7"}!`,
                    `  | §fOverworld§7: §4[ §7${overworldSize}§4 ]§7`,
                    `  | §fNether§7: §4[ §7${netherSize}§4 ]§7`,
                    `  | §fEnd§7: §4[ §7${endSize}§4 ]§f`,
                ].join("\n")
            );

            paradoxModules[modeKeys.worldBorderCheck] = true;
            paradoxModules[modeKeys.overworld] = Math.abs(overworldSize);
            paradoxModules[modeKeys.nether] = Math.abs(netherSize);
            paradoxModules[modeKeys.end] = Math.abs(endSize);
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            WorldBorder();
            return;
        }

        const prefix = (world.getDynamicProperty("__prefix") as string) || "!";
        player.sendMessage(`§f§4[§6Paradox§4]§o§7 Invalid arguments. For help, use ${prefix}worldborder help.`);
    },
};
