require('module-alias/register');

const vip  = require('function/vip');
const series = require('function/series');
const watchVip = require('function/watchVip');

module.exports = {
    ...vip,
    ...series,
    ...watchVip
};