import { PlayerLeaveAfterEvent, PlayerSpawnAfterEvent, world, Player } from "@minecraft/server";

// Subscription holders for enabling/disabling
let playerSpawnSubscription: ((arg: PlayerSpawnAfterEvent) => void) | null = null;
let playerLeaveSubscription: ((arg: PlayerLeaveAfterEvent) => void) | null = null;

// Configurable constants
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 16;
const BAN_REASON = "Namespoofing";

// Dictionary to track logged-in player names for collision detection
const playerNameMap = new Map<string, Player>();

/**
 * Checks if a player's name violates naming conventions and initiates kick or ban actions.
 * @param {Player} player - The player whose name is being validated.
 */
function checkNamespoof(player: Player) {
    const banRegex = /[^\x00-\x7F]|[/:\\*?"<>]|^\.$|\.$/gu;
    const kickRegex = /^(?![A-Za-z0-9_\s]{3,16}$).*$/g;
    const nameLength = player.name.length;

    // Check for invalid name length or banned characters
    if (nameLength < MIN_NAME_LENGTH || nameLength > MAX_NAME_LENGTH || banRegex.test(player.name)) {
        banPlayer(player);
    } else if (kickRegex.test(player.name)) {
        kickPlayer(player);
    } else {
        checkDuplicateName(player);
    }
}

/**
 * Checks if a player's name has duplicates and kicks the player with the same base name.
 * @param {Player} player - The player being checked for name duplication.
 */
function checkDuplicateName(player: Player) {
    const baseName = player.name.replace(/\(\d+\)$/, "");

    if (playerNameMap.has(baseName)) {
        kickPlayer(player); // Kick the duplicate
    } else {
        playerNameMap.set(baseName, player);
    }
}

/**
 * Kicks a player from the server with a message.
 * @param {Player} player - The player to be kicked.
 */
function kickPlayer(player: Player) {
    const dimension = world.getDimension(player.dimension.id);
    dimension.runCommandAsync(`kick ${player.name} §o§7\n\n${BAN_REASON}`);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Player "${player.name}" has been kicked for: ${BAN_REASON}`);
}

/**
 * Bans a player, adds them to the banned list, and then kicks them.
 * @param {Player} player - The player to be banned.
 */
function banPlayer(player: Player) {
    try {
        const bannedPlayersString = (world.getDynamicProperty("bannedPlayers") as string) || "[]";
        const bannedPlayers = JSON.parse(bannedPlayersString);

        if (!bannedPlayers.includes(player.name)) {
            bannedPlayers.push(player.name);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
        }

        player.addTag(`paradoxBanned:${BAN_REASON}`);
        kickPlayer(player);
    } catch (error) {
        console.error(`Failed to ban player: ${error}`);
    }
}

/**
 * Starts the Namespoof detection by subscribing to playerSpawn and playerLeave events.
 */
export function startNamespoofDetection() {
    if (!playerSpawnSubscription) {
        playerSpawnSubscription = world.afterEvents.playerSpawn.subscribe((event) => {
            if (event.initialSpawn) {
                checkNamespoof(event.player);
            }
        });
    }

    if (!playerLeaveSubscription) {
        playerLeaveSubscription = world.afterEvents.playerLeave.subscribe((event) => {
            const baseName = event.playerName.replace(/\d+$/, "");
            playerNameMap.delete(baseName); // Remove player from map when they leave
        });
    }
}

/**
 * Stops the Namespoof detection by unsubscribing from events and clearing the name map.
 */
export function stopNamespoofDetection() {
    if (playerSpawnSubscription) {
        world.afterEvents.playerSpawn.unsubscribe(playerSpawnSubscription);
        playerSpawnSubscription = null;
    }
    if (playerLeaveSubscription) {
        world.afterEvents.playerLeave.unsubscribe(playerLeaveSubscription);
        playerLeaveSubscription = null;
    }
    playerNameMap.clear();
}
