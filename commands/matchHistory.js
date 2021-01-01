const {findSummonerIds, matchListTft, userLeagueTft} = require('../src/riotApi.js');
const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');

module.exports = {
    topic: 'mh',
    topicAliases: [
        'matchhistory',
        'history',
        'games',
    ],

    lolchess: {
        name: 'lolchess',
        description: 'Displays a link to the user\'s associated summoner\'s lolchess.',
        execute: function (message, args) {
            containsUserInfo(message.author)
            .then(resolve => {
                if (resolve) {
                    getUserInfo(message.author)
                    .then(info => {
                        console.log(info);
                        message.channel.send('https://lolchess.gg/profile/na/' + info.summoner.replace(' ', ''));
                    });
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                }
            })
        }
    },

    matches: {
        name: 'matches',
        aliases: ['matchhistory', 'match_history', 'history'],
        description: 'Displays a user\'s recent match history.',
        execute: function (message, args) {
            const taggedUser = message.mentions.users.first();
            containsUserInfo(taggedUser)
            .then(containsUser => {
                if (containsUser) {
                    return getUserInfo(taggedUser);
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                    throw new Error(taggedUser.username + ' has not set a summoner yet.');
                }
            })
            .then(userInfo => {
                return matchListTft(userInfo.puuid)
            })
            .then((matches) => {
                console.log('Matches found!');
                console.log(matches);
                message.channel.send(matches.response.join('\n')); 
            })
            .catch((error) => {
                console.log('---------', error);
            });
        }
    },
}