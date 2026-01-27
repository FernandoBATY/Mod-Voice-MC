# Proximity Voice Chat - Initialization Function
# Run this on server startup

# Enable experimental features if needed
say [Voice Chat] Initializing Proximity Voice Chat System...

# Setup scoreboard for voice state tracking
scoreboard objectives add voice_speaking dummy "Speaking Status"
scoreboard objectives add voice_distance dummy "Distance to Speaker"
scoreboard objectives add voice_volume dummy "Voice Volume"
scoreboard objectives add voice_team dummy "Team ID"

# Tag all players for voice chat
tag @a add voice_enabled

say [Voice Chat] System initialized! Use !voice for help.
