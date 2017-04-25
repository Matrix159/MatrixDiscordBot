exports.run = function (client, msg, args, guilds, db) {
    msg.channel.sendMessage("", {
        embed: {
            color: 16711680,
            author: {
                name: client.user.username,
                icon_url: client.user.avatarURL
            },
            description: 'MatrixBot will kick your ass with amazing goodness.',
            fields: [
                {
                    name: 'Version',
                    value: 'Forever beta meta'
                },
                {
                    name: 'Commands',
                    value: 'Type !help to get a list of commands'
                },
                {
                    name: 'Requests',
                    value: 'You want something added to the bot? Pay Matrix159 $100 and he will consider it'
                }
            ],
            timestamp: new Date(),
        }
    });
};
exports.usage = {
    argsDesc: false,
    desc: "Displays bot info."
};