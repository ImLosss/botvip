require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const { isVip } = require('function/vip');
const cache = require('cache');

const EPISODES_PER_PAGE = 20;
const SERIES_PER_PAGE = 6;

async function watchVip(bot, msg, value, config) {
    if(!value) return bot.sendMessage(msg.chat.id, 'Terjadi kesalahan, silakan coba lagi nanti.');
    const [id, epStr, resStr] = value.split('_');
    const episode = epStr?.trim().replace(/-/g, '.');
    if (!episode || Number.isNaN(Number(episode))) {
        return bot.sendMessage(msg.chat.id, 'Episode tidak valid, silakan coba lagi nanti.');
    }
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

    const usernameBot = cache.get('bot_username');
    if (!usernameBot) {
        await bot.sendMessage(config.OWNER_ID, `Gagal mendapatkan informasi bot saat user ${msg.chat.id} mencoba menonton VIP dengan ID ${id}.`);
        return bot.sendMessage(msg.chat.id, 'Terjadi kesalahan, coba lagi nanti.');
    }

    const availableEpisodes = Object.keys(series[id].episodes)
        .sort((a, b) => Number(a) - Number(b));

    const currentIndex = availableEpisodes.indexOf(episode);

    const hasPrev = currentIndex > 0;
    const prevEpisodeNumber = hasPrev ? availableEpisodes[currentIndex - 1] : null;

    const hasNext = currentIndex !== -1 && currentIndex < availableEpisodes.length - 1;
    const nextEpisodeNumber = hasNext ? availableEpisodes[currentIndex + 1] : null;

    let keyboard = [];
    let navButtons = [];

    // Tambahkan tombol "Previous" jika ada
    if (hasPrev) {
        navButtons.push({ 
            text: `« Ep ${prevEpisodeNumber}`, 
            url: `https://t.me/${usernameBot}?start=watch_${id}_${prevEpisodeNumber.replace(/\./g, '-')}`
        });
    }

    // Tambahkan tombol "Next" jika ada
    if (hasNext) {
        navButtons.push({ 
            text: `Ep ${nextEpisodeNumber} »`, 
            url: `https://t.me/${usernameBot}?start=watch_${id}_${nextEpisodeNumber.replace(/\./g, '-')}`
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
                url: `https://t.me/${usernameBot}?start=watch_${id}_${episode.replace(/\./g, '-')}_${item.resolusi}`
            });
        }
    });

    if (navButtons.length > 0) keyboard.push(navButtons);

    const targetPage = currentIndex !== -1 ? Math.floor(currentIndex / EPISODES_PER_PAGE) + 1 : 1;

    keyboard.push([
        { text: '🎬 Pilih Episode', callback_data: JSON.stringify({ function: '11', id: String(id), p: targetPage }) },
        { text: '📚 Semua Series', callback_data: JSON.stringify({ function: '12', p: 1 }) }
    ]);

    keyboard.push([{ text: 'Channel VIP', url: `https://t.me/${config.USERNAME_CHANNEL.replace('@', '')}` }]);

    if(videoData.isDoc) {
        bot.sendDocument(msg.chat.id, videoData.file_id, { caption: `✨*VIP CONTENT*✨\n\n${series[id].title} Episode ${episode} ${videoData.resolusi} Subtitle Indonesia`, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } })
        .catch((err) => {
            console.log(err);
            bot.sendMessage(msg.chat.id, `Terjadi kesalahan saat mengirim video. Silakan coba lagi nanti.`);
        });
    } else {
        bot.sendVideo(msg.chat.id, videoData.file_id, { caption: `✨*VIP CONTENT*✨\n\n${series[id].title} Episode ${episode} ${videoData.resolusi} Subtitle Indonesia`, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } })
        .catch((err) => {
            console.log(err);
            bot.sendMessage(msg.chat.id, `Terjadi kesalahan saat mengirim video. Silakan coba lagi nanti.`);
        });
    }
}

