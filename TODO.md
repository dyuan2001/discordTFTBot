# Immediate
 - [ ] Readable match history
 - [ ] Move lolchess and matches to a separate command file

# Future
 - [ ] DataDragon implementation with match history
 - [ ] Match history analysis
 - [ ] Favorite compositions for each user
 - [ ] Companion website for specific match history & more!

## Readable Match History
 - Reads in units for the player
 - Finds carry (character with most items, tie TBD)
 - Displays in format {Date - Placement - Carry (Item/Item/Item)}
 - Saves match history in database
  - Refresh finds new games to add to database
  - Adds new game IDs until latest game ID is found
 - Specific match history details can be called as an embed message

# Completed Tasks (Historical)
 - [x] Rank for each user
 - [x] Fleshed out tournament
 - [x] Database integration to save data through bot restarts
 - [x] Refactor Riot API calls with database calls instead