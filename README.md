<div align="center">
Scythe AntiCheat - an AntiCheat designed for Minecraft Bedrock realms/worlds/servers.

  <img src="https://raw.githubusercontent.com/MrDiamond64/image-assets/main/scythe%20pog%20anticheat.png" width="600" alt="Scythe AntiCheat" />
   
</div>

# How To Setup
To install this anticheat to your realm/world you need to install the .mcpack and apply it to your world and it should be fully up and running

To receive anti-cheat alerts use this command: ```/function notify```

If your world contains NPC's, make sure to edit the cbe.mcfunction file and add a # to the ```/function setting/npc``` or they will be insta-killed

# List of hacks detected by Scythe AntiCheat

   AutoClicker ->

      (A) = Checks how much left clicks the player sends

   AutoTotem ->

      (A) = Checks if a player equips a totem while moving<br />
      (B) = Checks if a player equips a totem while using an item<br />
      
   BadPackets ->

      (1) = Checks if the players yaw/pitch is greater than normal
   
   Command Block Exploit -><br />
      (A) = Clears animal buckets/beehives<br />
      (B) = Replaces beehives with air<br />
      (C) = Kill all command block minecarts<br />
      (D) = Kills all NPC's (to disable use /function settings/npc)

      (E) = Instant despawn time for command block minecarts

 
  Ender Pearl Glitching ->

      (A) => Checks if an ender pearl is inside a climbable block.
   
  Illegal Items -><br />
      (A) => Clears illegal items from everybody's inventories.

      (B) => Clears dropped items.
      
  InteractUse ->

      (A) => Checks if a player is using an item white hitting/interacting with items
 
  Jesus -><br />
      (A) => Checks if the player is above water/lava blocks.

  Phase -><br />
      (A) => Detect if someone moves inside a block

# Extra Commands.

To receive anti-cheat alerts use this command: ```/function notify```

To ban a user use: ```/execute <playername> ~~~ function ban```

To freeze a player use: ```/execute <playername> ~~~ function tools/freeze```

To enter Vanish use: ```/function tools/vanish```

To be able to fly in survival mode use: ```/function tools/fly```

To view a players anticheat logs use: ```/execute ~~~ function tools/stats```

Additionally, there are custom features you can enable like anti gamemode change to further enhance your realm security, these options can be used by /function settings/

# FAQ

Q1: Does the AntiCheat auto-ban?

A1: No.

Q2: Is it customizable?<br />
A2: Yes using /function settings/. or by modifying the .mcfunction files

# Notes:

When applying the pack to your world make sure it is at the top to make sure all checks work properly.

# License
**You MAY;**<br />
Modify it<br />
Use it (public/private use)<br />
Using its code (with credit)<br />

**YOU MAY NOT;**<br />
Steal code<br />
Claim it as your own<br />
Sell it<br />
redistribute it.


