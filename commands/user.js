const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');
const {workingReaction, successReaction, errorReaction} = require('../src/reaction.js');
const { SummonerLeagueDto } = require('twisted/dist/models-dto');

module.exports = {
    topic: 'user',

    add: {
        name: 'add',
        description: 'Adds a summoner to a Discord user.',
        execute: function (message, args) {
            containsUserInfo(message.author)
            .then(async function addUser(resolve) {
                console.log('hello ' + resolve);
                if (resolve) {
                    console.log('in here');
                    let newName = args.join(' ');
                    let info = await getUserInfo(message.author);
                    if (info.summoner == newName) {
                        message.channel.send(`Your summoner name is already ${newName}, ${message.author.username}!`);
                    } else {
                        message.channel.send('You already have an associated summoner ' + info.summoner + '. Would you like to change it to ' + newName + '? (Y/N)').then(() => {
                        let filter = m => m.author.id === message.author.id;
                        message.channel.awaitMessages(filter, {
                            max: 1,
                            time: 30000,
                            errors: ['time']
                            })
                            .then(message => {
                            message = message.first();
                            if (message.content.toUpperCase() == 'YES' || message.content.toUpperCase() == 'Y') {
                                workingReaction(message)
                                .then(response => {
                                    return changeUserInfo(newName, message.author);
                                })
                                .then(async function(resolve) {
                                    console.log('Success!')
                                    await successReaction(message);
                                    message.channel.send('Summoner name changed successfully to ' + newName + '.');
                                })
                                .catch(failure => console.log('Failed changing user info. - ' + failure));
                            } else if (message.content.toUpperCase() == 'NO' || message.content.toUpperCase() == 'N') {
                                message.channel.send('Summoner name unchanged.');
                            } else {
                                message.channel.send('Invalid response - please redo the command and enter either Y or N.');
                            }
                            })
                            .catch(async function (collected) {
                                await errorReaction(message);
                                message.channel.send('Command has timed out.');
                            });
                        })
                    }
                } else {
                    workingReaction(message)
                    .then(response => {
                        return changeUserInfo(args.join(' '), message.author);
                    })
                    .then(async function(resolve) {
                        console.log('Success!')
                        await successReaction(message);
                        message.channel.send('Summoner name ' + args.join(' ') + ' successfully added!');
                    })
                    .catch(async function (failure) {
                        await errorReaction(message);
                        message.channel.send(`There was an error changing your summoner, ${message.author}.`);
                        console.log('Failed. - ' + failure);
                    });
                }
            })
        }
    },

    change: {
        name: 'change',
        description: 'Changes a summoner for a Discord user.',
        execute: function(message, args) {
            workingReaction(message)
            .then(response => {
                return changeUserInfo(args.join(' '), message.author);
            })
            .then(async function() {
                console.log('Success!');
                await successReaction(message);
                message.channel.send('Summoner name successfully changed to ' + args[0] + '.');
            })
            .catch(async failure => {
                await errorReaction(message);
                message.channel.send(`There was an error changing your summoner, ${message.author}.`);
                console.log('Failed. - ' + failure)
            });
        }
    },

    rank: {
        name: 'rank',
        description: 'Displays a Discord user\'s summoner rank.',
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
                    message.channel.send(taggedUser.username + ' has not set a summoner yet.');
                    throw new Error('Tagged user has not set a summoner yet.');
                }
            })
            .then(async info => {
                if (info.rank != null) {
                    await successReaction(message);
                    message.channel.send(taggedUser.username + `'s rank is ` + info.rank + '. (Summoner name: ' + info.summoner + ')');
                } else {
                    message.channel.send(taggedUser.username + ' has an error with their rank.');
                    throw new Error('Tagged user has an error with their rank.');
                }
            })
            .catch(async error => {
                await errorReaction(message);
                console.log('Error displaying ranked: ', error);
            })
        }
    },

    refresh: {
        name: 'refresh',
        description: 'Refreshes a Discord user\'s user information, including rank, etc.',
        execute: function (message, args) {
            let taggedUser = message.mentions.users.first();
            if (!taggedUser) {
                taggedUser = message.author;
            }

            containsUserInfo(taggedUser)
            .then(async resolve => {
                if (resolve) {
                    return await workingReaction(message);
                } else {
                    message.channel.send(taggedUser.username + ` has not set a summoner yet.`);
                    throw new Error('User has not set a summoner yet.');
                }
            })
            .then(() => {
                return refreshUserInfo(taggedUser);
            })
            .then(async function(mhInfo) {
                await successReaction(message);
                if (mhInfo.refreshedType != null) {
                    message.channel.send(`${taggedUser.username}'s user info has been refreshed successfully! (+${mhInfo.refreshedMatches} ${mhInfo.refreshedType} matches)`);
                } else {
                    message.channel.send(`${taggedUser.username}'s user info is already up-to-date.`);
                }
            })
            .catch(async error => {
                await errorReaction(message);
                console.log('Error refreshing user:', error);
                message.channel.send(`There was an error refreshing ${taggedUser.username}'s user info.`);
            })
        }
    },

    info: {
        name: 'info',
        aliases: ['get'],
        description: 'Displays the info of a Discord user if available.',
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
                    message.channel.send(taggedUser.username + ' has not set a summoner yet.');
                    throw new Error('Tagged user has not set a summoner yet.');
                }
            })
            .then(async info => {
                let embed = userInfoEmbed;
                embed.title = `${info.username}'s Info`;
                embed.timestamp = new Date();

                embed.fields[0].value = info.summoner;
                embed.fields[1].value = info.rank == null ? 'Unranked' : info.rank;
                embed.fields[2].value = info.comps == null ? 'Unknown' : info.comps;
                
                await successReaction(message);
                message.channel.send({embed: embed});
            })
            .catch(async error => {
                await errorReaction(message);
                console.log('Error refreshing user:', error);
                // message.channel.send(`There was an error getting ${taggedUser.username}'s user info.`);
            })
        }
    }
}

let userInfoEmbed = {
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
			name: 'Summoner name:',
            value: '',
            inline: false,
        },
        {
            name: 'Rank:',
            value: '',
            inline: false,
        },
        {
            name: 'Favorite Compositions:',
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