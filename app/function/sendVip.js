require('module-alias/register');
const axios = require('axios');
const { readJSONFileSync, writeJSONFileSync } = require('function/utils');

async function sendVip(bot, msg, value, config) {

}

function getNewId(vipData){
    const maxId = Object.keys(vipData)
        .map(k => Number(k))
        .filter(n => Number.isFinite(n))
        .reduce((max, n) => Math.max(max, n), 0);

    const nextId = maxId + 1;

    return nextId;
}

module.exports = {
    sendVip
};