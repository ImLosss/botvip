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
          const data = JSON.parse(body || '{}');

          console.log(data, 'webhook payload');
          console.log(req.url, 'webhook url');
          if (req.url === '/midtrans') {
            if(data.transaction_status && data.transaction_status === 'settlement') {
              const uid = data.custom_field1 || false;
              if(!uid) return;

              let vipData = readJSONFileSync('database/vip_users.json');
              if(!vipData[uid]) return;

              vipData[uid].vip_until = vipData[uid].vip_until ? new Date(Math.max(new Date(vipData[uid].vip_until).getTime(), Date.now())) : new Date();
              vipData[uid].vip_until.setMonth(vipData[uid].vip_until.getMonth() + (data.gross_amount / 10000));
              vipData[uid].vip_until = vipData[uid].vip_until.toISOString().split('T')[0];
              writeJSONFileSync('database/vip_users.json', vipData);
              bot.deleteMessage(uid, vipData[uid].message_id).catch(err => console.error('Failed to delete QR message:', err));
              bot.sendMessage(uid, `Pembayaran dengan Order ID: <code>${data.order_id}</code> telah berhasil diproses.\n\nVIP kamu aktif hingga: <b>${vipData[uid].vip_until}.</b>\n\nKirim /status untuk cek status VIP kamu.\n\nTerima kasih telah melakukan pembayaran! 🙏`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [ [{ text: 'Channel VIP', url: 'https://t.me/dongworldvip' }] ] } }).catch(err => console.error('Failed to send success message:', err.message));
            } else if (data.transaction_status && data.transaction_status === 'expire') {
              const uid = data.custom_field1 || false;
              if(!uid) return;
              let vipData = readJSONFileSync('database/vip_users.json');
              if(!vipData[uid]) return;

              bot.deleteMessage(uid, vipData[uid].message_id).catch(err => console.error('Failed to delete QR message:', err));

              bot.sendMessage(uid, `Pembayaran dengan Order ID: <code>${data.order_id}</code> telah <b>EXPIRED</b>.\n\nSilakan order kembali jika masih ingin berlangganan VIP.`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [ [{ text: 'Beli VIP', callback_data: JSON.stringify({ function: '08' }) }] ] } }).catch(err => console.error('Failed to send expired message:', err.message));
            }
          } else if (req.url === '/sociabuzz') {
            const payload = JSON.parse(body || '{}');
            const headerToken = req.headers["sb-webhook-token"];
            if(headerToken != "sbwhook-lwatbodiymchocuj2fdbt1qs") return;
            // console.log(payload, 'Sociabuzz payload');

            // Ambil nama & jumlah donasi
            const donor = payload.supporter == "Someone" ? 'Seseorang' : payload.supporter;
            const amountRaw = payload.amount_settled ?? payload.amount ?? payload.level?.price ?? payload.donation_amount ?? 0;
            const currency = payload.currency_settled || payload.currency || 'IDR';
            const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number(amountRaw) || 0);

            // Format dengan kutipan Telegram (blockquote)
            const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
            const donorLine = `✨${esc(donor)} telah melakukan donasi sebesar <b>${formattedAmount}</b>.✨\n`;
            const noteBlock = (payload.message && String(payload.message).trim())
              ? `\n<blockquote>${esc(String(payload.message).trim())}</blockquote>\n`
              : '';

            const text = `${donorLine}${noteBlock}\nDukunganmu sangat membantu kami agar dapat rilis lebih cepat. 🙏\n\n#donation`;

            // console.log(text)

            const fileId = readJSONFileSync('./database/temp_message_channel_id.json');

            bot.sendMessage(config.ID_CHANNEL, text, { parse_mode: 'HTML', reply_to_message_id: fileId.discuss_message_id, reply_markup: { inline_keyboard: [[{ text: 'Dukung Kami', url: 'https://sociabuzz.com/dongworld/tribe' }]] } }).catch(err => console.error('Failed to send message donation:', err.message));
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