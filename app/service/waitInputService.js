const pendingInputs = new Map();

function waitInput(bot, msg, options = {}) {
  return new Promise((resolve, reject) => {
    // if (pendingInputs.has(chatId)) {
    //   return reject(new Error('Masih ada input pending'));
    // }

    const timeout = setTimeout(() => {
      pendingInputs.delete(msg.chat.id);
      bot.deleteMessage(msg.chat.id, msg.message_id);
      reject(new Error('Input timeout'));
    }, options.timeout ?? 60_000);

    pendingInputs.set(msg.chat.id, {
      resolve,
      reject,
      type: options.type,
      timeout
    });
  });
}

function resolveInput(chatId, value) {
  const pending = pendingInputs.get(chatId);
  if (!pending) return false;

  clearTimeout(pending.timeout);
  pendingInputs.delete(chatId);
  pending.resolve(value);
  return true;
}

module.exports = {
  waitInput,
  resolveInput
};
