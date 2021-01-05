const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');

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
                    let filter = m => m.author.id === message.author.id;
                    let newName = args.join(' ');
                    let info = await getUserInfo(message.author);
                    message.channel.send('You already have an associated summoner ' + info.summoner + '. Would you like to change it to ' + newName + '? (Y/N)').then(() => {
                    message.channel.awaitMessages(filter, {
                        max: 1,
                        time: 30000,
                        errors: ['time']
                        })
                        .then(message => {
                        message = message.first();
                        if (message.content.toUpperCase() == 'YES' || message.content.toUpperCase() == 'Y') {
                            changeUserInfo(newName, message.author)
                            .then(resolve => console.log('Success!'))
                            .catch(failure => console.log('Failed changing user info. - ' + failure));
                            message.channel.send('Summoner name changed successfully to ' + newName + '.');
                        } else if (message.content.toUpperCase() == 'NO' || message.content.toUpperCase() == 'N') {
                            message.channel.send('Summoner name unchanged.');
                        } else {
                            message.channel.send('Invalid response - please redo the command and enter either Y or N.');
                        }
                        })
                        .catch(collected => {
                            message.channel.send('Command has timed out.');
                        });
                    })
                } else {
                    changeUserInfo(args.join(' '), message.author)
                    .then(resolve => console.log('Success!'))
                    .catch(failure => console.log('Failed. - ' + failure));
                    message.channel.send('Summoner name ' + args.join(' ') + ' successfully added!');
                }
            })
        }
    },

    change: {
        name: 'change',
        description: 'Changes a summoner for a Discord user.',
        execute: function(message, args) {
            changeUserInfo(args.join(' '), message.author)
            .then(resolve => console.log('Success!'))
            .catch(failure => console.log('Failed. - ' + failure));
            message.channel.send('Summoner name successfully changed to ' + args[0] + '.');
        }
    },

    rank: {
        name: 'rank',
        description: 'Displays a Discord user\'s summoner rank.',
        execute: function (message, args) {
            const taggedUser = message.mentions.users.first();
            containsUserInfo(taggedUser)
            .then(resolve => {
                if (resolve) {
                    getUserInfo(taggedUser)
                    .then(info => {
                        if (info.rank != null) {
                            message.channel.send(taggedUser.username + `'s rank is ` + info.rank + '. (Summoner name: ' + info.summoner + ')');
                        } else {
                            message.channel.send(taggedUser.username + ' has an error with their rank.');
                        }
                    })
                } else {
                    message.channel.send(taggedUser.username + ' has not set a summoner yet.');
                }
            });
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
                    refreshUserInfo(taggedUser);
                    message.channel.send(taggedUser.username + `'s user info has been refreshed successfully!`);
                } else {
                    message.channel.send(taggedUser.username + ` has not set a summoner yet.`);
                }
            })
        }
    },
}