require('dotenv').config();

const AWS = require('aws-sdk');
const { IdentityStore } = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const docClient = new AWS.DynamoDB.DocumentClient();

const {findSummonerIds, userLeagueTft} = require('./riotApi.js');
const {updateIndividualMatchHistory} = require('./mhConfig.js');

module.exports = {
    changeUserInfo: async function (summonerName, author) {
        let arrIds = await findSummonerIds(summonerName);
        let puuid = arrIds.puuid;
        let encryptedId = arrIds.encryptedId;

        let userInfo = {
            username: author.username,
            summoner: summonerName,
            puuid: puuid,
            encryptedId: encryptedId,
        }

        const params = {
            TableName: 'discord-tft-bot',
            Item: {
                id: author.id,
                info: userInfo,
            }
        }

        console.log(params);

        await docClient.put(params).promise()
        .then(async function (response) {
            return await module.exports.refreshUserInfo(author);
        })
        .catch(error => {
            console.log('Error changing user info: ', error);
            throw new Error('Error changing user info.');
        });
    },

    refreshUserInfo: async function (author) {
        console.log('refreshing user info!');
        //old info
        let info = await module.exports.getUserInfo(author);
        console.log(info);
        //new info (update as needed)
        let unprocessedRank = await userLeagueTft(info.encryptedId);
        let processedRank = unprocessedRank.response[0]
        let rank;
        if (processedRank == undefined) {
            rank = null;
        } else {
            rank = processedRank.tier + ' ' + processedRank.rank + ', ' + processedRank.leaguePoints + ' LP';
        }

        // Match history
        let matchHistoryTuple = await updateIndividualMatchHistory(info);
        let matchesMap = matchHistoryTuple.userMatchHistory;
        let triggerMatches = matchHistoryTuple.triggerMatches;

        let userInfo = {
            username: author.username,
            summoner: info.summoner,
            puuid: info.puuid,
            encryptedId: info.encryptedId,
            rank: rank,
            comps: null,
            matchesMap: Object.fromEntries(matchesMap),
            triggerMatches,
        }

        console.log(' ---------- user info', userInfo);
        console.log(' ---------- info', info);

        let change = false;
        for (const property in userInfo) {
            if (info[property] == undefined || userInfo[property] != info[property]) {
                change = true;
                break;
            }
        }
        console.log('change = ' + change);

        if (change) {
            const params = {
                TableName: 'discord-tft-bot',
                Item: {
                    id: author.id,
                    info: userInfo,
                }
            }
        
            docClient.put(params, (error) => {
                if (!error) {
                    return true;
                } else {
                    console.log('Error refreshing user info: ', error);
                }
            })
        }
    },

    containsUserInfo: async function (author) {
        const params = {
            TableName: 'discord-tft-bot',
            Key: {
                id: author.id
            }
        };

        let result = await docClient.get(params).promise()
        .then(response => {
            console.log('not empty ' + response.Item);
            if (response.Item != undefined) {
                console.log('returning not equals ' + response.Item);
                return true;
            } else {
                console.log('returning equals ' + response.Item);
                return false;
            }
        })
        .catch(error => {
            console.log('empty' + error);
            return false;
        })

        return result;
    },

    getUserInfo: async function (author) {
        const params = {
            TableName: 'discord-tft-bot',
            Key: {
                id: author.id,
            }
        };
        let result = await docClient.get(params).promise();
        return result.Item.info;
    },
}