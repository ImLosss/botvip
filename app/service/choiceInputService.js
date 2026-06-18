require('module-alias/register');

const pendingInputs = new Map();

async function getChoiceInput(bot, chatId, text_button, buttons, options = {}) {
    return new Promise((resolve, reject) => {
        let id = Math.random().toString(36).substr(2, 3);
        let inline_keyboard = getChoiceInlineKeyboard(id, buttons);
        if(!inline_keyboard) return reject(new Error(options.emptyMessage || 'Tidak ada pilihan yang tersedia.'));

        bot.sendMessage(chatId, text_button, {
            reply_markup: {
                inline_keyboard: inline_keyboard
            },
            parse_mode: options.parse_mode || 'HTML'
        }).then((result) => {
            let timeout = setTimeout(() => {
                pendingInputs.delete(id);
                bot.deleteMessage(chatId, result.message_id);
                reject(new Error(options.timeoutMessage || 'Request timed out, Silakan coba lagi.'));
            }, options.timeout ?? 30000);

            pendingInputs.set(id, {
                resolve,
                reject,
                timeout
            });
        }).catch(err => {
            reject(err);
        });
    });
}

function getChoiceInlineKeyboard(id, buttons) {
    if (!Array.isArray(buttons) || buttons.length === 0) return false;

    let inline_keyboard = [];
    let row = [];

    buttons.forEach((button) => {
        if (!button) return;

        const text = typeof button === 'string' ? button : button.text;
        const value = typeof button === 'string' ? button : (button.value ?? button.callback_data ?? button.data ?? button.id ?? button.text);

        if (!text) return;

        row.push({
            text,
            callback_data: JSON.stringify({ type: 'INPUT_BUTTON', id, value })
        });

        if (row.length === 2) {
            inline_keyboard.push(row);
            row = [];
        }
    });

    if (row.length > 0) inline_keyboard.push(row);
    if (inline_keyboard.length === 0) return false;

    return inline_keyboard;
}

function resolveChoiceInput(id, value) {
    const pending = pendingInputs.get(id);
    if (!pending) return false;

    clearTimeout(pending.timeout);
    pendingInputs.delete(id);
    pending.resolve(value);
    return true;
}

module.exports = {
    getChoiceInput,
    resolveChoiceInput
};