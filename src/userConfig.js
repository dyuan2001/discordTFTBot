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

        // first put
        let userInfo = {
            username: author.username,
            summoner: summonerName,
            puuid: puuid,
            encryptedId: encryptedId,
            rank: null,
            comps: null,
            mhMap: null,
            mhList: null,
        }

        const params = {
            TableName: 'discord-tft-bot',
            Item: {
                id: author.id,
                info: userInfo,
            }
        }
        console.log('Putting changed user data in table.');
        await docClient.put(params).promise();

        // put if not fail
        module.exports.refreshUserInfo(author, userInfo)
        .catch(error => {
            console.log('Error changing user info: ', error);
            throw new Error('Error changing user info.');
        });
    },

    refreshUserInfo: async function (author, newInfo) {
        console.log('refreshing user info!');
        //old info
        let existingUser = await module.exports.containsUserInfo(author);
        let info;
        if (!existingUser) {
            info = {
                username: null,
                summoner: null,
                puuid: null,
                encryptedId: null,
                rank: null,
                comps: null,
                mhMap: null,
                mhList: null,
            }
        } else {
            info = await module.exports.getUserInfo(author);
        }
        console.log(info);

        //checks if it is a helper method
        if (!newInfo) {
            newInfo = info;
        }

        //new info (update as needed)
        let unprocessedRank = await userLeagueTft(newInfo.encryptedId);
        let processedRank = unprocessedRank.response[0];
        let rank;
        if (processedRank == undefined) {
            rank = null;
        } else {
            rank = processedRank.tier + ' ' + processedRank.rank + ', ' + processedRank.leaguePoints + ' LP';
        }

        // Match history
        let matchHistoryInfo;
        // if summoner is saved
        if (newInfo.summoner != info.summoner) {
            // Saving old summoner info
            if (info.summoner != null) {
                let oldSummoner = await module.exports.getSummonerMhInfo(info.puuid);
                if (oldSummoner.Item != undefined && oldSummoner.Item.mhList != null) { // Checks if saved is less than curr
                    oldSummonerMhList = Object.values(oldSummoner.Item.mhList);
                    infoMhList = Object.values(info.mhList);
                    if (oldSummonerMhList.length < infoMhList.length) {
                        const summonerMhInfo = {
                            comps: info.comps,
                            mhMap: info.mhMap,
                            mhList: info.mhList,
                        }
            
                        const summonerParams = {
                            TableName: 'discord-tft-summoners',
                            Item: {
                                puuid: info.puuid,
                                info: summonerMhInfo,
                            }
                        }
                        console.log('Putting old summoner in table.');
                        await docClient.put(summonerParams).promise();
                    }
                } else { // Old summoner doesn't exist
                    const summonerMhInfo = {
                        comps: info.comps,
                        mhMap: info.mhMap,
                        mhList: info.mhList,
                    }
        
                    const summonerParams = {
                        TableName: 'discord-tft-summoners',
                        Item: {
                            puuid: info.puuid,
                            info: summonerMhInfo,
                        }
                    }
                    console.log('Putting old summoner in table.');
                    await docClient.put(summonerParams).promise();
                }
            }

            // Determining if new summoner is saved or not
            let savedSummoner = await module.exports.getSummonerMhInfo(newInfo.summoner);
            if (savedSummoner.Item != undefined) { // Saved
                let tempInfo = {
                    username: author.username,
                    summoner: newInfo.summoner,
                    puuid: newInfo.puuid,
                    encryptedId: newInfo.encryptedId,
                    rank: rank,
                    comps: savedSummoner.Item.comps,
                    mhMap: savedSummoner.Item.mhMap,
                    mhList: savedSummoner.Item.mhList,
                }
                matchHistoryInfo = await updateIndividualMatchHistory(tempInfo);
            } else { // Not saved
                matchHistoryInfo = await updateIndividualMatchHistory(newInfo);
            }
        } else { // Same summoner
            matchHistoryInfo = await updateIndividualMatchHistory(info);
        }
        let mhMap = matchHistoryInfo.mhMap;
        let mhList = matchHistoryInfo.mhList;
        let refreshedMatches = matchHistoryInfo.refreshedMatches;
        let refreshedType = matchHistoryInfo.refreshedType;

        let userInfo = {
            username: author.username,
            summoner: newInfo.summoner,
            puuid: newInfo.puuid,
            encryptedId: newInfo.encryptedId,
            rank: rank,
            comps: null,
            mhMap: Object.fromEntries(mhMap),
            mhList: Object.assign({}, mhList),
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
            console.log('Putting changed user data in table.');
            await docClient.put(params).promise();
        }

        //return refreshed matches amount
        return {
            refreshedMatches,
            refreshedType,
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

    getSummonerMhInfo: async function (puuid) {
        const params = {
            TableName: 'discord-tft-summoners',
            Key: {
                puuid: puuid,
            }
        };
        let result = await docClient.get(params).promise();
        return result;
    },
}