const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');
const {workingReaction, successReaction, errorReaction} = require('../src/reaction.js');

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
                                message.react('🔨')
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
                        return changeUserInfo(args.join('✅'), message.author);
                    })
                    .then(async function(resolve) {
                        console.log('Success!')
                        await successReaction(message);
                        message.channel.send('Summoner name ' + args.join(' ') + ' successfully added!');
                    })
                    .catch(async function (failure) {
                        await errorReaction(message);
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
                console.log('Failed. - ' + failure)
            });
        }
    },

    rank: {
        name: 'rank',
        description: 'Displays a Discord user\'s summoner rank.',
        execute: function (message, args) {
            const taggedUser = message.mentions.users.first();
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
            const taggedUser = message.mentions.users.first();
            containsUserInfo(taggedUser)
            .then(resolve => {
                if (resolve) {
                    return message.react('🔨');
                } else {
                    message.channel.send(taggedUser.username + ` has not set a summoner yet.`);
                }
            })
            .then(() => {
                return refreshUserInfo(taggedUser);
            })
            .then(async function() {
                await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                await message.react('✅');
                message.channel.send(taggedUser.username + `'s user info has been refreshed successfully!`);
            })
            .catch(async error => {
                await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                await message.react('❌');
                console.log('Error refreshing user:', error);
                message.channel.send(`There was an error refreshing ${taggedUser.username}'s.`);
            })
        }
    },
}