require('module-alias/register');

function getMessageInput(bot, chatId, userId, textPrompt) {
  return new Promise(async (resolve, reject) => {
    const sent = await bot.sendMessage(chatId, textPrompt);

    let finished = false;

    const onMessage = (msg) => {
      if (msg.from.id !== userId) return;

      cleanup();
      resolve(msg);
    };

    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      bot.deleteMessage(chatId, sent.message_id).catch(() => {});
      bot.removeListener('message', onMessage);
    };

    bot.on('message', onMessage);

    const timeout = setTimeout(() => {
      cleanup();
      return reject(new Error('Request timed out, Silakan coba lagi.'));
    }, 30000);
  });
}


module.exports = {
  getMessageInput
};