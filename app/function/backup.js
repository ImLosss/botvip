require('module-alias/register');
const fs = require('fs');
const { ZipArchive } = require('archiver');
const path = require('path');

async function backup(bot, msg) {
    bot.sendMessage(msg.chat.id, 'Membackup database...');
    const backupPath = await backup_database();

    if (!backupPath) {
        return bot.sendMessage(msg.chat.id, 'Gagal membackup database.');
    }

    bot.sendDocument(msg.chat.id, backupPath, { caption: 'Backup database' });
}

async function backup_database(sourceFolderPath = 'database', outputFilePath = 'database.zip') {
  return new Promise((resolve, reject) => {
    const folderName = path.basename(process.cwd()); 
    const output = fs.createWriteStream(outputFilePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', async () => {
        // await uploadFile(outputFilePath, `backup_${folderName}_${moment().format('YYMMDD')}.zip`, "1LhRhU6CEYiXG5Pg1bHjrI7FDdkVwfF9w");
        resolve(outputFilePath)
    });
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceFolderPath, path.basename(sourceFolderPath));
    archive.file('config.json', { name: 'config.json' });
    archive.finalize();
  });
}

module.exports = {
    backup, backup_database
};