function checkVipAccess(bot, chatId) {
    const vipUsers = readJSONFileSync('database/vip_users.json') || {};
    if (!vipUsers[chatId] || !isVip(vipUsers[chatId].vip_until)) {
        bot.sendMessage(chatId, 'Status kamu saat ini belum VIP.\n\nIngin beli VIP?', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Langganan VIP', callback_data: JSON.stringify({ function: '08' }) }],
                ]
            }
        });
        return false;
    }
    return true;
}

async function chooseEpisode(bot, chatId, seriesId, page = 1, messageId = null, currentEpisode = null) {
    if (!checkVipAccess(bot, chatId)) return;

    const series = readJSONFileSync('./database/series.json') || {};
    const targetSeries = series[seriesId];

    if (!targetSeries) {
        const text = 'Series tidak ditemukan atau telah dihapus.';
        if (messageId) {
            return bot.editMessageText(text, { chat_id: chatId, message_id: messageId }).catch(() => {
                bot.sendMessage(chatId, text);
            });
        }
        return bot.sendMessage(chatId, text);
    }

    const availableEpisodes = Object.keys(targetSeries.episodes || {})
        .sort((a, b) => Number(a) - Number(b));

    if (availableEpisodes.length === 0) {
        const text = `Series *${targetSeries.title}* belum memiliki episode yang tersedia.`;
        const keyboard = [[{ text: '📚 Kembali ke Daftar Series', callback_data: JSON.stringify({ function: '12', p: 1 }) }]];
        if (messageId) {
            return bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }).catch(() => {
                bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
            });
        }
        return bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    }

    const totalPages = Math.ceil(availableEpisodes.length / EPISODES_PER_PAGE) || 1;
    const currentPage = Math.max(1, Math.min(Number(page) || 1, totalPages));
    const startIdx = (currentPage - 1) * EPISODES_PER_PAGE;
    const pageEpisodes = availableEpisodes.slice(startIdx, startIdx + EPISODES_PER_PAGE);

    const COLS = 5;
    let keyboard = [];
    let currentRow = [];

    pageEpisodes.forEach(ep => {
        const isCurrent = currentEpisode && String(currentEpisode) === String(ep);
        currentRow.push({
            text: isCurrent ? `▶️ ${ep}` : `${ep}`,
            callback_data: JSON.stringify({ function: '13', id: String(seriesId), ep: String(ep) })
        });
        if (currentRow.length === COLS) {
            keyboard.push(currentRow);
            currentRow = [];
        }
    });
    if (currentRow.length > 0) {
        keyboard.push(currentRow);
    }

    let navRow = [];
    if (currentPage > 1) {
        navRow.push({
            text: '« Prev',
            callback_data: JSON.stringify({ function: '11', id: String(seriesId), p: currentPage - 1 })
        });
    }
    navRow.push({
        text: `${currentPage}/${totalPages}`,
        callback_data: JSON.stringify({ function: 'noop' })
    });
    if (currentPage < totalPages) {
        navRow.push({
            text: 'Next »',
            callback_data: JSON.stringify({ function: '11', id: String(seriesId), p: currentPage + 1 })
        });
    }
    if (totalPages > 1) {
        keyboard.push(navRow);
    }

    keyboard.push([
        { text: '📚 Daftar Series', callback_data: JSON.stringify({ function: '12', p: 1 }) },
        { text: '❌ Tutup', callback_data: JSON.stringify({ function: '14' }) }
    ]);

    const text = `🎬 *${targetSeries.title}*\n` +
        `📺 Total Episode: *${availableEpisodes.length}*\n` +
        `📄 Halaman: *${currentPage}/${totalPages}*\n\n` +
        `Pilih episode yang ingin ditonton:`;

    if (messageId) {
        return bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        }).catch(err => {
            if (err.response?.body?.description?.includes('message is not modified')) return;
            bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
        });
    } else {
        return bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
}

