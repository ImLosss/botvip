require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');

async function helpAdmin(bot, msg) {
    const helpText = `🎬 **Series Commands**
/series add <series_id> - Add a new series
/series delete <series_id> - Delete a series
/series update <series_id> - Update series information
/series episode <series_id> - Add a new episode to a series
/series delepisode <series_id> - Delete an episode from a series
/series search <search_term> - Search for series by title

💎 **VIP & Akun**
/vipcode - Generate a VIP code
/claimvip <vip_code> - Claim a VIP code`

return bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });

}

module.exports = { helpAdmin };