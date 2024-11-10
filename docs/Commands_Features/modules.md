<img src="https://i.imgur.com/FZFyMMl.png" alt="Lets Go"> </img>

!> This documentation could change with any version. So be sure to check it once in a while.

## !afk

### At A Glance

The AFK command serves as a toggle that allows users to enable or disable the AFK management module. This module is designed to automatically kick players from the server/realm if they remain inactive for a specified period.

### Default Settings

By default, the AFK module is set to kick players after 10 minutes of inactivity. However, this duration can be easily customized through the command itself.

### How It Works

The AFK module operates by periodically checking each player's movement. Specifically, it monitors the player's velocity—if a player’s velocity remains at zero (indicating no movement) for the duration of the set timer, the module flags the player as AFK. Once flagged, if the player remains inactive, they will be kicked from the server/realm.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!afk [ hours ] [ minutes ] [ seconds ]",
> Example: !afk 0 10 0
> ```

## !autoclicker

### At A Glance

The autoclicker command toggles the auto-clicker detection module, a tool designed to identify and prevent players from using auto-clicker hacks that provides an unfair advantage.

### How It Works

The auto-clicker detection module is designed to monitor and regulate the rate at which players click, ensuring that no one gains an unfair advantage by using auto-clicking software/hacks. The module tracks each player's clicks per second (CPS) and takes corrective action if the CPS exceeds a predefined threshold.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!autoclicker [ help ]",
> Example: !autoclicker
> ```

## !antifly

### At A Glance

The antifly command acts as a toggle to enable or disable the anti-fly detection module. This module is designed to monitor player movements and detect unauthorized flying activities, helping to prevent cheating and maintain fair gameplay. By enabling this module, server administrators can ensure that players are not using exploits or hacks to fly in game modes where flying is not allowed.

### How it works

The anti-fly detection module operates by continuously monitoring the status and movements of players in the server. The module evaluates two key conditions: whether the player is currently falling (isFalling) and whether the player is flying (isFlying).
If a player is detected as flying without falling and they are in Survival or Adventure mode, it suggests that they may be using an exploit to fly, as falling is the natural consequence of being airborne in these modes without valid flying mechanics (like using an Elytra).

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!antifly [ help ]",
> Example: !antifly
> ```

## !gamemode

### At A Glance

The gamemode command provides administrators with the ability to manage and configure allowed game modes on the server. With this command, users can permit or restrict specific game modes, ensuring that players adhere to the intended gameplay experience. Additionally, it can be used to list the current game mode configurations, offering a quick overview of the server's allowed modes.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!antifly [ help ]",
> Example: !antifly
> ```

## !killaura

### At A Glance

The Killaura detection module is designed to identify and mitigate the use of illegal attack automation (commonly known as "killaura") on the server. By analyzing player behavior—such as attack speed, distance, and orientation—this module can detect suspicious activities and prevent unfair gameplay by restoring health to victims of potential cheaters. This ensures a balanced and fair experience for all players on the server.

### How It Works

The Killaura detection module monitors player attacks to identify and counteract suspicious behavior. It tracks attack frequency, ensuring players don't exceed the maximum allowed rate of 12 attacks per second. It also checks the distance between the attacker and the target, and verifies that the attacker is facing the target within a specified angle. If any of these criteria are breached, the module flags the behavior as suspicious and restores the health of the attacked player to mitigate any unfair advantage, thus promoting fair play on the server.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!killaura [ help ]",
> Example: !killaura
> ```

## !lagclear

### At A Glance

The !lagclear command is designed to manage server performance by removing excess items and entities through a timed operation. Administrators can specify the duration of the lag-clear process in hours, minutes, and seconds, or use default settings for an immediate action. This command helps maintain server efficiency and reduce lag by periodically clearing unnecessary items and entities.

### How It Works

The !lagclear module initiates a timed process to clear server lag by removing excess items and entities. Administrators set a countdown period, and the command generates a countdown with periodic messages to inform players of the upcoming lag-clear. When the countdown ends, the command clears items and entities from the server to improve performance. This process is continuously monitored, and if the lag-clear functionality is disabled, the operation is halted, and any scheduled tasks are cleared.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!lagclear [ hours ] [ minutes ] [ seconds ]"
> Example: !lagclear 0 15 0
> ```

## !namespoof

Toggles the name-spoof detection module.

?> This section is currently under development. Detailed documentation will be provided soon.

## !platformblock

Blocks players from joining based on their platform or lists current platform restrictions.

?> This section is currently under development. Detailed documentation will be provided soon.

## !reach

Toggles the module that checks if players are hit from a fair distance.

?> This section is currently under development. Detailed documentation will be provided soon.

## !scaffold

Toggles the scaffold detection module.

?> This section is currently under development. Detailed documentation will be provided soon.

## !spam

Toggles chat spam checks [ Default: 2 Minutes ].

?> This section is currently under development. Detailed documentation will be provided soon.

## !worldborder

Sets the world border and restricts players to that border.

?> This section is currently under development. Detailed documentation will be provided soon.
