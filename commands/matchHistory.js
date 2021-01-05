const Discord = require('discord.js');

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

    list: {
        name: 'list',
        aliases: ['', 'games', 'matches'],
        description: 'Displays a user\'s recent match history.',
        execute: function (message, args) {
            const taggedUser = message.mentions.users.first();
            containsUserInfo(taggedUser)
            .then(containsUser => {
                if (containsUser) {
                    return getUserInfo(taggedUser);
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                    throw new Error(`${taggedUser.username} has not set a summoner yet.`);
                }
            })
            .then(userInfo => {
                let embed = matchListEmbed;
                embed.title = `${userInfo.username}'s Match History`;
                embed.timestamp = new Date();
                const matchesJSMap = new Map(Object.entries(userInfo.matchesMap));

                matchesJSMap.forEach((matchInfo) => {
                    embed.fields[0].value += `${matchInfo.game_datetime} - ${matchInfo.placement} - ${matchInfo.composition} - ${matchInfo.carry}\n`;
                });             

                message.channel.send({embed: embed}); 
            })
            .catch((error) => {
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