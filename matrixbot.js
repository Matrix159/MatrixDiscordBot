module.exports = function (db) {
    const ver = 0.01;
    const YT_API_KEY = process.env.YOUTUBE_API_KEY;
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const Discord = require("discord.js");
    const client = new Discord.Client();
    // File system
    const fs = require('fs');
    const jsonfile = require('jsonfile');
    const sessionFile = './session.json';
    const session = jsonfile.readFileSync(sessionFile);
    log(session);
    // Youtube downloader
    const ytdl = require('ytdl-core');
    // Used for http requests
    const request = require('superagent');

    // Giphy
    const giphy = require('giphy-api')('dc6zaTOxFJmzC');
    // Used for parsing urls
    const url = require('url');
    const cleverbot = require("cleverbot.io");
    const cbot = new cleverbot("LpxSxzKNawYCf7wQ", "f6C1KgLdIoIsej6XRZdiB7UCXqm8K61O");
    let sessionname = session.sessionName;
    cbot.setNick(sessionname);
    function log(msg) {
        console.log(msg);
    }

    function logErr(msg, err = false) {
        console.error(`${msg} ${err || ''}`);
    }

    log("MatrixBot ver " + ver);
    checkEnv();

    // Model for a youtube video
    let YoutubeVideo = require('./model/YoutubeVideo.js');

    let boundTextChannel;
    let boundVoiceChannel;
    let voiceStreamDispatcher;
    let volumeLevel;
    let skipVotes = 0;
    // Queue for youtube videos
    let playQueue = [];
    let killCleverbot = false;
    let database = db;
    let botNames = [];
    database.getNames().then((nameArray) => botNames = nameArray).catch(console.error);

    client.on('ready', () => {
        log(`Logged in as ${client.user.username}#${client.user.discriminator} (${client.readyAt})`);
        client.syncGuilds();
        cbot.create((err, session) => {
            log("Created " + session);
        });

    });
    /*client.on("presenceUpdate", (oldMember, newMember) => {
     if(newMember.presence.game)
     log(`${newMember.user.username}: ${newMember.presence.game.name}`);
     });*/
    client.on('message', msg => {
        /*if (msg.author.bot) {
         return;
         }*/
        if (msg.author.id === "159985870458322944") {
            msg.reply("Go away Mee6")
                .then(message => log(`Sent message: ${message.content}`))
                .catch(console.error);
        }
        if (msg.isMentioned(client.user)) {

            msg.channel.sendFile("https://media.giphy.com/media/l3UcvawxYUTWRpeMw/giphy.gif")
                .then((value) => log(value))
                .catch(console.error);
            /**if (!killCleverbot) {
                let messageToAsk = msg.content.replace(/[<][@]([0-9])+[>]/g, "").trim();
                log("Other bot: " + messageToAsk);
                cbot.ask(messageToAsk, function (err, response) {
                    if (err) {
                        log("Here?");
                        log(err);
                        return;
                    }
                    setTimeout(function (msg) {
                        if (!killCleverbot) {
                            if (response.toLowerCase().includes("my name is ")) {
                                let n = response.toLowerCase().search("my name is ");
                                let array = response.toLowerCase().substring(n).trim().split(" ");
                                if (array.length >= 4) {
                                    let name = array[3];
                                    name = name[0].toUpperCase() + name.substr(1);
                                    name = name.replace(/[^a-zA-Z]+/g, '');
                                    if (!botNames.includes(name)) {
                                        botNames.push(name);
                                        database.updateNames(botNames);
                                        msg.guild.fetchMember("252878570274291712").then((guildMember) => guildMember.setNickname(name)).catch(console.error);
                                        log(name);
                                    }

                                }
                            }
                            msg.reply(response)
                                .then(message => console.log(`Sent message: ${message.content}`))
                                .catch(console.error);
                        }
                    }, 3000, msg);

                });
                return;
            }*/
        }
        checkCmd(msg);
    });

    client.on('disconnected', () => {
        log("Client disconnected!");
        process.exit(-1);
    });
    client.login(BOT_TOKEN);


    const commands = {
        "info": {
            argsDesc: false,
            desc: "Displays bot info.",
            process: function (bot, msg, args) {
                msg.channel.sendMessage("", {
                    embed: {
                        color: 16711680,
                        author: {
                            name: bot.user.username,
                            icon_url: bot.user.avatarURL
                        },
                        //url: 'http://google.com',
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
            }
        },
        "say": {
            argsDesc: "[message]",
            desc: "Speak as MatrixBot.",
            process: function (bot, msg, args) {
                log(`say: '${args}'`);
                if (msg.deletable) {
                    msg.delete().then((deleted) => {
                        log(`Deleted orig msg: '${deleted.content}'`);
                    }).catch(console.error);
                }
                msg.channel.sendMessage(args);
            }
        },
        "play": {
            argsDesc: "[artist and/or song name]",
            desc: "Searches youtube for a song and plays it.",
            process: function (bot, msg, args) {
                log(`play: '${args.trim()}'`);
                if (boundTextChannel != msg.channel) {
                    log(`Binding text channel to '${msg.channel.name}'`);
                    boundTextChannel = msg.channel;
                }
                if (boundVoiceChannel && msg.member.voiceChannel != boundVoiceChannel) {
                    msg.reply(`I'm already playing music in '${boundVoiceChannel.name}'`);
                    return;
                } else if (boundVoiceChannel) {
                    searchAndQueue(bot, msg, args, boundVoiceChannel.connection);
                    return;
                }
                const channel = msg.member.voiceChannel;
                if (channel && channel.joinable) {
                    log(`Joining voice channel '${channel.name}'...`);
                    channel.join()
                        .then(conn => {
                            boundVoiceChannel = channel;
                            log(`Joined '${boundVoiceChannel.name}'.`);
                            searchAndQueue(bot, msg, args, conn);
                        })
                        .catch(console.error);
                }

            }
        },
        "stop": {
            argsDesc: false,
            desc: "Stops any playing music.",
            process: function (bot, msg, args) {
                log('stop');
                if (voiceStreamDispatcher) {
                    msg.reply('Stopping...');
                }
                playQueue = [];
                leaveVoiceChannel();
            }
        },
        "pause": {
            argsDesc: false,
            desc: "Pauses any playing music (resume by calling !resume)",
            process: function (bot, msg, args) {
                log('pause');
                pausePlayback(msg);
            }
        },
        "resume": {
            argsDesc: false,
            desc: "Resumes paused music.",
            process: function (bot, msg, args) {
                log('resume');
                resumePlayback(msg);
            }
        },
        "skip": {
            argsDesc: false,
            desc: "Skips the current song.",
            process: function (bot, msg, args) {

                if (voiceStreamDispatcher) {
                    skipVotes += 1;
                    if (skipVotes === 3) {
                        if (boundTextChannel)
                            boundTextChannel.sendMessage(`**Skipping...**`);
                        voiceStreamDispatcher.end();
                        skipVotes = 0;
                    }
                    else {
                        if (boundTextChannel)
                            boundTextChannel.sendMessage("**I need " + (3 - skipVotes) + " more votes to skip the current song**");
                    }
                }
            }
        },
        "volume": {
            argsDesc: "[.25]",
            desc: "Changes the bot's volume level in a voice channel.",
            process: function (bot, msg, args) {
                if (!(isNaN(Number(args))))
                    changeVoiceVolume(Number(args));
            }
        },
        "eval": {
            argsDesc: "[Javascript code to evaluate and run]",
            desc: "Evaluates and runs javascript code (Bot owner only)",
            process: function (bot, msg, args) {
                if (msg.author.id !== "98992981045964800") {
                    msg.reply("You do not have permission to use that command pleb.");
                    return;
                }
                try {
                    msg.channel.sendMessage("```javascript\n " + eval(args) + "```");
                }
                catch (e) {
                    console.error(e);
                }
            }
        },
        "owgametime": {
            argsDesc: "[Example#4444 quickplay]",
            desc: "Retrieves your Overwatch in-game hours per hero. Battle-tag is case sensitive",
            process: function (bot, msg, args) {
                args = args.trim();
                args = args.split(" ");
                if (args && args.length == 2) {
                    args[0] = args[0].replace("#", "-");
                    request
                        .get(`https://owapi.net/api/v3/u/${args[0]}/blob`)
                        .end(function (err, res) {
                            // Do something
                            if (!err && res.statusCode == 200) {
                                let quickplay;
                                try {
                                    log(typeof res.body.us);
                                    if (res.body.us !== null) {
                                        quickplay = res.body.us.heroes.playtime[args[1]];
                                    }
                                    else if (res.body.eu !== null) {
                                        quickplay = res.body.eu.heroes.playtime[args[1]];
                                    }
                                    else if (res.body.kr !== null) {
                                        quickplay = res.body.kr.heroes.playtime[args[1]];
                                    }
                                    else {
                                        quickplay = res.body.any.heroes.playtime[args[1]];
                                    }
                                }
                                catch (err) {
                                    logErr(err);
                                    msg.reply("There was an error with the request, check your battle-tag for correct case sensitivity and format.");
                                    return;
                                }
                                if (quickplay) {
                                    let messageToSend = `\nYour ${args[1]} game time per hero:\n`;

                                    let sortable = [];
                                    for (let key in quickplay) {
                                        if (quickplay.hasOwnProperty(key)) {
                                            // each item is an array in format [key, value]
                                            sortable.push([key, quickplay[key]]);
                                        }
                                    }

                                    // sort items by value
                                    sortable.sort(function (a, b) {
                                        return b[1] - a[1];
                                    });
                                    for (let arr of sortable) {
                                        if (arr[1] < 1) {
                                            arr[1] = arr[1].toFixed(1);
                                        }
                                        messageToSend += `\n[${arr[1]} hours on ${arr[0]}]`;
                                    }

                                    msg.reply(messageToSend)
                                        .then(msg => console.log(`Sent a reply to ${msg.author.username}`))
                                        .catch(console.error);
                                }
                            }
                            else {
                                logErr(err);
                                logErr("OW status code " + res.statusCode);
                            }
                        });
                }
            }
        },
        "owstats": {
            argsDesc: "temp",
            desc: "Look up certain stats about your Overwatch account.",
            process: function (bot, msg, args) {
                args = args.trim();
                args = args.split(" ");
                if (args && args.length == 2) {
                    args[0] = args[0].replace("#", "-");
                    request
                        .get(`https://owapi.net/api/v3/u/${args[0]}/blob`)
                        .end(function (err, res) {
                            // Do something
                            if (!err && res.statusCode == 200) {
                                let stats;
                                try {
                                    log(typeof res.body.us);
                                    if (res.body.us !== null) {
                                        stats = res.body.us.stats[args[1]].average_stats;
                                    }
                                    else if (res.body.eu !== null) {
                                        stats = res.body.eu.stats[args[1]].average_stats;
                                    }
                                    else if (res.body.kr !== null) {
                                        stats = res.body.kr.stats[args[1]].average_stats;
                                    }
                                    else {
                                        stats = res.body.any.stats[args[1]].average_stats;
                                    }
                                }
                                catch (err) {
                                    logErr(err);
                                    msg.reply("There was an error with the request, check your battle-tag for correct case sensitivity and format.");
                                    return;
                                }
                                if (stats) {
                                    msg.channel.sendCode("javascript", JSON.stringify(stats).replace(/[{},]/g, "\n"))
                                        .then(msg => console.log(`Sent a reply to ${msg.author.username}`))
                                        .catch(console.error);
                                }
                            }
                            else {
                                logErr(err);
                                logErr("OW status code " + res.statusCode);
                            }
                        });
                }
            }
        },
        "cookie": {
            argsDesc: false,
            desc: "Give le cookie.",
            process: function (bot, msg) {
                msg.channel.sendMessage(":cookie:")
                    .then(message => console.log(`Sent message: ${message.content}`))
                    .catch(console.error);
            }
        },
        "names": {
            argsDesc: false,
            desc: "Lists the names this bot has identified as.",
            process: function (bot, msg, args) {
                let botNameList = "";
                for (let x of botNames) {
                    botNameList += ("\n-" + x);
                }
                msg.channel.sendMessage(botNameList);
            }
        },
        "kill": {
            argsDesc: false,
            desc: "Kills the bot so it stops spamming cleverbot crap.",
            process: function (bot, msg, args) {
                killCleverbot = true;
                setTimeout(function () {
                    killCleverbot = false;
                }, 10000);
            }
        },
        "quote": {
            argsDesc: "[quote content] [author name]",
            desc: "Use this command to store a quote.",
            process: function (bot, msg, args) {
                args = args.trim();
                args = args.match(/\[(.*?)\]/g);
                for (let x in args) {
                    args[x] = args[x].replace("[", "").replace("]", "");
                    log(args[x]);
                }
                if (args && args.length == 2) {

                    database.addQuote({
                        content: args[0],
                        author: args[1]
                    }).then((result) => log("Quote added")).catch(console.error);
                }
            }
        },
        "quotes": {
            argsDesc: false,
            desc: "Retrieves the list of quotes.",
            process: function (bot, msg, args) {
                let message = "";
                database.getQuotes().then((quotes) => {
                    for (let x of quotes) {
                        message += `"${x.content}" - ${x.author}\n`;
                    }
                    msg.channel.sendMessage(message);
                }).catch(console.error);

            }
        },
        "giphy": {
            argsDesc: false,
            desc: "Giphy fun",
            process: function (bot, msg, args) {
                giphy.search({q: args, limit: 1}, (err, res) => {
                    if (err)
                        log(err);
                    else {
                        if (res.data.length > 0) {
                            msg.delete();
                            msg.channel.sendFile(res.data[0].images.downsized_medium.url)
                                .then(message => log(`Sent message: ${message.content}`))
                                .catch(console.error);

                        }
                    }
                })
            }
        }

    };

    function searchAndQueue(bot, msg, args, conn) {
        const searchURL = getYoutubeSearchURL(args);
        msg.reply('Searching...');
        request(searchURL, (err, resp) => {
            if (!err && resp.statusCode == 200) {
                if (resp.body.items.length == 0) {
                    msg.reply(`No videos matching '${args.trim()}'`);
                    return;
                }
                for (let item of resp.body.items) {
                    if (item.id.kind === 'youtube#video') {
                        const vidUrl = 'http://www.youtube.com/watch?v=' + item.id.videoId;
                        log(`video URL = ${vidUrl}`);
                        getVideoInfo(vidUrl, (err, info) => {
                            if (err) {
                                logErr("error getting video metadata", err);
                                return;
                            }
                            playQueue.push(new YoutubeVideo(vidUrl, info));
                            msg.reply('Queued.');
                            log(`queued video (${playQueue.length} songs in queue)`);
                            if (!voiceStreamDispatcher) {
                                playNext();
                            }
                        });
                        return;
                    }
                }
            }
        });
    }

    function getVideoInfo(url, cb) {
        ytdl.getInfo(url, (err, info) => {
            if (err) cb(err, undefined);
            else {
                cb(undefined, info);
            }
        });
    }

    function playNext() {
        let next = playQueue.shift();
        if (next) {
            log(`playNext(): preparing track:\n${next.logString()}`);
            const title = next.title();
            const author = next.author();
            const length = next.length();
            const link = next.link();
            const stream = ytdl.downloadFromInfo(next.info, {audioonly: true});
            if (!volumeLevel) {
                volumeLevel = .25;
            }
            voiceStreamDispatcher = boundVoiceChannel.connection.playStream(stream, {volume: volumeLevel});
            voiceStreamDispatcher.once('end', () => {
                log(`track '${title}' ended`);
                voiceStreamDispatcher = undefined;
                playNext();
            });
            boundTextChannel.sendMessage(`\n**Now Playing** : ${title}\n**Length** : ${length}\n**Uploader** : ${author}\n**Link** : ${link}`);
        }
    }

    function pausePlayback(msg) {
        if (voiceStreamDispatcher) {
            if (voiceStreamDispatcher.paused) {
                msg.reply("I'm already paused.");
            } else {
                msg.reply("Pausing...");
                voiceStreamDispatcher.pause();
            }
        }
    }

    function resumePlayback(msg) {
        if (voiceStreamDispatcher) {
            if (!voiceStreamDispatcher.paused) {
                msg.reply("I'm not paused.");
            } else {
                msg.reply("Resuming...");
                voiceStreamDispatcher.resume();

            }
        }
    }

    function changeVoiceVolume(volume) {
        volumeLevel = volume;
        if (voiceStreamDispatcher) {
            voiceStreamDispatcher.setVolume(volumeLevel);
        }
    }

    function getYoutubeSearchURL(query) {
        return `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURI(query.trim())}&key=${YT_API_KEY}`;
    }


    function leaveVoiceChannel() {
        if (boundVoiceChannel) {
            if (voiceStreamDispatcher) {
                log('stopping voice stream');
                voiceStreamDispatcher.end();
                voiceStreamDispatcher = false;
            }
            log(`leaving voice channel '${boundVoiceChannel.name}'`);
            boundVoiceChannel.leave();
            boundVoiceChannel = false;
        }
    }

// Checks the message to see if it represents any commands
    function checkCmd(msg) {
        if (msg.content === '!help') {
            printCommands(msg);
            return;
        }
        const words = msg.content.split(" ");
        if (words[0].charAt(0) !== '!') {
            return;
        }
        const cmd = commands[words[0].substring(1)];
        if (cmd) {
            var args = msg.content.substring(words[0].length);
            cmd.process(client, msg, args);
        }
    }

    function printCommands(msg) {
        let cmdsString = "\nCommands:\n";
        for (let cmd in commands) {
            if (!commands[cmd]) continue;
            const cmdBody = commands[cmd];
            var argsDesc = cmdBody.argsDesc || '';
            cmdsString += `\n\`\`!${cmd} ${argsDesc}\`\` : ${cmdBody.desc}\n`;
        }
        msg.reply(cmdsString);
    }

    function checkEnv() {
        if (!process.env.BOT_TOKEN) {
            logErr('ENV var MATRIXBOT_BOT_TOKEN not defined.');
            process.exit(-2);
        }
        if (!process.env.YOUTUBE_API_KEY) {
            logErr('ENV var YOUTUBE_API_KEY not defined.');
            process.exit(-2);
        }
    }
}