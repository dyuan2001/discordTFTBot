# Immediate
 - Rank for each user (DONE!)
 - Readable match history
 - Fleshed out tournament

# Future
 - DataDragon implementation with match history
 - Match history analysis
 - Favorite compositions for each user
 - Database integration to save data through bot restarts (DONE!)
 - Refactor Riot API calls with database calls instead (DONE!)

## Readable Match History
 - Reads in units for the player
 - Finds carry (character with most items, tie TBD)
 - Displays in format {Date - Placement - Carry (Item/Item/Item)}
 - Saves match history in database
  - Refresh finds new games to add to database
  - Adds new game IDs until latest game ID is found
 - Specific match history details can be called as an embed message