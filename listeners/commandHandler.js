require('module-alias/register');
const console = require('console');
const { readJSONFileSync, writeJSONFileSync, cutVal, withErrorHandling, updateFileId, updateMessageChannelId } = require("function/utils");
const cmd = require('service/commandImport')

const prefixFunctionsAdmin = {
    'series': withErrorHandling((bot, msg, value, config, fromId) => cmd.seriesHandler(bot, msg, value, config)),
    'vipcode': withErrorHandling((bot, msg, value, config, fromId) => cmd.vipCode(bot, msg)),
    'help': withErrorHandling((bot, msg, value, config, fromId) => cmd.helpAdmin(bot, msg)),
}

const prefixFunctions = {
    'buyvip': withErrorHandling((bot, msg, value, config, fromId) => cmd.buyVip(bot, msg, value)),
    'status': withErrorHandling((bot, msg, value, config, fromId) => cmd.statusVip(bot, msg, config)),
    'watch': withErrorHandling((bot, msg, value, config, fromId) => cmd.watchVip(bot, msg, value, config)),
    'claimvip': withErrorHandling((bot, msg, value, config, fromId) => cmd.claimVip(bot, msg, value, config))
}

const prefixFunctionsStart = {
    'watch': withErrorHandling((bot, msg, value, config, fromId) => cmd.watchVip(bot, msg, value, config))
}

const prefixFunctionsDB = {
    'series': withErrorHandling((bot, msg, value, config, fromId) => cmd.seriesHandler(bot, msg, value, config)),
    'vipcode': withErrorHandling((bot, msg, value, config, fromId) => cmd.vipCode(bot, msg))
}

module.exports = (function() {
    return function(bot) {
        bot.on('message', async (msg) => {
            console.log(msg);
            
            let config = readJSONFileSync(`./config.json`);
            if(!config.RECEIVE_MESSAGE) return console.log("Skip Message.");
            const prefix = ['/'];

            const text = msg.text || msg.caption;

            const username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

            if(!text) return;

            if(msg.body != "") console.log(text, `MessageFrom:${username}`);

            const value = cutVal(text, 1);

            if(msg.text != "") {
                for (const pre of prefix) {
                    if (text.startsWith(`${pre}`)) {
                        const funcName = text.replace(pre, '').trim().split(' ');
                        const fromId = msg.chat.id;

                        if (!funcName[0]) return;
                        if(funcName[0].includes('@')) funcName[0] = funcName[0].split('@')[0].toLowerCase();
                        if(msg.chat.type == 'private') {
                            if (prefixFunctionsAdmin[funcName[0]]) {
                                if(config.OWNER_ID !== msg.chat.id) return;
                                return prefixFunctionsAdmin[funcName[0]](bot, msg, value, config, fromId);
                            } else if (prefixFunctions[funcName[0]]) {
                                return prefixFunctions[funcName[0]](bot, msg, value, config, fromId);
                            } else if (funcName[0] === 'start') {
                                const payload = String(value || '').trim();
                                if (!payload) return cmd.statusVip(bot, msg, config);

                                const [key, ...rest] = payload.split('_');
                                const restValue = rest.join('_'); // sisanya (mis. id / token)

                                if (prefixFunctionsStart[key]) {
                                    bot.deleteMessage(msg.chat.id, msg.message_id);
                                    return prefixFunctionsStart[key](bot, msg, restValue, config, fromId);
                                }

                                return cmd.statusVip(bot, msg, config);
                            }
                        } else if (config.DB_ID == msg.chat.id) {
                            if (prefixFunctionsDB[funcName[0]]) {
                                return prefixFunctionsDB[funcName[0]](bot, msg, value, config, fromId);
                            }
                        }
                    }
                }
            }
        });
    };
})();