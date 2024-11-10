<img src="https://i.imgur.com/FZFyMMl.png" alt="Lets Go"> </img>

!> This documentation could change with any version. So be sure to check it once in a while.

## !channels

### At A Glance

The !channels command provides players with ability to manage chat channels this allows them to create, join, invite, leave, and transfer ownership of created channels.

### How It Works

This works by managing player chat channels, including creating, joining, inviting, leaving, and transferring channel ownership. It stores channel data, with each channel having an owner and members, and dynamically updates this data. When a player uses the channel command,it processes arguments to execute the specified action. Invitations include a timeout, after which they automatically expire. The command also checks permissions and updates players on channel changes, ensuring smooth, real-time management of private chat channels.

!> Required Clearance Level To Execute: 1

> ```
> Usage: "!channel <create | join | invite | leave | transfer | help>"
> Example: !channel create --room myTeam
> Example: !channel join --room myTeam
> Example: !channel transfer --room myTeam --target Visual1mpact
> ```

## !home

### At A Glance

The !home command provides players with ability to manage locations this allows them to save, delete, and teleport to those saved locations

### How It Works

The !home command gives players a convenient way to manage personal locations within the game. With this command, players can save specific coordinates as "homes," allowing them to return to these points later. encryption library to store each player’s homes securely. The command supports several key functions: saving a new location as a home, deleting an existing home, and teleporting directly to a saved home. This feature is particularly useful for players who want quick access to frequently visited areas, such as bases, resource-rich zones, or other significant locations on the map.

?>There is currently a hard coded limit of 5 maximum homes to be saved per player.

!> Required Clearance Level To Execute: 1

> ```
> Usage: "!home <set | delete | teleport | list | help> [ homeName ]"
> Example: !home set MyHome
> Example: !home delete MyHome
> Example: !home teleport MyHome
> Example: !home list
> ```

## !invsee

?> This section is currently under development. Detailed documentation will be provided soon.

## !pvp

?> This section is currently under development. Detailed documentation will be provided soon.

### At A Glance

The !pvp command provides players with control over Player vs. Player (PvP) settings. Users can toggle their own PvP mode, enable or disable PvP globally across the server, or check the current PvP status.

### How It Works

The PvP management system handles PvP status, cooldowns, and punishments for players who log out during PvP. It listens to events like entity hits, effects added, and player spawns or logouts. When a player attacks another, it checks if PvP is enabled, manages health adjustments to prevent unfair attacks, and starts a cooldown period preventing logout. If a player logs out during the cooldown, they are marked for punishment, which includes inventory loss. Upon rejoining, punished players receive an alert and have their inventory cleared.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!lagclear [ hours ] [ minutes ] [ seconds ]"
> Example: !lagclear 0 15 0
> ```
>
> !> To bypass PvP for safe zones you must give them a tag: paradoxBypassPvPCheck, Paradox provides no function to do this it is down the the owner to implement.

## !rank

?> This section is currently under development. Detailed documentation will be provided soon.

## !tpr

?> This section is currently under development. Detailed documentation will be provided soon.
