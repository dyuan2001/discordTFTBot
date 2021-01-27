require('dotenv').config();

const AWS = require('aws-sdk');
const { IdentityStore } = require('aws-sdk');
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
const docClient = new AWS.DynamoDB.DocumentClient();

const {getUserInfo} = require('./userConfig.js');

module.exports = {
    addParticipant: async function (author) {
        userInfo = await getUserInfo(author);
        
        let info = {
            username: userInfo.username,
            summoner: userInfo.summoner,
        };
        
        const params = {
            TableName: 'discord-bot-tournament',
            Item: {
                id: author.id,
                info: info
            }
        };

        docClient.put(params, (error) => {
            if (!error) {
                return true;
            } else {
                console.log('Error adding participant:', error);
            }
        })
    },

    removeParticipant: async function (author) {
        const params = {
            TableName: 'discord-bot-tournament',
            Key: {
                id: author.id
            }
        };

        docClient.delete(params, (err, data) => {
            if (err) console.log('Error deleting participant:', err);
            else console.log('------ data:', data);
        });
    },

    containsParticipant: async function (author) {
        const params = {
            TableName: 'discord-bot-tournament',
            Key: {
                id: author.id
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item != undefined;
    },

    getParticipants: async function () {
        const params = {
            TableName: 'discord-bot-tournament',
        }

        let result = await docClient.scan(params).promise();
        
        result.Count--;

        // Need to access each Item's info element.
        return {
            participants: result.Items,
            count: result.Count,
        };
    },

    setTournamentInfo: async function (botId, args) {
        let info = args.join(' ');

        const params = {
            TableName: 'discord-bot-tournament',
            Item: {
                id: botId,
                info: info,
            }
        };

        await docClient.put(params).promise();
    },

    getTournamentInfo: async function (botId) {
        const params = {
            TableName: 'discord-bot-tournament',
            Key: {
                id: botId,
            }
        };

        let result = await docClient.get(params).promise();
        return result.Item.info;
    },
}