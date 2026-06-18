require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const { isVip } = require('function/vip');

async function watchVip(bot, msg, value, config) {
    if(!value) return bot.sendMessage(msg.chat.id, 'Terjadi kesalahan, silakan coba lagi nanti.');
    const [id, epStr, resStr] = value.split('_');
    const episode = parseInt(epStr);
    const resolusi = resStr || '1080p';

    let vipUsers = readJSONFileSync('database/vip_users.json');
    if (!vipUsers[msg.chat.id] || !isVip(vipUsers[msg.chat.id].vip_until)) {
        return bot.sendMessage(msg.chat.id, 'Status kamu saat ini belum VIP.\n\nIngin beli VIP?', { reply_markup: {
            inline_keyboard: [
                [{ text: 'Langganan VIP', callback_data: JSON.stringify({ function: '08' }) }],
            ]
        } });
    }
    
    let series = readJSONFileSync('./database/series.json');

    if(!series[id]) return bot.sendMessage(msg.chat.id, `Video tidak ditemukan, laporkan ke admin agar segera diperbaiki.`);

    const targetEpisode = series[id].episodes?.[episode]; 
    if (!targetEpisode) {
        return bot.sendMessage(msg.chat.id, `Episode tidak ditemukan, laporkan ke admin agar segera diperbaiki.`);
    }

    const videoData = targetEpisode.find(item => item.resolusi == resolusi) || targetEpisode[0];
    if (!videoData) {
        return bot.sendMessage(msg.chat.id, `Resolusi ${resolusi} Episode ${episode} ${series[id].title} tidak tersedia, laporkan ke admin agar segera diperbaiki.`);
    }

    const usernameBot = await bot.getMe().then(me => me.username).catch(() => null);
    if (!usernameBot) {
        await bot.sendMessage(config.OWNER_ID, `Gagal mendapatkan informasi bot saat user ${msg.chat.id} mencoba menonton VIP dengan ID ${id}.`);
        return bot.sendMessage(msg.chat.id, 'Terjadi kesalahan, coba lagi nanti.');
    }

    const availableEpisodes = Object.keys(series[id].episodes)
        .map(Number)
        .sort((a, b) => a - b);

    const currentIndex = availableEpisodes.indexOf(episode);

    const hasPrev = currentIndex > 0;
    const prevEpisodeNumber = hasPrev ? availableEpisodes[currentIndex - 1] : null;

    const hasNext = currentIndex !== -1 && currentIndex < availableEpisodes.length - 1;
    const nextEpisodeNumber = hasNext ? availableEpisodes[currentIndex + 1] : null;

    let keyboard = [];
    let navButtons = [];

    console.log(usernameBot);

    // Tambahkan tombol "Previous" jika ada
    if (hasPrev) {
        navButtons.push({ 
            text: `« Ep ${prevEpisodeNumber}`, 
            url: `https://t.me/${usernameBot}?start=watch_${id}_${prevEpisodeNumber}`
        });
    }

    // Tambahkan tombol "Next" jika ada
    if (hasNext) {
        navButtons.push({ 
            text: `Ep ${nextEpisodeNumber} »`, 
            url: `https://t.me/${usernameBot}?start=watch_${id}_${nextEpisodeNumber}`
        });
    }
    
    if (navButtons.length > 0) keyboard.push(navButtons); 
    navButtons = [];

     // Tambahkan tombol resolusi lain jika tersedia
    series[id].episodes[episode].forEach(item => {
        if (item.resolusi != resolusi) {
            if (navButtons.length === 2) {
                keyboard.push(navButtons);
                navButtons = [];
            }

            navButtons.push({
                text: `${item.resolusi}`,
                url: `https://t.me/${usernameBot}?start=watch_${id}_${episode}_${item.resolusi}`
            });
        }
    });

    if (navButtons.length > 0) keyboard.push(navButtons);

    keyboard.push([{ text: 'Channel VIP', url: `https://t.me/${config.USERNAME_CHANNEL.replace('@', '')}` }]);

    bot.sendVideo(msg.chat.id, videoData.file_id, { caption: `✨*VIP CONTENT*✨\n\n${series[id].title} Episode ${episode} ${videoData.resolusi} Subtitle Indonesia`, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
}

module.exports = {
    watchVip
};