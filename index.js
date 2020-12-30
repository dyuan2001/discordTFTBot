require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

client.commands = new Discord.Collection();
for (const file of commandFiles) {
	const commandModule = require(`./commands/${file}`);
	// set a new item in the Collection
    // with the key as the command name and the value as the exported module
    let tempCollection = new Discord.Collection();
    for (const command in commandModule) {
        if (commandModule[command] != commandModule['topic']) {
            // Key = name, Value = entire command object
            console.log('name: ' + commandModule[command].name);
            tempCollection.set(commandModule[command].name, commandModule[command]);
        }
    }
	client.commands.set(commandModule.topic, tempCollection);
}

client.once('ready', () => {
	console.log('Ready!');
});

client.login();

client.on('message', message => {
    if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/);
    const commandTopic = args.shift().toLowerCase();
    console.log(commandTopic);

    // Test if the topic exists
    if (!client.commands.has(commandTopic)) return;

    // Gets the specific command from the topic
    let command;
    if (args[0] != undefined) {
        command = client.commands.get(commandTopic).get(args[0].toLowerCase())
		    || client.commands.get(commandTopic).find(cmd => cmd.aliases && cmd.aliases.includes(args[0]));
    } else {
        command = client.commands.get(commandTopic).get(undefined)
            || client.commands.get(commandTopic).find(cmd => cmd.aliases && cmd.aliases.includes(''));
    }
    if (!command) return;

    // No args; command has {args: true} property.
    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
    }

    try { // Find topic's collection  & execute it.
        command.execute(message, args.slice(1));
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
});