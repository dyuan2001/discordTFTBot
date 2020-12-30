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
    
    participants: { //defunct as participants' array is not in the AWS database yet.
        name: 'participants',
        description: 'Returns the participants currently registered for the tournament.',
        execute: function (message, args) {
            let result = 'Registered: ';
            participants.forEach(participant => {
                result = result + participant + ' ';
            });
            message.channel.send(result);
        }
    },
    
    register: { //defunct as participants' array is not in the AWS database yet.
        name: 'register',
        description: 'Registers the user for the upcoming tournament.',
        execute: function (message, args) {
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
        }
    },

    unregister: { //defunct as participants' array is not in the AWS database yet.
        name: 'unregister',
        description: 'Unregisters the user for the upcoming tournament.',
        execute: function (message, args) {
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
    },
}