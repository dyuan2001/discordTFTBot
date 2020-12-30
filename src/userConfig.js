require('dotenv').config();

const AWS = require('aws-sdk');
const { IdentityStore } = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const docClient = new AWS.DynamoDB.DocumentClient();

const {findSummonerIds, matchListTft, userLeagueTft} = require('./riotApi.js');

module.exports = {
    changeUserInfo: async function (summonerName, author) {
        arrIds = await findSummonerIds(summonerName);
        puuid = arrIds.puuid;
        encryptedId = arrIds.encryptedId;

        await userLeagueTft(encryptedId)
        .then((resolve) => {
            leagueInfo = resolve.response[0];
            rank = leagueInfo.tier + ' ' + leagueInfo.rank + ', ' + leagueInfo.leaguePoints + ' LP';
        })
        .catch((failure) => {
            console.log(failure);
            rank = null;
        })

        let userInfo = {
            username: author.username,
            summoner: summonerName,
            puuid: puuid,
            encryptedId: encryptedId,
            rank: rank,
            comps: null
        }

        const params = {
            TableName: 'discord-tft-bot',
            Item: {
                id: author.id,
                info: userInfo
            }
        }

        docClient.put(params, (error) => {
            if (!error) {
                return true;
            } else {
                console.log('Error: ' + error);
            }
        })
    },

    refreshUserInfo: async function (author) {
        //old info
        let info = await module.exports.getUserInfo(author);
        
        //new info (update as needed)
        let unprocessedRank = await userLeagueTft(info.encryptedId);
        let processedRank = unprocessedRank.response[0]
        let rank = processedRank.tier + ' ' + processedRank.rank + ', ' + processedRank.leaguePoints + ' LP';

        let userInfo = {
            username: author.username,
            summoner: info.summoner,
            puuid: info.puuid,
            encryptedId: info.encryptedId,
            rank: rank,
            comps: null
        }

        console.log(' ---------- user info', userInfo);
        console.log(' ---------- info', info);

        let change = false;
        for (const property in userInfo) {
            if (userInfo[property] != info[property]) {
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
                    info: userInfo
                }
            }
        
            docClient.put(params, (error) => {
                if (!error) {
                    return true;
                } else {
                    console.log('Error: ' + error);
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
                id: author.id
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item.info;
    },
}