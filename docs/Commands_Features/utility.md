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
> Example: channel create --room myTeam
> Example: channel join --room myTeam
> Example: channel transfer --room myTeam --target Visual1mpact
> ```
