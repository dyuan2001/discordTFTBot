require('dotenv').config();

const AWS = require('aws-sdk');
const { IdentityStore } = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const docClient = new AWS.DynamoDB.DocumentClient();

const {findSummonerIds, matchListTft, userLeagueTft, matchDetailsTft} = require('./riotApi.js');
const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('./userConfig.js');

module.exports = {
    addFullMatchDetails: async function (matchId) {
        matchInDatabase = await module.exports.containsFullMatchDetails(matchId);

        if (matchInDatabase) {
            return module.exports.getFullMatchDetails(matchId);
        }

        matchDetailsResponse = await matchDetailsTft(matchId);
        fullMatchInfo = matchDetailsResponse.response.info;

        const game_datetime = fullMatchInfo.game_datetime;
        var date = new Date(game_datetime * 1000);
        // Get time in EST
        var invdate = new Date(date.toLocaleString('en-US', {
            timeZone: 'America/New_York',
        }));
        var diff = date.getTime() - invdate.getTime();

        const game_date_obj = new Date(date.getTime() - diff);
        const month = game_date_obj.getUTCMonth() + 1;
        const day = game_date_obj.getUTCDate();
        const year = game_date_obj.getUTCFullYear();
        const hour = game_date_obj.getUTCHours();
        const minute = game_date_obj.getUTCMinutes();

        const formattedTime = `${month}/${day}/${year} ${hour}:${minute}`;

        // Find patch
        const game_version = fullMatchInfo.game_version;
        const afterReleases = game_version.substring(game_version.search('Releases/') + 9);
        let game_patch;
        if (!isNaN(parseInt(afterReleases.charAt(4), 10))) {
            game_patch = afterReleases.substring(0, 5);
        } else {
            game_patch = afterReleases.substring(0, 4);
        }

        // Find game type
        const queue_id = fullMatchInfo.queue_id;
        let game_type;
        if (queue_id == 1090) {
            game_type = 'Normal';
        } else if (queue_id == 1100) {
            game_type = 'Ranked';
        } else {
            game_type = undefined;
        }

        const tft_set_number = fullMatchInfo.tft_set_number;

        // Insert relevant player info
        let playerMap = new Map();
        fullMatchInfo.participants.forEach((player) => {
            let traits = [];
            player.traits.forEach((trait) => {
                traits.push({
                    name: trait.name,
                    num_units: trait.num_units,
                    tier_current: traits.tier_current,
                    tier_total: traits.tier_total,
                });
            });

            let units = [];
            player.units.forEach((unit) => {
                units.push({
                    character_id: unit.character_id,
                    items: unit.items,
                    tier: unit.tier,
                    chosen: unit.chosen,
                });
            });
            
            let playerInfo = {
                placement: player.placement,
                level: player.level,
                gold_left: player.gold_left,
                time_eliminated: player.time_eliminated,
                last_round: player.last_round,
                traits: traits,
                units: units,
            }

            playerMap.set(player.puuid, playerInfo);
        });

        const info = {
            game_datetime: formattedTime,
            game_patch,
            game_type,
            tft_set_number,
            participants: playerMap,
        }

        const params = {
            TableName: 'discord-bot-mh',
            Item: {
                id: matchId,
                info: info,
            }
        }

        const error = await docClient.put(params).promise();
        if (!error) {
            return info;
        } else {
            throw new Error('Error adding detailed match history:', error);
        }
    },

    updateIndividualMatchHistory: async function (author) {
        userInfo = await getUserInfo(author);
        upToDateMatchHistory = await matchListTft(userInfo.puuid);
        userTriggerMatches = userInfo.triggerMatches;
        userMatchHistory = userInfo.matches;

        if (upToDateMatchHistory.length == 0) {
            console.log('User has not played any matches.');
            return {
                userMatchHistory: null,
                triggerMatches: null,
            };
        }

        // If no match history at all
        if (!userMatchHistory || userMatchHistory == {}) {
            matchesMap = new Map();
            for (let i = 0; i < 19; i++) {
                let matchDetails = await module.exports.addFullMatchDetails(upToDateMatchHistory[i]);
                if (matchDetails.tft_set_number < 4) {
                    break;
                }
                const individualMatchInfo = { // Insert carry function here for carry
                    game_datetime: matchDetails.game_datetime,
                    placement: matchDetails.playerMap.get(userInfo.puuid).placement,
                    composition: '',
                    carry: '',
                };
                matchesMap.set(matchId, individualMatchInfo);
            }
            // Keeps track of newest & oldest matches for match updating
            if (upToDateMatchHistory.length < 19) {
                let triggerMatches = {
                    newest: upToDateMatchHistory[0],
                    oldest: upToDateMatchHistory[upToDateMatchHistory.length - 1],
                }
            }
            let triggerMatches = {
                newest: upToDateMatchHistory[0],
                oldest: upToDateMatchHistory[18],
            }
            return {
                userMatchHistory: matchesMap,
                triggerMatches,
            };
        }

        // If already up to date = update older matches
        if (upToDateMatchHistory[0] == userTriggerMatches.newest) {
            const oldestIndex = upToDateMatchHistory.find(userTriggerMatches.oldest);
            try {
                let oldest = userTriggerMatches.oldest;
                for (let i = 1; i <= 19; i++) {
                    let matchDetails = await module.exports.addFullMatchDetails(upToDateMatchHistory[i + oldestIndex]);
                    if (matchDetails.tft_set_number < 4) {
                        break;
                    }
                    const individualMatchInfo = { // Insert carry function here for carry
                        game_datetime: matchDetails.game_datetime,
                        placement: matchDetails.playerMap.get(userInfo.puuid).placement,
                        composition: '',
                        carry: '',
                    };
                    userMatchHistory.set(matchId, individualMatchInfo);
                    oldest = i + oldestIndex;
                }
            } catch (error) {
                console.log('Error updating match history: ', error);
            } finally {
                let triggerMatches = {
                    newest: userTriggerMatches.newest,
                    oldest: oldest,
                }

                return {
                    userMatchHistory,
                    triggerMatches,
                };
            }
        } else { // User played new matches
            const newestIndex = upToDateMatchHistory.find(userTriggerMatches.newest);
            for (let i = 0; i < newestIndex; i++) {
                if (i % 19 == 0) {
                    await sleep(1000);
                }
                let matchDetails = await module.exports.addFullMatchDetails(upToDateMatchHistory[i]);
                if (matchDetails.tft_set_number < 4) {
                    break;
                }
                const individualMatchInfo = { // Insert carry function here for carry
                    game_datetime: matchDetails.game_datetime,
                    placement: matchDetails.playerMap.get(userInfo.puuid).placement,
                    composition: '',
                    carry: '',
                };
                userMatchHistory.set(matchId, individualMatchInfo);
            }
            let triggerMatches = {
                newest: upToDateMatchHistory[0],
                oldest: userTriggerMatches.oldest,
            }
            return {
                userMatchHistory: matchesMap,
                triggerMatches,
            };
        }
    },

    containsFullMatchDetails: async function (matchId) {
        const params = {
            TableName: 'discord-bot-mh',
            Key: {
                id: matchId,
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item != undefined;
    },

    getFullMatchDetails: async function (matchId) {
        const params = {
            TableName: 'discord-tft-mh',
            Key: {
                id: matchId,
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item.info;
    },
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}