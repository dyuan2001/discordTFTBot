require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const twisted = require('twisted');

const AWS = require('aws-sdk');
const { IdentityStore } = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const docClient = new AWS.DynamoDB.DocumentClient();


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
                    matchListTft(getUserInfo(taggedUser).summoner)
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

async function matchListTft(summonerName) {
    console.log('In async function.');
    const {
      response: {
        puuid
      }
    } = await api.Summoner.getByName(summonerName, twisted.Constants.Regions.AMERICA_NORTH);
    console.log(puuid)
    return await api.Match.list(puuid, twisted.Constants.TftRegions.AMERICAS, 20);
  }

async function userLeagueTft(summonerName) {
    const {
        response: {
            id
        }
    }  = await api.Summoner.getByName(summonerName, twisted.Constants.Regions.AMERICA_NORTH);
    return await api.League.get(id, twisted.Constants.Regions.AMERICA_NORTH);
}

async function changeUserInfo(summonerName, author) {
    await userLeagueTft(summonerName)
    .then((resolve) => {
        rank = resolve.response[0].tier + ' ' + resolve.response[0].rank;
    })
    .catch((failure) => {
        console.log(failure);
        rank = null;
    })

    let userInfo = {
        username: author.username,
        summoner: summonerName,
        rank: rank,
        comps: null
    }

    const params = {
        TableName: 'discord-tft-bot',
        Item: {
            id: author.id,
            info: userInfo
        }
    }

    docClient.put(params, (error) => {
        if (!error) {
            return true;
        } else {
            console.log('Error: ' + error);
        }
    })

    // userInfo.set(username, {
    //     summoner: summonerName,
    //     rank: rank,
    //     comps: null
    // });
}

async function containsUserInfo(author) {
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

    // console.log(result);

    // if (result != '{}') {
    //     console.log('not empty');
    //     return true;
    // } else { 
    //     console.log('empty');
    //     return false;
    // }
}

async function getUserInfo(author) {
    const params = {
        TableName: 'discord-tft-bot',
        Key: {
            id: author.id
        }
    };

    let result = await docClient.get(params).promise();
    return result.Item.info;
}