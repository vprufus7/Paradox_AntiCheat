import { Player } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";

export const tpaCommand: Command = {
    name: "tpa",
    description: "Assistance to teleport to a player or vice versa.",
    usage: "{prefix}tpa <player> <player>",
    examples: [`{prefix}tpa Lucy Steve`, `{prefix}tpa Steve Lucy`, `{prefix}tpa help`],
    execute: (message, args, minecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Function to look up a player and retrieve the object
        function getPlayerObject(playerName: string): Player {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        // Check if player arguments are provided
        if (args.length < 2) {
            message.sender.sendMessage("§o§7Please provide at least two player names.");
            return;
        }

        // Extract player names based on the number of arguments
        let player1Name: string, player2Name: string;
        let target1: Player, target2: Player;

        if (args.length === 2) {
            // Case 1: Two arguments represent the first name of both players
            [player1Name, player2Name] = args.map((arg) => arg.replace(/[@"]/g, "").trim());
        } else if (args.length === 4) {
            // Case 2: Four arguments represent the first and last name of both players
            [player1Name, player2Name] = [`${args[0]} ${args[1]}`, `${args[2]} ${args[3]}`].map((name) => name.replace(/[@"]/g, "").trim());
        } else if (args.length === 3) {
            // Case 3: Three arguments represent either the first and last name of one player and the first name of the other player
            // or vice versa. We'll check both possibilities and choose the one that results in valid player names.
            const [name1, name2, name3] = args.map((arg) => arg.replace(/[@"]/g, "").trim());

            // Check if name1 and name2 represent player 1's full name, and name3 represents player 2's first name
            const possiblePlayer1Name = `${name1} ${name2}`;
            const possiblePlayer2Name = name3;

            // Check if name1 represents player 1's first name, and name2 and name3 represent player 2's full name
            const anotherPossiblePlayer1Name = name1;
            const anotherPossiblePlayer2Name = `${name2} ${name3}`;

            // Check if the assumed player names are valid
            const possiblePlayer1 = getPlayerObject(possiblePlayer1Name);
            const possiblePlayer2 = getPlayerObject(possiblePlayer2Name);
            const anotherPossiblePlayer1 = getPlayerObject(anotherPossiblePlayer1Name);
            const anotherPossiblePlayer2 = getPlayerObject(anotherPossiblePlayer2Name);

            // Choose the valid player names
            if ((possiblePlayer1 && possiblePlayer1.isValid() && possiblePlayer2 && possiblePlayer2.isValid()) || (anotherPossiblePlayer1 && anotherPossiblePlayer1.isValid() && anotherPossiblePlayer2 && anotherPossiblePlayer2.isValid())) {
                player1Name = possiblePlayer1 ? possiblePlayer1Name : anotherPossiblePlayer1Name;
                player2Name = possiblePlayer2 ? possiblePlayer2Name : anotherPossiblePlayer2Name;
                // Now, determine which player objects to assign to target1 and target2 based on the chosen names
                const [validPlayer1, validPlayer2] = possiblePlayer1 ? [possiblePlayer1, possiblePlayer2] : [anotherPossiblePlayer1, anotherPossiblePlayer2];
                target1 = validPlayer1;
                target2 = validPlayer2;
            } else {
                // None of the assumptions are valid
                message.sender.sendMessage("§o§7Invalid player names provided.");
                return;
            }
        }

        system.run(() => {
            if (!player1Name || !player2Name) {
                message.sender.sendMessage("§o§7Please provide at least two player names.");
                return;
            }

            if (!target1 || !target1.isValid()) {
                message.sender.sendMessage(`§o§7Player '${player1Name}' not found or not valid.`);
                return;
            }

            if (!target2 || !target2.isValid()) {
                message.sender.sendMessage(`§o§7Player '${player2Name}' not found or not valid.`);
                return;
            }

            const result = target1.tryTeleport(target2.location, { dimension: target2.dimension, rotation: target2.getRotation(), facingLocation: target2.getViewDirection(), checkForBlocks: true, keepVelocity: false });

            if (!result) {
                message.sender.sendMessage("§o§7Unable to teleport. Please try again.");
            } else {
                message.sender.sendMessage(`§o§7Teleported '${target1.name}' to '${target2.name}'.`);
            }
        });
    },
};
