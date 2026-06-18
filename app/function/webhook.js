require('module-alias/register');
const http = require('http');
const console = require('console');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');
const config = readJSONFileSync('./config.json');

module.exports = function(bot) {
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
              let chatId = Object.keys(vipData).find(id => vipData[id].order_id === order_id);
              if(!chatId) return console.log(`No matching chatId found for order_id: ${order_id}`);

              // {
              //   "5759538058": {
              //     "order_id": order_iddawdad,
              //     "vip_until": "2027-05-12",
              //     "message_id": null
              //   }
              // }

              vipData[chatId].vip_until = vipData[chatId].vip_until ? new Date(Math.max(new Date(vipData[chatId].vip_until).getTime(), Date.now())) : new Date();
              vipData[chatId].vip_until.setMonth(vipData[chatId].vip_until.getMonth() + (vipData[chatId].amount / config.PRICE_MONTH));
              vipData[chatId].vip_until = vipData[chatId].vip_until.toISOString().split('T')[0];
              vipData[chatId].order_id = null;
              vipData[chatId].amount = null;
              vipData[chatId].qris_expiry = null;
              vipData[chatId].message_id = null;

              writeJSONFileSync('database/vip_users.json', vipData);
              bot.sendMessage(chatId, `Pembayaran dengan Order ID: <code>${data.order_id}</code> telah berhasil diproses.\n\nVIP kamu aktif hingga: <b>${vipData[chatId].vip_until}.</b>\n\nKirim /status untuk cek status VIP kamu.\n\nTerima kasih telah melakukan pembayaran! 🙏`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [ [{ text: 'Channel VIP', url: `https://t.me/${config.USERNAME_CHANNEL.replace('@', '')}` }] ] } }).catch(err => console.error('Failed to send success message:', err.message));
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