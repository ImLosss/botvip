require('module-alias/register');
const schedule = require('node-schedule');
const console = require('console');
const { backup_database } = require('function/backup');
const { getRemainingVipDays } = require('function/vip');
const { readJSONFileSync, sleep } = require('function/utils');

module.exports = function(bot, config) {
    schedule.scheduleJob(
        { hour: 22, minute: 13, tz: 'Asia/Makassar' },
        async () => {
            console.log('scheduler 22:13 running...')
            const backupPath = await backup_database();
            await bot.sendDocument(config.DB_ID, backupPath, { caption: 'Backup database' });

            let vipData = readJSONFileSync('database/vip_users.json');

            for (let userId in vipData) {
                let expirationDate = vipData[userId].vip_until;
                let remainingDays = getRemainingVipDays(expirationDate);

                if (remainingDays >= 1 && remainingDays <= 3) {
                    await sleep(2000); 
                    console.log(`Sending VIP reminder to user ${userId} with ${remainingDays} days remaining.`);
                    await bot.sendMessage(userId, `VIP kamu sisa ${remainingDays} hari lagi\n\nIngin memperpanjang VIP?`, { reply_markup: { inline_keyboard: [ [{ text: 'Perpanjang VIP', callback_data: JSON.stringify({ function: '08' }) }] ] } }).catch(err => console.log('Failed to send VIP reminder message:', err.message));
                }
            }
        }
    )
}
