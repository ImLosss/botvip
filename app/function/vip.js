require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const { createQrisTransactionPakasir, cancelTransactionPakasir, getTransactionDetailPakasir } = require('function/pakasir');
const { getMessageInput } = require('service/messageInputService');

async function statusVip(bot, msg, config) {
    let vipData = readJSONFileSync('database/vip_users.json');
    let chatId = msg.chat.id;
    if (!vipData[chatId] || !isVip(vipData[chatId].vip_until)) { 
        let message = `Status VIP kamu saat ini: <b>Belum VIP</b>.\n\nIngin beli VIP?`;
        if (vipData[chatId] && vipData[chatId].vip_until) message = `VIP kamu telah kadaluarsa pada:\n<b>${vipData[chatId].vip_until}</b>.\n\nIngin beli VIP?`;
        bot.sendMessage(chatId, message, { parse_mode: 'HTML', reply_markup: {
            inline_keyboard: [
                [{ text: 'Langganan VIP', callback_data: JSON.stringify({ function: '08' }) }],
            ]
        } });
    } else {
        bot.sendMessage(chatId, `VIP kamu aktif hingga: <b>${vipData[chatId].vip_until}</b>.\n\nUID: <code>${chatId}</code>\n\nIngin memperpanjang VIP?`, { parse_mode: 'HTML', reply_markup: {
            inline_keyboard: [
                [{ text: 'Perpanjang VIP', callback_data: JSON.stringify({ function: '08' }) }],
                [{ text: 'Channel VIP', url: `https://t.me/${config.USERNAME_CHANNEL.replace('@', '')}` }],
            ]
        } });
    }
}

async function buyVip(bot, msg) {
    const chatType = msg.chat?.type ?? msg.message?.chat?.type;
    if (chatType !== 'private') return;

    let config = readJSONFileSync('./config.json');

    const chatId = msg.chat?.id ?? msg.message?.chat?.id;

    let months = [1, 2, 5, 8, 10, 12];
    let buttons = months.map(month => {
        const hargaNormal = `Rp ${(config.PRICE_MONTH * month).toLocaleString('id-ID')}`;

        return [{
            text: config.DISCOUNT.MONTH === month 
                ? `🔥 ${month} Bulan - ${hargaNormal.split('').join('\u0336') + '\u0336'} Rp ${config.DISCOUNT.PRICE.toLocaleString('id-ID')}` 
                : `${month} Bulan - ${hargaNormal}`,
            callback_data: JSON.stringify({ function: '07', months: month })
        }];
    });

    bot.sendMessage(chatId, 'Ingin langganan vip berapa bulan?', { reply_markup: {
        inline_keyboard: buttons
    } });
}

async function vipCode(bot, msg) {
    let jumlah = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Masukkan jumlah code vip yang akan dibuat:');
    if (!jumlah.text || isNaN(jumlah.text) || parseInt(jumlah.text) <= 0) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan angka yang valid untuk jumlah code vip.');
    let days = await getMessageInput(bot, msg.chat.id, msg.from.id, 'VIP untuk berapa hari?');
    if (!days.text || isNaN(days.text) || parseInt(days.text) <= 0) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan angka yang valid untuk jumlah hari code vip.');
    jumlah = parseInt(jumlah.text);
    days = parseInt(days.text);

    const vipCodes = readJSONFileSync('database/vip_code.json');
    for (let i = 0; i < jumlah; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        vipCodes.push({ code, days });
    }
    writeJSONFileSync('database/vip_code.json', vipCodes);

    bot.sendMessage(msg.chat.id, `Berhasil membuat ${jumlah} code vip selama ${days} hari.\nGunakan code ini dengan cara /claimvip [code]\n\nCode vip:\n${vipCodes.slice(-jumlah).map(code => `<code>${code.code}</code>`).join('\n')}`, { parse_mode: 'HTML' });
}

async function claimVip(bot, msg, code, config) {
    let vipCodes = readJSONFileSync('database/vip_code.json');
    let vipData = readJSONFileSync('database/vip_users.json');
    let chatId = msg.chat.id;

    if (!code) return bot.sendMessage(chatId, 'Harap sertakan code VIP yang ingin diklaim. Contoh: /claimvip ABCD1234');

    const codeIndex = vipCodes.findIndex(vipCode => vipCode.code === code);
    if (codeIndex === -1) return bot.sendMessage(chatId, 'Code VIP tidak valid atau sudah digunakan.');

    const days = vipCodes[codeIndex].days;
    if (!vipData[chatId]) vipData[chatId] = { order_id: null, vip_until: null, message_id: null };

    vipData[chatId].vip_until = vipData[chatId].vip_until ? new Date(Math.max(new Date(vipData[chatId].vip_until).getTime(), Date.now())) : new Date();
    vipData[chatId].vip_until.setDate(vipData[chatId].vip_until.getDate() + days);
    vipData[chatId].vip_until = vipData[chatId].vip_until.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    writeJSONFileSync('database/vip_users.json', vipData);
    vipCodes.splice(codeIndex, 1);
    writeJSONFileSync('database/vip_code.json', vipCodes);

    bot.sendMessage(chatId, `Selamat! VIP kamu telah diperpanjang selama ${days} hari.\nVIP aktif hingga: <b>${vipData[chatId].vip_until}</b>`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: 'Channel VIP', url: `https://t.me/${config.USERNAME_CHANNEL.replace('@', '')}` }]] } });

    bot.sendMessage(config.OWNER_ID, `Code VIP ${code} telah digunakan oleh ${msg.from.username ? '@' + msg.from.username : msg.from.first_name} (${chatId}). VIP diperpanjang selama ${days} hari.`, { parse_mode: 'HTML' });
}

