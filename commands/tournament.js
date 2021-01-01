const {changeUserInfo, refreshUserInfo, containsUserInfo, getUserInfo} = require('../src/userConfig.js');
const {addParticipant, removeParticipant, containsParticipant, getParticipants} = require('../src/tournamentConfig.js');

module.exports = {
    topic: 'tournament',

    info: {
        name: 'info',
        aliases: [''],
        description: 'Provides information about the upcoming tournament.',
        execute: function (message, args) {
            message.channel.send('The first tournament of Set 4 will take place Saturday, September 26. Prizing details will be posted soon.');
            console.log('success for tournament');
        }
    }, 
    
    participants: {
        name: 'participants',
        description: 'Returns the participants currently registered for the tournament.',
        execute: async function (message, args) {
            response = await getParticipants();
            participants = response.participants;

            let result = 'Registered: (' + response.count + ')\n';
            participants.forEach(participant => {
                result = result + ' - ' + participant.info.username + '\n';
            });
            message.channel.send(result);
        }
    },
    
    register: {
        name: 'register',
        description: 'Registers the user for the upcoming tournament.',
        execute: function (message, args) {
            containsUserInfo(message.author)
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
            .then(() => message.channel.send('You have been successfully registered for the tournament, ' + message.author.username + '!'))
            .catch(error => {
                console.log('--------', error);
            })
        }
    },

    unregister: {
        name: 'unregister',
        description: 'Unregisters the user for the upcoming tournament.',
        execute: function (message, args) {
            containsParticipant(message.author)
            .then(containsParticipant => {
                if (containsParticipant) {
                    return removeParticipant(message.author);
                } else {
                    message.channel.send('We could not find ' + message.author.username + ' in the list of tournament participants.');
                    throw new Error(message.author.username + ' was never registered in the first place.');
                }
            })
            .then(() => message.channel.send('You have successfully been unregistered, ' + message.author.username + '.'))
            .catch(error => {
                console.log('--------', error);
            })
        }
    },
}