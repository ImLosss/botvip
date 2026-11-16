require('module-alias/register');
const { writeJSONFileSync } = require('function/utils');

async function reset(bot, msg, config) {
    config.REVENUE = 0;
    config.BALANCE = 0;

    writeJSONFileSync('./config.json', config);

    bot.sendMessage(msg.chat.id, 'Berhasil mereset balance dan revenue menjadi 0.');
}

module.exports = {
    reset
};