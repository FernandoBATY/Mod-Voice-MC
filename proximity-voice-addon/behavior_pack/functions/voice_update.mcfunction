# Update voice chat status for a player
# Called every tick for active players

# Check if player is close to others (within 30 blocks)
execute as @s at @s if entity @a[dx=30,dy=30,dz=30,tag=voice_enabled,type=player] run scoreboard players set @s voice_distance 1

# Check team membership
execute as @s run scoreboard players operation @s voice_team = @s team_id
