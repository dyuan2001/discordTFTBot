module.exports = {
    workingReaction: async function (message) {
        await message.react('🔨');
    },

    successReaction: async function (message) {
        await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
        await message.react('✅');
    },

    errorReaction: async function (message) {
        await message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
        await message.react('❌');
    },
}


