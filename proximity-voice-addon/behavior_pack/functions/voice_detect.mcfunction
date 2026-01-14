# Detect when player is speaking (proximity detection)
# This is a helper function for voice activation

execute as @a[tag=voice_enabled] run function voice_update

# Update player positions
execute as @a[tag=voice_enabled] at @s store result score @s voice_distance run distance @s @e[type=player,tag=voice_enabled,c=1]
