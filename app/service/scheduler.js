require('module-alias/register');
const schedule = require('node-schedule');
const console = require('console');
const { backup_database } = require('function/backup');

module.exports = function(bot, config) {
    schedule.scheduleJob(
        { hour: 0, minute: 35, tz: 'Asia/Makassar' },
        async () => {
            console.log('scheduler 00:35 running...')
            const backupPath = await backup_database();
            bot.sendDocument(config.DB_ID, backupPath, { caption: 'Backup database' });
        }
    )
}
