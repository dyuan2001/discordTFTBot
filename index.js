const Discord = require('discord.js');
const client = new Discord.Client();

client.once('ready', () => {
	console.log('Ready!');
});

client.login('NzU0NDI4NDMwMTkxMjk2NTIz.X10mOg.UofTg-ybsrZkzuHjuG1J-Ui2b38');

client.on('message', message => {
	if (message.content === '!ping') {
        // send back "Pong." to the channel the message was sent in
        message.channel.send('Pong.');
    }
    if (message.content === '!pong') {
        // send back "Pong." to the channel the message was sent in
        message.channel.send('Ping.');
    }
});