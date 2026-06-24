require('module-alias/register');
const http = require('http');
const console = require('console');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');

module.exports = function(bot) {
  let config = readJSONFileSync('./config.json');
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          if (req.url === '/pakasir') {
            const data = JSON.parse(body || '{}');

            console.log(data, 'webhook payload');
            if(data.status == 'completed') {
              const order_id = data.order_id;

              let vipData = readJSONFileSync('database/vip_users.json');
              let config = readJSONFileSync('./config.json');
              let chatId = Object.keys(vipData).find(id => vipData[id].order_id === order_id);
              if(!chatId) return console.log(`No matching chatId found for order_id: ${order_id}`);

              let month = vipData[chatId].month;

              const addedDays = month * 30;

              vipData[chatId].vip_until = vipData[chatId].vip_until ? new Date(Math.max(new Date(vipData[chatId].vip_until).getTime(), Date.now())) : new Date();
              vipData[chatId].vip_until.setDate(vipData[chatId].vip_until.getDate() + addedDays);
              vipData[chatId].vip_until = vipData[chatId].vip_until.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
              
              let revenue = month * 2000;
              if (revenue > 10000) revenue = 10000;
              vipData[chatId].order_id = null;
              vipData[chatId].amount = null;
              vipData[chatId].month = null;
              vipData[chatId].qris_expiry = null;

              bot.deleteMessage(chatId, vipData[chatId].message_id).catch(err => console.error('Failed to delete message:', err.message))

              vipData[chatId].message_id = null;

              config.REVENUE += revenue;

              writeJSONFileSync('database/vip_users.json', vipData);
              writeJSONFileSync('./config.json', config);

              bot.sendMessage(chatId, `Pembayaran dengan Order ID: <code>${data.order_id}</code> telah berhasil diproses.\n\nVIP kamu aktif hingga: <b>${vipData[chatId].vip_until}.</b>\n\nKirim /status untuk cek status VIP kamu.\n\nTerima kasih telah melakukan pembayaran! 🙏`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [ [{ text: 'Channel VIP', url: `https://t.me/${config.USERNAME_CHANNEL.replace('@', '')}` }] ] } }).catch(err => console.error('Failed to send success message:', err.message));
              bot.sendMessage('5759538058', `anda mendapatkan komisi sebesar Rp ${revenue} dari pembayaran VIP user dengan order_id: <code>${data.order_id}</code>.\n\nTotal revenue: Rp ${config.REVENUE}`, { parse_mode: 'HTML' }).catch(err => console.error('Failed to send commission message:', err.message));
              bot.sendMessage(config.OWNER_ID, `Pembayaran VIP berhasil diproses untuk user ${chatId} selama ${month} bulan sebesar ${data.amount} dengan order_id: <code>${data.order_id}</code>.\n\nVIP aktif hingga: <b>${vipData[chatId].vip_until}</b>`, { parse_mode: 'HTML' }).catch(err => console.error('Failed to send owner message:', err.message));
            }
          }
        } catch (e) {
          console.error(e);
          console.log('Error processing webhook:', e.message);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    }
  });

  const PORT = config.WEBHOOK_PORT || 2045;
  server.listen(PORT, () => console.log(`Sociabuzz webhook listening on port ${PORT}`));
};