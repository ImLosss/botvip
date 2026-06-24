require('module-alias/register');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');

async function helpAdmin(bot, msg) {
    const helpText = `🎬 <b>Series Commands</b>
<code>/series add</code> - Add a new series
<code>/series delete [series_id]</code> - Delete a series
<code>/series update [series_id]</code> - Update series information
<code>/series episode [series_id]</code> - Add a new episode to a series
<code>/series delepisode [series_id]</code> - Delete an episode from a series
<code>/series search [search_term]</code> - Search for series by title

💎 <b>VIP & Akun</b>
<code>/vipcode</code> - Generate a VIP code
<code>/claimvip [vip_code]</code> - Claim a VIP code
<code>/setdisc</code> - Set discount for VIP users`;

    return bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'HTML' });
}

module.exports = { helpAdmin };