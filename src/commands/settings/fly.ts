import { ChatSendAfterEvent, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";
import { MinecraftEnvironment } from "../../classes/container/Dependencies";
import { FlyCheck } from "../../modules/fly";

/**
 * Represents the antifly command.
 */
export const flyCheckCommand: Command = {
    name: "antifly",
    description: "Toggles checks for illegal flying.",
    usage: "{prefix}antifly [ help ]",
    examples: [`{prefix}antifly`, `{prefix}antifly help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the antifly command.
     * @param {ChatSendAfterEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendAfterEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const world = minecraftEnvironment.getWorld();
        const moduleKey = "paradoxModules";

        // Get Dynamic Property Boolean
        const paradoxModules: { [key: string]: boolean | number | string | Vector3 } = JSON.parse(world.getDynamicProperty(moduleKey) as string) || {};
        const antiflyBoolean = (paradoxModules["flyCheck_b"] as boolean) || false;

        if (antiflyBoolean === false) {
            // Allow
            paradoxModules["flyCheck_b"] = true;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§4[§6Paradox§4]§o§7 AntiFly has been §aenabled§7.`);
            FlyCheck();
        } else {
            // Deny
            paradoxModules["flyCheck_b"] = false;
            world.setDynamicProperty(moduleKey, JSON.stringify(paradoxModules));
            player.sendMessage(`§4[§6Paradox§4]§o§7 AntiFly has been §4disabled§7.`);
        }
    },
};