async function listAllSeries(bot, chatId, page = 1, messageId = null) {
    if (!checkVipAccess(bot, chatId)) return;

    const series = readJSONFileSync('./database/series.json') || {};
    const seriesList = Object.entries(series).map(([id, item]) => ({ id, ...item }));

    if (seriesList.length === 0) {
        const text = 'Saat ini belum ada series yang tersedia.';
        if (messageId) {
            return bot.editMessageText(text, { chat_id: chatId, message_id: messageId }).catch(() => {
                bot.sendMessage(chatId, text);
            });
        }
        return bot.sendMessage(chatId, text);
    }

    const totalPages = Math.ceil(seriesList.length / SERIES_PER_PAGE) || 1;
    const currentPage = Math.max(1, Math.min(Number(page) || 1, totalPages));
    const startIdx = (currentPage - 1) * SERIES_PER_PAGE;
    const pageSeries = seriesList.slice(startIdx, startIdx + SERIES_PER_PAGE);

    let keyboard = pageSeries.map(item => {
        const totalEp = Object.keys(item.episodes || {}).length;
        const displayTitle = item.title.length > 28 ? item.title.substring(0, 25) + '...' : item.title;
        return [{
            text: `🎬 ${displayTitle} (${totalEp} Ep)`,
            callback_data: JSON.stringify({ function: '11', id: String(item.id), p: 1 })
        }];
    });

    let navRow = [];
    if (currentPage > 1) {
        navRow.push({
            text: '« Prev',
            callback_data: JSON.stringify({ function: '12', p: currentPage - 1 })
        });
    }
    navRow.push({
        text: `${currentPage}/${totalPages}`,
        callback_data: JSON.stringify({ function: 'noop' })
    });
    if (currentPage < totalPages) {
        navRow.push({
            text: 'Next »',
            callback_data: JSON.stringify({ function: '12', p: currentPage + 1 })
        });
    }
    if (totalPages > 1) {
        keyboard.push(navRow);
    }

    keyboard.push([{ text: '❌ Tutup', callback_data: JSON.stringify({ function: '14' }) }]);

    const text = `📚 *DAFTAR SERIES VIP*\n` +
        `📄 Halaman: *${currentPage}/${totalPages}* | Total: *${seriesList.length}* Series\n\n` +
        `Pilih series yang ingin kamu tonton:`;

    if (messageId) {
        return bot.editMessageText(text, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        }).catch(err => {
            if (err.response?.body?.description?.includes('message is not modified')) return;
            bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
        });
    } else {
        return bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
}

async function chooseEpisodeCallback(bot, query, data, config) {
    const chatId = query.message.chat.id;
    bot.answerCallbackQuery(query.id).catch(() => {});

    const isMediaMessage = Boolean(query.message.video || query.message.document);
    const messageIdToEdit = isMediaMessage ? null : query.message.message_id;

    return chooseEpisode(bot, chatId, data.id, data.p || 1, messageIdToEdit);
}

async function listSeriesCallback(bot, query, data, config) {
    const chatId = query.message.chat.id;
    bot.answerCallbackQuery(query.id).catch(() => {});

    const isMediaMessage = Boolean(query.message.video || query.message.document);
    const messageIdToEdit = isMediaMessage ? null : query.message.message_id;

    return listAllSeries(bot, chatId, data.p || 1, messageIdToEdit);
}

async function watchEpisodeCallback(bot, query, data, config) {
    bot.answerCallbackQuery(query.id, { text: `Memuat Episode ${data.ep}...` }).catch(() => {});
    return watchVip(bot, query.message, `${data.id}_${data.ep}`, config);
}

async function closeMessageCallback(bot, query, data, config) {
    bot.answerCallbackQuery(query.id, { text: 'Ditutup' }).catch(() => {});
    bot.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => {});
}

async function listSeriesUser(bot, msg, value, config) {
    const page = Number(value) || 1;
    return listAllSeries(bot, msg.chat.id, page);
}

async function chooseEpisodeUser(bot, msg, value, config) {
    const [seriesId, page] = (value || '').split('_');
    if (!seriesId) return listAllSeries(bot, msg.chat.id, 1);
    return chooseEpisode(bot, msg.chat.id, seriesId, Number(page) || 1);
}

module.exports = {
    watchVip,
    chooseEpisode,
    listAllSeries,
    chooseEpisodeCallback,
    listSeriesCallback,
    watchEpisodeCallback,
    closeMessageCallback,
    listSeriesUser,
    chooseEpisodeUser
};