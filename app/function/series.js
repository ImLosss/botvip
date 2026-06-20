require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const { getMessageInput } = require('service/messageInputService');
const { getChoiceInput } = require('service/choiceInputService');

async function seriesHandler(bot, msg, value, config) {
    if(!value) return bot.sendMessage(msg.chat.id, 'Command salah. Format: /series <add|update|delete|episode|delepisode|search>');

    if(value === 'add') newSeries(bot, msg, config);
    if(value.startsWith('search')) search(bot, msg, value, config);
    if(value.startsWith('delete')) deleteSeries(bot, msg, value, config);
    if(value.startsWith('update')) updateSeries(bot, msg, value, config);
    if(value.startsWith('episode')) newEpisode(bot, msg, value, config);
    if(value.startsWith('delepisode')) deleteEpisode(bot, msg, value, config);
}

async function newSeries(bot, msg, config) {
    let title = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Masukkan judul series:');
    if (!title.text) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan teks untuk judul series.');
    title = title.text.trim();

    let cover = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Kirim gambar cover series:');
    if (!cover.photo) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap kirim gambar untuk cover series.');
    cover = cover.photo[cover.photo.length - 1].file_id;

    bot.sendPhoto(config.DB_ID, cover);

    const seriesData = readJSONFileSync('./database/series.json');
    const newId = getNewId(seriesData);

    seriesData[newId] = {
        title,
        cover,
        episodes: {}
    };
    writeJSONFileSync('./database/series.json', seriesData);

    bot.sendPhoto(msg.chat.id, cover, { caption: `Series <b>${title}</b> berhasil ditambahkan dengan ID: <code>${newId}</code>`, parse_mode: 'HTML' });
}

async function deleteSeries(bot, msg, value, config) {
    const id = value.split(' ')[1];
    if (!id) return bot.sendMessage(msg.chat.id, 'Masukkan ID series yang ingin dihapus. Format: /series delete <id>');
    const seriesData = readJSONFileSync('./database/series.json');
    if (!seriesData[id]) return bot.sendMessage(msg.chat.id, 'Series dengan ID tersebut tidak ditemukan.');
    delete seriesData[id];
    writeJSONFileSync('./database/series.json', seriesData);
    bot.sendMessage(msg.chat.id, `Series dengan ID ${id} berhasil dihapus.`);
}

async function search(bot, msg, value, config) {
    const query = value.split(' ').slice(1).join(' ').toLowerCase();
    if (!query) return bot.sendMessage(msg.chat.id, 'Masukkan judul series yang ingin dicari. Format: /series search <judul>');

    const seriesData = readJSONFileSync('./database/series.json');
    const results = Object.entries(seriesData)
        .filter(([_, series]) => series.title.toLowerCase().includes(query))
        .map(([id, series]) => ({ id, ...series }));

    if (results.length === 0) {
        return bot.sendMessage(msg.chat.id, 'Series tidak ditemukan.');
    }

    let response = 'Hasil pencarian:\n\n';
    let photos = [];
    results.forEach(({ id, title, cover, episodes }) => {
        photos.push({ type: 'photo', media: cover, caption: `ID: ${id}\nJudul: ${title}\nTotal Episode: ${Object.keys(episodes).length}` });
        response += `ID: ${id}\nJudul: ${title}\n\n`;
    });
    bot.sendMediaGroup(msg.chat.id, photos);
}

async function updateSeries(bot, msg, value, config) {
    const id = value.split(' ')[1];
    if (!id) return bot.sendMessage(msg.chat.id, 'Masukkan ID series yang ingin diperbarui. Format: /series update <id>');
    const seriesData = readJSONFileSync('./database/series.json');
    if (!seriesData[id]) return bot.sendMessage(msg.chat.id, 'Series dengan ID tersebut tidak ditemukan.');
    const wantUpdate = await getChoiceInput(bot, msg.chat.id, 'Apa yang ingin diperbarui?', ['Judul', 'Cover']).catch(() => null);
    if (!wantUpdate) return bot.sendMessage(msg.chat.id, 'Tidak ada pilihan yang dipilih.');
    if (wantUpdate === 'Judul') {
        let newTitle = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Masukkan judul baru:').catch(() => null);
        if (!newTitle.text) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan teks untuk judul series.');
        seriesData[id].title = newTitle.text.trim();
    } else if (wantUpdate === 'Cover') {
        let newCover = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Kirim gambar cover baru:').catch(() => null);
        if (!newCover.photo) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap kirim gambar untuk cover series.');
        newCover = newCover.photo[newCover.photo.length - 1].file_id;
        seriesData[id].cover = newCover;
        bot.sendPhoto(config.DB_ID, newCover);
    }
    writeJSONFileSync('./database/series.json', seriesData);
    bot.sendMessage(msg.chat.id, `Series dengan ID ${id} berhasil diperbarui.`);
}

