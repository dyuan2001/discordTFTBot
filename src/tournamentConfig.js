require('dotenv').config();

const AWS = require('aws-sdk');
const { IdentityStore } = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const docClient = new AWS.DynamoDB.DocumentClient();

const {getUserInfo} = require('./userConfig.js');
const {matchListTft, findSummonerIds} = require('./riotApi.js');
const {addFullMatchDetails} = require('./mhConfig.js');

module.exports = {
    addParticipant: async function (author) {
        userInfo = await getUserInfo(author);
        
        let info = {
            username: userInfo.username,
            summoner: userInfo.summoner,
            puuid: userInfo.puuid,
            points: 0,
        };
        
        const params = {
            TableName: 'discord-bot-tournament',
            Item: {
                id: author.id,
                info: info
            }
        };

        docClient.put(params, (error) => {
            if (!error) {
                return true;
            } else {
                console.log('Error adding participant:', error);
            }
        })
    },

    removeParticipant: async function (author) {
        const params = {
            TableName: 'discord-bot-tournament',
            Key: {
                id: author.id
            }
        };

        docClient.delete(params, (err, data) => {
            if (err) console.log('Error deleting participant:', err);
            else console.log('------ data:', data);
        });
    },

    containsParticipant: async function (author) {
        const params = {
            TableName: 'discord-bot-tournament',
            Key: {
                id: author.id
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item != undefined;
    },

    getParticipants: async function (botId) {
        const params = {
            TableName: 'discord-bot-tournament',
        }

        let result = await docClient.scan(params).promise();

        // Account for TFT Announcements tournament info
        result.Count = result.Count - 1;

        result.Items = result.Items.filter(participant => participant.id != botId);

        // Need to access each Item's info element.
        return {
            participants: result.Items,
            count: result.Count,
        };
    },

    setTournamentInfo: async function (botId, args) {
        let info = {
            description: args.join(' '),
        }

        const params = {
            TableName: 'discord-bot-tournament',
            Item: {
                id: botId,
                info: info,
            }
        };

        await docClient.put(params).promise();
    },

    getTournamentInfo: async function (botId) {
        const params = {
            TableName: 'discord-bot-tournament',
            Key: {
                id: botId,
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item.info;
    },

    startTournament: async function (botId, lobbies, pointsObject) {
        console.log('In start tournament function');

        let tournamentTuple = await module.exports.getParticipants(botId);

        console.log('Found participants!', tournamentTuple);

        shuffle(tournamentTuple.participants);

        console.log('Shuffled participants!');

        let filledLobbies = [];
        let lobbyStatuses = [];
        let pointsPerLobby = [];
        for (let i = 0; i < lobbies; i++) {
            filledLobbies.push(new Array());
            lobbyStatuses.push(false);
            pointsPerLobby.push(pointsObject);
        }

        console.log('Made empty lobbies');

        for (let i = 0; i < tournamentTuple.participants.length; i++) {
            filledLobbies[i % lobbies].push(tournamentTuple.participants[i]);
            // if (i == 10 || i == 2 || i == 6 || i == 9 || i == 11 || i == 13 || i == 14 || i == 15) {
            //     filledLobbies[0].push(tournamentTuple.participants[i]);
            // } else {
            //     filledLobbies[1].push(tournamentTuple.participants[i]);
            // }
        }

        let tournamentCoordinators = tournamentTuple.participants.slice(0, lobbies);
        // let tournamentCoordinators = [tournamentTuple.participants[2]];

        // Create info object
        let oldInfo = await module.exports.getTournamentInfo(botId);

        let info = {
            description: oldInfo.description,
            lobbies: filledLobbies,
            coordinators: tournamentCoordinators,
            lobbyStatuses: lobbyStatuses,
            pointsPerLobby,
        }

        const params = {
            TableName: 'discord-bot-tournament',
            Item: {
                id: botId,
                info: info,
            }
        };

        await docClient.put(params).promise();

        return filledLobbies;
    },

    coordinatorReport: async function (botId, botInfo, lobbyNumber) {
        let lobbyCoordMatches = await matchListTft(botInfo.coordinators[lobbyNumber].puuid);
        let lobbyRiotId = lobbyCoordMatches.response[0];
        // let matches = await matchListTft('PiN_3c7RshOn026FuLbAPE_BtMhQ1OcGx_sd_hZE7jQGEbhKe7YWRuinJVdiCkv5F5G91NF-ppx5Ww');
        // console.log(matches);
        // let lobbyRiotId = matches.response[0];
        // console.log(lobbyRiotId);
        let lobbyInfo = await addFullMatchDetails(lobbyRiotId);

        let lobbyParticipantsMap = new Map(Object.entries(lobbyInfo.participants));
        const participantPointsMap = new Map(Object.entries(botInfo.pointsPerLobby[lobbyNumber]));
        console.log(participantPointsMap);
        
        let params = {
            TransactItems: [],
        }

        for (let participantInfo of botInfo.lobbies[lobbyNumber]) {
            //
            // let summonerIds = await findSummonerIds(participantInfo.info.summoner);
            // let summonerPuuid = summonerIds.puuid;
            // let participantMatchInfo = lobbyParticipantsMap.get(summonerPuuid);
            //
            let participantMatchInfo = lobbyParticipantsMap.get(participantInfo.info.puuid);
            let participantPlacement = participantMatchInfo.placement;
            console.log('placement:', participantPlacement);
            let participantEarnedPoints = participantPointsMap.get(participantPlacement.toString());
            let participantPointAdd = parseInt(participantEarnedPoints, 10);

            // Use transactWrite to write a batch of updates to the tournament table
            params.TransactItems.push({
                Update: {
                    TableName: 'discord-bot-tournament',
                    Key: { 'id' : participantInfo.id},
                    UpdateExpression: 'SET info.points = info.points + :points',
                    ExpressionAttributeValues: {
                        ':points' : participantPointAdd,
                    }
                }
            });
        }

        params.TransactItems.push({
            Update: {
                TableName: 'discord-bot-tournament',
                Key: { 'id' : botId },
                UpdateExpression: `SET info.lobbyStatuses[${lobbyNumber}] = :lobby_boolean`,
                ExpressionAttributeValues: {
                    ':lobby_boolean' : true,
                }
            }
        });

        await docClient.transactWrite(params).promise();

        botInfo.lobbyStatuses[lobbyNumber] = true;
        let completed = true;
        botInfo.lobbyStatuses.forEach(lobbyStatus => {
            if (!lobbyStatus) {
                completed = false;
            }
        });

        return completed;
    },
}

/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {String}      The first item in the shuffled array
 */
const shuffle = function (array) {

	var currentIndex = array.length;
	var temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;

};