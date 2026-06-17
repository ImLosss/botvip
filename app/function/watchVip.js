require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const { isVip } = require('function/vip');

async function watchVip(bot, msg, value, config) {
    if(!value) return bot.sendMessage(msg.chat.id, 'Terjadi kesalahan, silakan coba lagi nanti.');
    let id = value.split('_')[0];
    let resolusi_index = parseInt(value.split('_')[1]) || 0;

    let vip = readJSONFileSync('./database/vip.json');
    let vipUsers = readJSONFileSync('database/vip_users.json');
    if (!vipUsers[msg.chat.id] || !isVip(vipUsers[msg.chat.id].vip_until)) {
        return bot.sendMessage(msg.chat.id, 'Status kamu saat ini belum VIP.\n\nIngin beli VIP?', { reply_markup: {
            inline_keyboard: [
                [{ text: 'Langganan VIP', callback_data: JSON.stringify({ function: '08' }) }],
            ]
        } });
    }
    
    if(!vip[id]) return bot.sendMessage(msg.chat.id, `Video dengan id ${id} tidak ditemukan, laporkan ke admin @Losss11 agar segera diperbaiki.`);

    bot.sendVideo(msg.chat.id, vip[id].resolusi[resolusi_index].file_id, { caption: `✨*VIP CONTENT*✨\n\n${vip[id].title} Episode ${vip[id].episode_number} ${vip[id].resolusi[resolusi_index].resolusi} Subtitle Indonesia`, parse_mode: 'Markdown',reply_markup: { inline_keyboard: getInlineKeyboard(vip[id].resolusi, vip[id].resolusi[resolusi_index].resolusi) } });
}

function getInlineKeyboard(resolutions, res) {
    let inline_keyboard = [];
    let buttons = [];

    resolutions.forEach((item, index) => {
        if(item.resolusi != res) {
            buttons.push({ text: `${item.resolusi}`, url: `https://t.me/dongworld_bot?start=watch_${newId}_${index}` });
            if (buttons.length === 2) {
                inline_keyboard.push(buttons);
                buttons = [];
            }
        }
    });
    if (buttons.length > 0) {
        inline_keyboard.push(buttons);
    }

    inline_keyboard.push([{ text: 'Channel VIP', url: 'https://t.me/dongworldvip' }]);
    
    return inline_keyboard;
}

module.exports = {
    watchVip
};