async function newEpisode(bot, msg, value, config) {
    let videoFileId = msg.video ? msg.video.file_id : (msg.reply_to_message?.video?.file_id || null);
    if (!videoFileId) return bot.sendMessage(msg.chat.id, 'Kirim video episode baru atau reply video sambil mengirimkan cmd ini!');
    const seriesId = value.split(' ')[1];
    if (!seriesId) return bot.sendMessage(msg.chat.id, 'Masukkan ID series untuk menambahkan episode baru. Format: /series episode <id_series>');
    const seriesData = readJSONFileSync('./database/series.json');
    if (!seriesData[seriesId]) return bot.sendMessage(msg.chat.id, 'Series dengan ID tersebut tidak ditemukan.');
    let confirm = await getChoiceInput(bot, msg.chat.id, `Apakah Anda ingin menambahkan episode baru untuk series <b>${seriesData[seriesId].title}</b>?`, ['Ya', 'Tidak']).catch(() => null);
    if (!confirm || confirm === 'Tidak') return bot.sendMessage(msg.chat.id, 'Penambahan episode dibatalkan.');

    let episode = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Masukkan episode:').catch((err) => { return err.message });
    if(!episode) return bot.sendMessage(msg.chat.id, episode);
    episode = episode.text.trim();

    if(Number.isNaN(Number(episode))) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan angka untuk episode.');

    let resolusi = await getChoiceInput(bot, msg.chat.id, 'Pilih resolusi video:', ['480p', '720p', '1080p', '4K']).catch(() => null);
    if (!resolusi) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap pilih resolusi video.');
    let notNewRes = seriesData[seriesId].episodes[episode]?.find(item => item.resolusi === resolusi);
    if (notNewRes) return bot.sendMessage(msg.chat.id, `Episode ${episode} dengan resolusi ${resolusi} sudah ada. Gunakan resolusi lain atau update episode yang ada.`);

    const usernameBot = await bot.getMe().then(me => me.username).catch(() => null);
    if (!usernameBot) return bot.sendMessage(msg.chat.id, 'Gagal mendapatkan informasi bot. Silakan coba lagi nanti.');

    bot.sendVideo(config.DB_ID, videoFileId).catch(() => console.log('Gagal menyimpan video ke database'));
    
    let isNew = seriesData[seriesId].episodes[episode] ? false : true;
    if (isNew) {
        seriesData[seriesId].episodes[episode] = [];
        let sendNotif = await getChoiceInput(bot, msg.chat.id, 'Apakah Anda ingin mengirim notifikasi ke semua pengguna?', ['Ya', 'Tidak']).catch(() => null);
        if (sendNotif === 'Ya') {
            bot.sendPhoto(config.USERNAME_CHANNEL, seriesData[seriesId].cover, { caption: `✨*UPDATE VIP*✨\n\n${seriesData[seriesId].title} Episode ${episode} Subtitle Indonesia`, parse_mode: 'Markdown', reply_markup: {
                inline_keyboard: [
                    [{ text: 'Obrolan SVIP', url: config.OBROLAN }],
                    [{ text: `Nonton`, url: `https://t.me/${usernameBot}?start=watch_${seriesId}_${episode}_${resolusi}` }]
                ]
            } });
        }
    }

    seriesData[seriesId].episodes[episode].push({ resolusi, file_id: videoFileId });
    writeJSONFileSync('./database/series.json', seriesData);
    bot.sendMessage(msg.chat.id, `Episode ${episode} dengan resolusi ${resolusi} berhasil ditambahkan ke series <b>${seriesData[seriesId].title}</b>.`, { parse_mode: 'HTML' });
}

async function deleteEpisode(bot, msg, value, config) {
    const [_, seriesId, episode] = value.split(' ');
    if (!seriesId || !episode) return bot.sendMessage(msg.chat.id, 'Masukkan ID series dan episode yang ingin dihapus. Format: /series delepisode <id_series> <episode>');
    
    const seriesData = readJSONFileSync('./database/series.json');

    let confirm = await getChoiceInput(bot, msg.chat.id, `Apakah Anda yakin ingin menghapus episode ${episode} dari series <b>${seriesData[seriesId]?.title || 'Unknown'}</b>?`, ['Ya', 'Tidak']).catch(() => null);
    if (!confirm || confirm === 'Tidak') return bot.sendMessage(msg.chat.id, 'Penghapusan episode dibatalkan.');

    if (!seriesData[seriesId]) return bot.sendMessage(msg.chat.id, 'Series dengan ID tersebut tidak ditemukan.');
    if (!seriesData[seriesId].episodes[episode]) return bot.sendMessage(msg.chat.id, `Episode dengan nomor tersebut tidak ditemukan dalam series ${seriesData[seriesId].title}.`);
    
    let deleteButton = seriesData[seriesId].episodes[episode].map(ep => ep.resolusi);
    deleteButton.push('Hapus Episode');
    
    let deleteChoice = await getChoiceInput(bot, msg.chat.id, 'Pilih resolusi video yang ingin dihapus:', deleteButton).catch(() => null);
    if (!deleteChoice) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap pilih resolusi video.');
    
    seriesData[seriesId].episodes[episode] = seriesData[seriesId].episodes[episode].filter(ep => ep.resolusi !== deleteChoice);
    if (seriesData[seriesId].episodes[episode].length === 0) delete seriesData[seriesId].episodes[episode];
    
    if(deleteChoice === 'Hapus Episode') delete seriesData[seriesId].episodes[episode];
    
    writeJSONFileSync('./database/series.json', seriesData);
    bot.sendMessage(msg.chat.id, `${ deleteChoice === 'Hapus Episode' ? `Episode ${episode} berhasil dihapus dari series ` : `Resolusi ${deleteChoice} berhasil dihapus dari episode ${episode} dalam series ` }<b>${seriesData[seriesId].title}</b>.`, { parse_mode: 'HTML' });
}

function getNewId(seriesData){
    const maxId = Object.keys(seriesData)
        .map(k => Number(k))
        .filter(n => Number.isFinite(n))
        .reduce((max, n) => Math.max(max, n), 0);

    const nextId = maxId + 1;

    return nextId;
}

module.exports = {
    seriesHandler
}