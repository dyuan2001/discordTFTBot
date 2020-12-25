require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const twisted = require('twisted');

client.once('ready', () => {
	console.log('Ready!');
});

client.login();

client.on('message', message => {
    if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

	if (command === 'tournament') {
        // send back "Pong." to the channel the message was sent in
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
                if (participants[i] === message.author.username) {
                    check = true;
                }
            }
            if (check) {
                message.channel.send(message.author.username + ', you are already registered for the tournament.');
            } else {
                participants.push(message.author.username);
                message.channel.send(message.author.username + ', you are now registered for the tournament!');
            }
        } else if (args[0] === 'unregister') { 
            let check = false;
            for (let i = 0; i < participants.length; i++) {
                if (participants[i] === message.author.username) {
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
    if (command === 'user') {
        const taggedUser = message.mentions.users.first();
        if (args[0] === 'add') {
            if (userInfo.has(message.author.username)) {
                message.channel.send('You already have a summoner name associated with you. Try changing it instead.');
            } else {
                userInfo.set(message.author.username, {
                    summoner: args[1],
                    rank: null,
                    comps: null
                });
                message.channel.send('Summoner name sucessfully added!');
            }
        } else if (args[0] === 'lolchess') {
            if (userInfo.has(taggedUser.username)) {
                message.channel.send('https://lolchess.gg/profile/na/' + userInfo.get(taggedUser.username).summoner);
            } else {
                message.channel.send('This user has not set a summoner name yet.');
            }
        } else if (args[0] === 'matches') {
            const taggedUser = message.mentions.users.first();
            if (userInfo.has(taggedUser.username)) {
                matchListTft(userInfo.get(taggedUser.username).summoner)
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
        }
    }
});

//Array for tournament participants
let participants = [];

let userInfo = new Map();

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

async function matchListTft (summonerName) {
    console.log('In async function.');
    const {
      response: {
        puuid
      }
    } = await api.Summoner.getByName(summonerName, twisted.Constants.Regions.AMERICA_NORTH);
    console.log(puuid)
    return await api.Match.list(puuid, twisted.Constants.TftRegions.AMERICAS, 20);
  }