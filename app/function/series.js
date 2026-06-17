require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const { getMessageInput } = require('service/messageInputService');

async function seriesHandler(bot, msg, value) {
    if(!value) return bot.sendMessage(msg.chat.id, 'Command salah. Format: /series <add|update|delete|search>');

    if(value === 'add') newSeries(bot, msg);
    if(value.startsWith('search')) search(bot, msg, value);
}

async function newSeries(bot, msg) {
    let title = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Masukkan judul series:');
    if (!title.text) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan teks untuk judul series.');
    title = title.text.trim();

    let cover = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Kirim gambar cover series:');
    if (!cover.photo) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap kirim gambar untuk cover series.');
    cover = cover.photo[cover.photo.length - 1].file_id;

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

async function search(bot, msg, value) {
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
    results.forEach(({ id, title, cover }) => {
        photos.push({ type: 'photo', media: cover, caption: `ID: ${id}\nJudul: ${title}` });
        response += `ID: ${id}\nJudul: ${title}\n\n`;
    });
    bot.sendMediaGroup(msg.chat.id, photos);
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