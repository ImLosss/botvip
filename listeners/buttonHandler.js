require('module-alias/register');
const console = require('console');
const { readJSONFileSync, writeJSONFileSync, cutVal, withErrorHandling } = require("function/utils");
const cmd = require('service/commandImport');
const { resolveChoiceInput } = require('service/choiceInputService');

const callbackFunctions = {
    '07': { handler: cmd.chargeTransaction, delete: true },
    '08': { handler: cmd.buyVip, delete: true },
    '09': { handler: cmd.cancelTransaction, delete: true },
    '10': { handler: cmd.checkTransaction, delete: false },
};

module.exports = (function() {
    return function(bot) {
        bot.on('callback_query', (query) => {
            let data;
            let config = readJSONFileSync(`./config.json`);

            if(!config.RECEIVE_MESSAGE) return console.log("Skip Callback Query.");
            try {
                data = JSON.parse(query.data);
            } catch (e) {
                return bot.answerCallbackQuery(query.id, { text: 'Invalid callback data' });
            }

            console.log(data);

            const fn = callbackFunctions[data.function]?.handler || false;
            if (typeof fn === 'function') {
                if (callbackFunctions[data.function].delete) bot.deleteMessage(query.message.chat.id, query.message.message_id);
                fn(bot, query, data, config);
            } else if (data.type === 'INPUT_BUTTON') {
                const resolved = resolveChoiceInput(data.id, data.value);
                bot.deleteMessage(query.message.chat.id, query.message.message_id);
                if (resolved) bot.answerCallbackQuery(query.id, { text: `Pilihan ${data.value} selected` });
            } else {
                bot.answerCallbackQuery(query.id, { text: 'Unknown action' });
                bot.deleteMessage(query.message.chat.id, query.message.message_id);
            }
        });

    };
})();