require('module-alias/register');

module.exports = (function() {
    return function(bot) {
        require('listeners/commandHandler')(bot);
        require('listeners/buttonHandler')(bot);
    };
})();