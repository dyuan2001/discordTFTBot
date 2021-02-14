const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');
const {addParticipant, removeParticipant, containsParticipant, getParticipants, setTournamentInfo, getTournamentInfo, startTournament, coordinatorReport, continueTournament} = require('../src/tournamentConfig.js');
const { workingReaction, successReaction, errorReaction } = require('../src/reaction.js');

const botId = '754428430191296523';
const murrphId = 147203562303127552;

module.exports = {
    topic: 'tournament',

    info: {
        name: 'info',
        aliases: [''],
        description: 'Provides information about the upcoming tournament.',
        execute: function (message, args) {
            workingReaction(message)
            .then(() => {
                return getTournamentInfo(botId);
            })
            .then(async (info) => {
                message.channel.send(info.description);
                await successReaction(message);
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('-------- tournament get info', error);
            })
        }
    }, 

    setinfo: {
        name: 'setinfo',
        description: 'Allows the tournament coordinator to set information about the upcoming tournament.',
        execute: function (message, args) {
            workingReaction(message)
            .then(() => {
                if (message.author.id == murrphId) {
                    return setTournamentInfo(botId, args);
                } else {
                    message.channel.send('You do not have the permissions for this command. Try the command `!tournament info` instead.');
                    throw new Error('User did not have the permission to access this command.');
                }
            })
            .then(async () => {
                message.channel.send('Tournament info updated successfully!');
                await successReaction(message);
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('-------- tournament set info', error);
            })
        }
    },
    
    participants: {
        name: 'participants',
        description: 'Returns the participants currently registered for the tournament.',
        execute: async function (message, args) {
            await workingReaction(message);
            response = await getParticipants(botId);
            participants = response.participants;

            let result = 'Registered: (' + response.count + ')\n';
            participants.forEach(participant => {
                result = `${result}- ${participant.info.username} (${participant.info.summoner})` + '\n';
            });
            message.channel.send(result);
            await successReaction(message);
        }
    },
    
    register: {
        name: 'register',
        description: 'Registers the user for the upcoming tournament.',
        execute: function (message, args) {
            workingReaction(message)
            .then(() => {
                return containsUserInfo(message.author);
            })
            .then(containsUser => {
                if (containsUser) {
                    return containsParticipant(message.author);
                } else {
                    message.channel.send('Please add a summoner before registering, ' + message.author.username + '.');
                    throw new Error(message.author.username + ' had no summoner.');
                }
            })
            .then(containsParticipant => {
                if (containsParticipant) {
                    message.channel.send('You have already registered for the tournament, ' + message.author.username + '!');
                    throw new Error(message.author.username + ' was already registered for the tournament.');
                } else {
                    return addParticipant(message.author);
                }
            })
            .then(async () => {
                await successReaction(message);
                message.channel.send('You have been successfully registered for the tournament, ' + message.author.username + '!')
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('--------', error);
            })
        }
    },

    unregister: {
        name: 'unregister',
        description: 'Unregisters the user for the upcoming tournament.',
        execute: function (message, args) {
            workingReaction(message)
            .then(() => {
                return containsParticipant(message.author);
            })
            .then(containsParticipant => {
                if (containsParticipant) {
                    return removeParticipant(message.author);
                } else {
                    message.channel.send('We could not find ' + message.author.username + ' in the list of tournament participants.');
                    throw new Error(message.author.username + ' was never registered in the first place.');
                }
            })
            .then(async () => {
                await successReaction(message);
                message.channel.send('You have successfully been unregistered, ' + message.author.username + '.')
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('--------', error);
            })
        }
    },

    start: {
        name: 'start',
        description: 'Begins the tournament and splits users into lobbies.',
        execute: function (message, args) {
            let pointsObject = Object.assign({}, args);
            delete pointsObject['0'];

            workingReaction(message)
            .then(() => {
                if (message.author.id == murrphId) {
                    return startTournament(botId, args[0], pointsObject);
                } else {
                    message.channel.send('You do not have the permissions for this command. Try the command `!tournament info` instead.');
                    throw new Error('User did not have the permission to access this command.');
                }
            })
            .then(async (lobbies) => {
                let tournamentBeginString = 'Here are the lobbies you will be playing in!\n'
                tournamentBeginString += 'Coordinators, please invite the players in your lobby to an unranked TFT match.'
                message.channel.send(tournamentBeginString);

                for (let i = 0; i < lobbies.length; i++) {
                    let embed = JSON.parse(JSON.stringify(tournamentLobbyEmbed));
                    embed.title = `Lobby ${i + 1}`;
                    embed.timestamp = new Date();
                    for (let j = 0; j < lobbies[i].length; j++) {
                        if (j == 0) {
                            embed.fields[0].value = `${lobbies[i][j].info.username} (${lobbies[i][j].info.summoner})`;
                        } else {
                            embed.fields[1].value += `${lobbies[i][j].info.username} (${lobbies[i][j].info.summoner})` + '\n';
                        }
                    }
                    message.channel.send({embed: embed});
                }
                await successReaction(message);
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('-------- Error starting tournament: ', error);
            })
        }
    },

    report: {
        name: 'report',
        description: 'Reports the coordinator\'s match as completed and tallies the scores.',
        execute: function (message, args) {
            workingReaction(message)
            .then(() => {
                return getTournamentInfo(botId);
            })
            .then((botInfo) => {
                let lobbyNumber;
                for (let i = 0; i < botInfo.coordinators.length; i++) {
                    if (message.author.id == botInfo.coordinators[i].id) {
                        lobbyNumber = i;
                        break;
                    }
                }

                if (lobbyNumber == undefined) {
                    message.channel.send('You do not have the permission to report your match. Please ask the coordinator to run the command.');
                    throw new Error('User does not have the permissions');
                }

                if (botInfo.lobbyStatuses[lobbyNumber]) {
                    message.channel.send('You have already reported your match, no further action is needed.');
                    throw new Error('User has already reported the match.');
                }

                return coordinatorReport(botId, botInfo, lobbyNumber);
            })
            .then(async (completed) => {
                message.channel.send(`Report successful, ${message.author}!`);
                await successReaction(message);
                if (completed) {
                    message.channel.send(`Here are the final standings for the round:`);
                    module.exports.scores.execute(message, args);
                }
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('-------- Error reporting results: ', error);
            })
        }
    },

    scores: {
        name: 'scores',
        aliases: ['points', 'standings', 'ranking', 'rankings',],
        description: 'Displays the current standings ofo the tournament.',
        execute: function(message, args) {
            workingReaction(message)
            .then(() => {
                return getParticipants(botId);
            })
            .then(async participantsTuple => {
                participants = participantsTuple.participants;
                participants.sort((a, b) => {
                    a.info.points = a.info.points == undefined ? 0 : a.info.points;
                    b.info.points = b.info.points == undefined ? 0 : b.info.points;
                    let result = (a.info.points < b.info.points) ? 1 : -1;
                    return result;
                });

                let embed = JSON.parse(JSON.stringify(tournamentPointsEmbed));
                embed.timestamp = new Date();

                participants.forEach(participant => {
                    embed.fields[0].value += `${participant.info.username} (${participant.info.summoner}) - ${participant.info.points}\n`;
                });

                message.channel.send({embed: embed});

                await successReaction(message);
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('-------- Error getting scores: ', error);
            })
        }
    },

    continue: {
        name: 'continue',
        description: 'Continues the tournament with the specified number of players, lobbies, and points.',
        execute: function (message, args) {
            let pointsObjectArray = [];
            for (let i = 0; i < args[0]; i++) {
                let pointsObject = Object.assign({}, args.slice(i * 9 + 2, (i + 1) * 9 + 2));
                delete pointsObject['0'];
                pointsObjectArray.push(pointsObject);
            }

            workingReaction(message)
            .then(() => {
                if (message.author.id == murrphId) {
                    return continueTournament(botId, args[0], args[1], pointsObjectArray);
                } else {
                    message.channel.send('You do not have the permissions for this command. Try the command `!tournament info` instead.');
                    throw new Error('User did not have the permission to access this command.');
                }
            })
            .then(async (lobbies) => {
                let tournamentBeginString = 'Here are the lobbies you will be playing in!\n'
                tournamentBeginString += 'Coordinators, please invite the players in your lobby to an unranked TFT match.'
                message.channel.send(tournamentBeginString);

                for (let i = 0; i < lobbies.length; i++) {
                    let embed = JSON.parse(JSON.stringify(tournamentLobbyEmbed));
                    embed.title = `Lobby ${i + 1}`;
                    embed.timestamp = new Date();
                    for (let j = 0; j < lobbies[i].length; j++) {
                        if (j == 0) {
                            embed.fields[0].value = `${lobbies[i][j].info.username} (${lobbies[i][j].info.summoner})`;
                        } else {
                            embed.fields[1].value += `${lobbies[i][j].info.username} (${lobbies[i][j].info.summoner})` + '\n';
                        }
                    }
                    message.channel.send({embed: embed});
                }
                await successReaction(message);
            })
            .catch(async (error) => {
                await errorReaction(message);
                console.log('-------- Error continuing tournament: ', error);
            })
        }
    },
}

let tournamentLobbyEmbed = {
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
			name: 'Coordinator:',
            value: '',
            inline: false,
        },
        {
            name: 'Players:',
            value: '',
            inline: false,
        },
	],
	// image: {
	// 	url: 'https://i.imgur.com/wSTFkRM.png',
	// // },
	// timestamp: new Date(),
	footer: {
		text: 'Built by @dyuan2001 on GitHub.',
		icon_url: 'https://cdn.bleacherreport.net/images/team_logos/328x328/georgia_tech_football.png',
	},
};

let tournamentPointsEmbed = {
	color: 0x0099ff,
	title: 'Current Standings',
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
			name: 'Players - Points:',
            value: '',
            inline: false,
        },
	],
	// image: {
	// 	url: 'https://i.imgur.com/wSTFkRM.png',
	// // },
	// timestamp: new Date(),
	footer: {
		text: 'Built by @dyuan2001 on GitHub.',
		icon_url: 'https://cdn.bleacherreport.net/images/team_logos/328x328/georgia_tech_football.png',
	},
};