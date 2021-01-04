require('dotenv').config();
const twisted = require('twisted');

const api = new twisted.TftApi({rateLimitRetry: true,
    rateLimitRetryAttempts: 1,
    concurrency: undefined,
    key: process.env.RIOT_GAMES_API_KEY,
    debug: {
      logTime: false,
      logUrls: false,
      logRatelimit: false
    }
  })

module.exports = {

    findSummonerIds: async function (summonerName) {
        const {
            response: {
            puuid,
            id
            }
        } = await api.Summoner.getByName(summonerName, twisted.Constants.Regions.AMERICA_NORTH);
        
        return {
                puuid: puuid,
                encryptedId: id
            };
    },

    matchListTft: async function (puuid) {
        return await api.Match.list(puuid, twisted.Constants.TftRegions.AMERICAS, 1000);
    },

    matchDetailsTft: async function (matchId) {
        return await api.Match.get(matchId, twisted.Constants.TftRegions.AMERICAS);
    },

    userLeagueTft: async function (encryptedId) {
        return await api.League.get(encryptedId, twisted.Constants.Regions.AMERICA_NORTH);
    },
}