const Discord = require('discord.js');
const { workingReaction, successReaction, errorReaction } = require('../src/reaction.js');

const {findSummonerIds, matchListTft, userLeagueTft} = require('../src/riotApi.js');
const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');

module.exports = {
    topic: 'mh',
    topicAliases: [
        'matchhistory',
        'history',
        'games',
        'match_history',
    ],

    lolchess: {
        name: 'lolchess',
        description: 'Displays a link to the user\'s associated summoner\'s lolchess.',
        execute: function (message, args) {
            let taggedUser = message.mentions.users.first();
            if (!taggedUser) {
                taggedUser = message.author;
            }

            workingReaction(message)
            .then(() => {
                return containsUserInfo(taggedUser);
            })
            .then(resolve => {
                if (resolve) {
                    return getUserInfo(taggedUser);
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                    throw new Error('Tagged user has not set summoner name yet.')
                }
            })
            .then(async (info) => {
                console.log(info);
                message.channel.send('https://lolchess.gg/profile/na/' + info.summoner.replace(' ', ''));
                await successReaction(message);
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('---------', error);
            })
        }
    },

    list: {
        name: 'list',
        aliases: ['', 'games', 'matches'],
        description: 'Displays a user\'s recent match history.',
        execute: function (message, args) {
            let taggedUser = message.mentions.users.first();
            if (!taggedUser) {
                taggedUser = message.author;
            }

            workingReaction(message)
            .then(() => {
                return containsUserInfo(taggedUser);
            })
            .then(containsUser => {
                if (containsUser) {
                    return getUserInfo(taggedUser);
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                    throw new Error(`${taggedUser.username} has not set a summoner yet.`);
                }
            })
            .then(async (userInfo) => {
                let embed = matchListEmbed;
                embed.title = `${userInfo.username}'s Match History`;
                embed.timestamp = new Date();
                const matchesJSMap = new Map(Object.entries(userInfo.mhMap));
                const matchesJSList = Object.values(userInfo.mhList);

                if (matchesJSMap.size == 0) {
                    embed.fields[0].value = 'No recent matches found.';
                } else {
                    matchesJSList.forEach(matchId => {
                        let matchInfo = matchesJSMap.get(matchId);
                        embed.fields[0].value += `${matchInfo.game_datetime} - ${matchInfo.placement} - ${matchInfo.composition} - ${matchInfo.carry}\n`;
                    })
                }        

                message.channel.send({embed: embed});
                await successReaction(message); 
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('---------', error);
            });
        }
    },
}

let matchListEmbed = {
	color: 0x0099ff,
	// title: 'Some title', Set title in method
	// url: 'https://discord.js.org',
	author: {
		name: 'TFT Announcements',
		icon_url: 'https://static.wikia.nocookie.net/leagueoflegends/images/6/67/Teamfight_Tactics_icon.png/revision/latest?cb=20191018215638',
		// url: 'https://discord.js.org',
	},
	// description: 'Some description here',
	// thumbnail: {
	// 	url: 'https://i.imgur.com/wSTFkRM.png',
	// },
	fields: [
		{
			name: 'Most recent matches:',
            value: '',
            inline: false,
		},
	],
	// image: {
	// 	url: 'https://i.imgur.com/wSTFkRM.png',
	// // },
	// timestamp: new Date(),
	footer: {
		text: 'React below to browse more match history.',
		icon_url: 'https://cdn.bleacherreport.net/images/team_logos/328x328/georgia_tech_football.png',
	},
};