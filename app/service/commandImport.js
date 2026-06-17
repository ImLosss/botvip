require('module-alias/register');

const vip  = require('function/vip');
const series = require('function/series');

module.exports = {
    ...vip,
    ...series,
};