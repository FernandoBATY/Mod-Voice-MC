# Update voice chat status for a player
# Called every tick for active players

# Check if player is close to others (within 30 blocks)
execute as @s at @s if entity @a[distance=..30,tag=voice_enabled] run scoreboard players set @s voice_distance 1
