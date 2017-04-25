exports.run = function(client, msg, args, guilds, db)
{
    let cmdsString = "\nCommands:\n";
    for (let cmd in commands) {
        if (!commands[cmd]) continue;
        const cmdBody = commands[cmd];
        var argsDesc = cmdBody.argsDesc || '';
        cmdsString += `\n\`\`!${cmd} ${argsDesc}\`\` : ${cmdBody.desc}\n`;
    }
    msg.reply(cmdsString);
};