async function chargeTransaction(bot, query, data, config) {
    if(query.message.chat.type !== 'private') return;

    let chatId = query.message.chat.id;
    let vipData = readJSONFileSync('database/vip_users.json');

    if(vipData[chatId] && vipData[chatId].qris_expiry) {
        const expiryTime = new Date(vipData[chatId].qris_expiry);
        if (expiryTime > new Date()) {
            return bot.sendMessage(chatId, `Kamu masih memiliki transaksi yang belum selesai. Silakan selesaikan pembayaran sebelum melakukan pembelian VIP lagi.\n\nTransaksi ini akan berakhir pada: <b>${expiryTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</b>.`, { parse_mode: 'HTML' });
        }
    }

    if (!vipData[chatId]) vipData[chatId] = { order_id: null, vip_until: null, message_id: null };

    const username = query.from.username ? `@${query.from.username}` : query.from.first_name + ` ${query.from.last_name || ''}`;

    let orderId = `vip-${chatId}-${Date.now()}`;

    let price = data.months * config.PRICE_MONTH;
    if (config.DISCOUNT.MONTH === data.months) price = config.DISCOUNT.PRICE;

    const respakasir = await createQrisTransactionPakasir(config.PAKASIR_PROJECT, orderId, price);

    const expMins = getRemainingExpiredMin(respakasir.payment.expired_at);

    const encodedQris = encodeURIComponent(respakasir.payment.payment_number);
    let qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedQris}`;

    bot.sendPhoto(query.message.chat.id, qrImageUrl, {
        parse_mode: 'HTML',
        caption:
            `Order ID: <code>${respakasir.payment.order_id}</code>\n` +
            `Nama: ${username}\n` +
            `VIP selama: ${data.months} Bulan\n` +
            `Total: IDR ${respakasir.payment.total_payment.toLocaleString('id-ID')}\n` +
            `Metode Pembayaran: QRIS\n` +
            `Expired: ${convertToWib(respakasir.payment.expired_at)} WIB (${expMins} Menit)\n` +
            // `qrisLink: ${qrImageUrl}\n\n` +
            `Catatan:\n` +
            `- Pastikan kamu melakukan pembayaran sesuai dengan nominal diatas.\n` +
            `- Setelah melakukan pembayaran, harap tunggu beberapa saat hingga sistem kami memproses pembayaran kamu secara otomatis.\n` +
            `- VIP kamu akan diperpanjang jika status kamu saat ini sudah vip\n` +
            `- Hubungi admin ${config.USERNAME_ADMIN} jika ada kendala.`,
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Batal', callback_data: JSON.stringify({ function: '09' }) }],
                // [{ text: 'Cek Pembayaran', callback_data: JSON.stringify({ function: '10' }) }]
            ]
        }
    }).then((result) => {
        vipData[chatId].order_id = respakasir.payment.order_id;
        vipData[chatId].amount = respakasir.payment.amount;
        vipData[chatId].month = data.months;
        vipData[chatId].message_id = result.message_id;
        vipData[chatId].qris_expiry = new Date(Date.now() + expMins * 60000).toISOString();
        writeJSONFileSync('database/vip_users.json', vipData);
    });  
}

async function cancelTransaction(bot, query) {
    let chatId = query.message.chat.id;
    let vipData = readJSONFileSync('database/vip_users.json');
    const cancelResult = await cancelTransactionPakasir(vipData[chatId].order_id, vipData[chatId].amount);
    if (!cancelResult.success) return bot.sendMessage(chatId, 'Gagal membatalkan transaksi. Silakan coba lagi nanti.');
    vipData[chatId].qris_expiry = null;
    vipData[chatId].order_id = null;
    vipData[chatId].amount = null;
    vipData[chatId].month = null;
    vipData[chatId].message_id = null;
    writeJSONFileSync('database/vip_users.json', vipData);

    bot.deleteMessage(chatId, query.message.message_id).catch(err => console.error('Failed to delete message:', err.message));

    bot.sendMessage(chatId, 'Transaksi berhasil dibatalkan. Kamu bisa mencoba membeli VIP lagi jika masih berminat.', { reply_markup: {
        inline_keyboard: [
            [{ text: 'Beli VIP', callback_data: JSON.stringify({ function: '08' }) }]
        ]
    } });
}

async function checkTransaction(bot, query, data, config) {
    let chatId = query.message.chat.id;
    let vipData = readJSONFileSync('database/vip_users.json');
    if (!vipData[chatId] || !vipData[chatId].order_id) return bot.sendMessage(chatId, 'Tidak ada transaksi yang sedang berlangsung. Silakan lakukan pembelian VIP terlebih dahulu.', { reply_markup: {
        inline_keyboard: [
            [{ text: 'Beli VIP', callback_data: JSON.stringify({ function: '08' }) }]
        ]
    } });
    const detailResult = await getTransactionDetailPakasir(vipData[chatId].order_id, vipData[chatId].amount);
    if (!detailResult.transaction?.status) return bot.sendMessage(chatId, 'Gagal memeriksa transaksi. Silakan coba lagi nanti.');
    const status = detailResult.transaction.status;
    if (status === 'completed') {
        const addedMonths = vipData[chatId].amount / config.PRICE_MONTH;
        const addedDays = addedMonths * 30;
        bot.deleteMessage(chatId, vipData[chatId].message_id).catch(err => console.error('Failed to delete QR message:', err));
        vipData[chatId].vip_until = vipData[chatId].vip_until ? new Date(Math.max(new Date(vipData[chatId].vip_until).getTime(), Date.now())) : new Date();
        vipData[chatId].vip_until.setDate(vipData[chatId].vip_until.getDate() + addedDays);
        vipData[chatId].vip_until = vipData[chatId].vip_until.toISOString().split('T')[0];
        vipData[chatId].order_id = null;
        vipData[chatId].amount = null;
        vipData[chatId].qris_expiry = null;
        vipData[chatId].message_id = null;
        writeJSONFileSync('database/vip_users.json', vipData);
        return bot.sendMessage(chatId, 'Pembayaran berhasil diterima! VIP kamu sudah aktif.\n\nCek status VIP: /status');
    } else if (status === 'pending') return bot.sendMessage(chatId, 'Pembayaran masih dalam status pending. Segera selesaikan pembayaran.');
    else {
        return bot.sendMessage(chatId, `Pembayaran gagal atau dibatalkan. Status saat ini: ${status}. Kamu bisa mencoba membeli VIP lagi jika masih berminat.`, { reply_markup: {
            inline_keyboard: [
                [{ text: 'Beli VIP', callback_data: JSON.stringify({ function: '08' }) }]
            ]
        } });
    }
}

async function setDisc(bot, msg) {
    let month = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Diskon untuk berapa bulan? (Masukkan angka)').catch((err) => { return { error: true, message: err.message } });
    if(month.error) return bot.sendMessage(msg.chat.id, month.message);
    if(!month.text || isNaN(month.text)) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan angka untuk bulan.');
    month = month.text.trim();
    
    let price = await getMessageInput(bot, msg.chat.id, msg.from.id, 'Harga diskon? (Masukkan angka)').catch(err => { return { error: true, message: err.message } });
    if(price.error) return bot.sendMessage(msg.chat.id, price.message);
    if(!price.text || isNaN(price.text)) return bot.sendMessage(msg.chat.id, 'Input tidak valid. Harap masukkan angka untuk harga diskon.');
    price = price.text.trim();

    const config = readJSONFileSync('./config.json');
    config.DISCOUNT.MONTH = parseInt(month);
    config.DISCOUNT.PRICE = parseInt(price);
    writeJSONFileSync('./config.json', config);
    bot.sendMessage(msg.chat.id, 'Diskon berhasil diatur.');
}

function isVip(vip_until) {
    if (!vip_until) return false;

    const endWib = new Date(`${vip_until}T23:59:59+07:00`);
    if (Number.isNaN(endWib.getTime())) return false;

    return endWib.getTime() >= Date.now();
}

function getRemainingVipDays(vipUntil) {
    if (!vipUntil) return 0;

    const targetDate = new Date(vipUntil);
    const currentDate = new Date();

    // Hitung selisih waktu
    const timeDifference = targetDate.getTime() - currentDate.getTime();

    // Konversi ke hari
    const daysRemaining = Math.ceil(timeDifference / (1000 * 3600 * 24));

    return daysRemaining > 0 ? daysRemaining : 0;
}

function getRemainingExpiredMin(expiryTarget) {
    if (!expiryTarget) return 0;

    let expDateStr = String(expiryTarget);

    if (expDateStr.includes(' ') && !expDateStr.includes('T')) {
        expDateStr = expDateStr.replace(' ', 'T') + '+07:00';
    }

    const exp = new Date(expDateStr);
    const now = new Date(); 

    const mins = Math.ceil((exp - now) / 60000);
    return Number.isFinite(mins) ? Math.max(0, mins) : 0;
}

function convertToWib(isoString) {
    const date = new Date(isoString);
    
    // Menggunakan Intl.DateTimeFormat untuk konversi timezone ke Asia/Jakarta (WIB)
    return date.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Memastikan format 24 jam
    });
}

module.exports = {
    buyVip, chargeTransaction, statusVip, cancelTransaction, checkTransaction, isVip, vipCode, claimVip, getRemainingVipDays, setDisc
};