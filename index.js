require('module-alias/register');
const TelegramBot = require('node-telegram-bot-api');
const console = require('console');
const { readJSONFileSync, writeJSONFileSync } = require("function/utils");
const fs = require('fs');
const { setBot } = require('function/botInstance');


// Ganti token ini dengan token bot Anda
let config = readJSONFileSync('./config.json');
config.RECEIVE_MESSAGE = false;

// Buat instance bot
const bot = new TelegramBot(config.TOKEN_TELEGRAM, { polling: false });
setBot(bot);

setTimeout(() => {
    let config = readJSONFileSync('./config.json');
    config.RECEIVE_MESSAGE = true;
    writeJSONFileSync('./config.json', config);
    console.log("Bot aktif dan hanya menerima pesan baru.");
    bot.sendMessage(config.DB_ID, "Bot telah diaktifkan.");
}, 5000);

require("function/webhook.js")(bot);

if(!fs.existsSync('./app/logs/log.json')) writeJSONFileSync('./app/logs/log.json', []);

if(!fs.existsSync('./app/logs/error.json')) writeJSONFileSync('./app/logs/error.json', []);

if(!fs.existsSync('./database/vip_users.json')) writeJSONFileSync('./database/vip_users.json', {});

if(!fs.existsSync('./database/series.json')) writeJSONFileSync('./database/series.json', {});

// Fungsi untuk memulai bot setelah pesan lama dihapus
async function startBot() {

    // Mulai polling setelah membersihkan pesan lama
    bot.startPolling();

    require('import')(bot);
}

// Jalankan fungsi untuk membersihkan pesan lama & mulai bot
startBot();


// errorHandling
bot.on('polling_error', (err) => {
    console.error(err);
})