require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();

const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('./src/userConfig.js');
const {findSummonerIds, matchListTft, userLeagueTft} = require('./src/riotApi.js');

client.once('ready', () => {
	console.log('Ready!');
});

client.login();

client.on('message', message => {
    if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

	if (command === 'tournament') {
        if (args[0] === undefined) {
            message.channel.send('The first tournament of Set 4 will take place Saturday, September 26. Prizing details will be posted soon.');
        } else if (args[0] === 'participants') {
            let result = 'Registered: ';
            participants.forEach(participant => {
                result = result + participant + ' ';
            });
            message.channel.send(result);
        } else if (args[0] === 'register') {
            let check = false;
            for (let i = 0; i < participants.length; i++) {
                if (participants[i] === message.author.id) {
                    check = true;
                }
            }
            if (check) {
                message.channel.send(message.author.username + ', you are already registered for the tournament.');
            } else {
                participants.push(message.author.id);
                message.channel.send(message.author.username + ', you are now registered for the tournament!');
            }
        } else if (args[0] === 'unregister') { 
            let check = false;
            for (let i = 0; i < participants.length; i++) {
                if (participants[i] === message.author.id) {
                    check = true;
                    participants.splice(i, 1);
                }
            }
            if (check) {
                message.channel.send('You have successfully been unregistered, ' + message.author.username + '!');
            } else {
                message.channel.send('You are not registered yet, ' + message.author.username + '.');
            }
        }
    }
    if (command === 'summon') {
        message.channel.send(':HandsUp:');
    }
    /*
    USER SECTION
    */ 
    if (command === 'user') {
        const taggedUser = message.mentions.users.first();
        if (args[0] === 'add') {
            containsUserInfo(message.author)
            .then(async function addUser(resolve) {
                console.log('hello ' + resolve);
                if (resolve) {
                    console.log('in here');
                    let filter = m => m.author.id === message.author.id;
                    let newName = args[1];
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
                            .catch(failure => console.log('Failed. - ' + failure));
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
                    changeUserInfo(args[1], message.author)
                    .then(resolve => console.log('Success!'))
                    .catch(failure => console.log('Failed. - ' + failure));
                    message.channel.send('Summoner name ' + args[1] + ' successfully added!');
                }
            })
        } else if (args[0] === 'change') {
            changeUserInfo(args[1], message.author)
            .then(resolve => console.log('Success!'))
            .catch(failure => console.log('Failed. - ' + failure));
            message.channel.send('Summoner name successfully changed to ' + args[1] + '.');
        } else if (args[0] === 'rank') {
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
        } else if (args[0] === 'refresh') {
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
        } else if (args[0] === 'lolchess') {
            containsUserInfo(message.author)
            .then(resolve => {
                if (resolve) {
                    getUserInfo(message.author)
                    .then(info => {
                        console.log(info);
                        message.channel.send('https://lolchess.gg/profile/na/' + info.summoner)
                    });
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                }
            })
        } else if (args[0] === 'matches') {
            const taggedUser = message.mentions.users.first();
            containsUserInfo(taggedUser)
            .then(resolve => {
                if (resolve) {
                    getUserInfo(taggedUser)
                    .then(response => matchListTft(response.puuid))
                    .then((resolve) => {
                        console.log('Matches found!');
                        console.log(resolve);
                        message.channel.send(resolve.response.join('\n')); 
                    })
                    .catch((failure) => {
                        console.log('Matches not found.');
                        console.log(failure);
                    });
                } else {
                    message.channel.send('This user has not set a summoner name yet.');
                }
            })  
        }
    }
});

//Array for tournament participants
let participants = [];

//let userInfo = new Map();