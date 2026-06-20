require('module-alias/register');
const schedule = require('node-schedule');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const console = require('console');
const { checkUpdateIq } = require('function/autoIq');
const { backup_database } = require('function/function');

module.exports = function(bot, config) {
    schedule.scheduleJob(
        { hour: 0, minute: 1, tz: 'Asia/Makassar' },
        async () => {
            console.log('scheduler 00:01 running...')
            const backupPath = await backup_database();
            bot.sendDocument(config.DB_ID, backupPath, { caption: 'Backup database' });
        }
    )
}
