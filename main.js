const ver = 0.01;
const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
//const commands = require("./Commands.js");
const Discord = require("discord.js");
const client = new Discord.Client();
// File system
const fs = require('fs');
// Youtube downloader
const ytdl = require('ytdl-core');
// Used for http requests
const request = require('superagent');
// Used for parsing urls
const url = require('url');

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
// Queue for youtube videos
let playQueue = [];

client.on('ready', () => {
    log(`Logged in as ${client.user.username}#${client.user.discriminator} (${client.readyAt})`);
    client.syncGuilds();

});

client.on('message', msg => {
    if (msg.author.bot) {
        return;
    }
    checkCmd(msg);
});

client.on('disconnected', () => {
    log("Client disconnected!");
    process.exit(-1);
});
client.on("typingStart", (channel, user) => {
    log(`${user.username} started typing in channel ${channel.id}`);
});
client.login(BOT_TOKEN);


const commands = {
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
        argsDesc: "[Overwatch battle-tag in the form Example-4444 (Case sensitive)]",
        desc: "Retrieves your Overwatch quick time hours.",
        process: function (bot, msg, args) {
            console.log(args);
            args = args.trim();
            args = args.split(" ");
            log(args);
            if (args && args[0]) {
                console.log(args && args[0]);
                console.log(args[0]);
                request
                    .get(`https://owapi.net/api/v3/u/${args[0]}/blob`)
                    .end(function (err, res) {
                        // Do something
                        if (!err && res.statusCode == 200) {
                            console.log(res.body);
                            let quickplay;
                            try {
                                quickplay = res.body.us.heroes.playtime.quickplay;
                            }
                            catch (err) {
                                console.log(err);
                                msg.reply("There was an error with the request, check your battle-tag for correct case sensitivity.");
                                return;
                            }
                            if (quickplay) {
                                let messageToSend = "\nYour Quick Play game time per hero:\n";
                                /*for (let key in quickplay) {
                                    if (quickplay.hasOwnProperty(key)) {
                                        messageToSend += `\n[${quickplay[key]} hours on ${key}]`;
                                        console.log(key + " -> " + quickplay[key]);
                                    }
                                }*/
                                let sortable=[];
                                for(let key in quickplay)
                                    if(quickplay.hasOwnProperty(key))
                                        sortable.push([key, quickplay[key]]); // each item is an array in format [key, value]

                                // sort items by value
                                sortable.sort(function(a, b)
                                {
                                    return b[1] - a[1]; // compare numbers
                                });
                                for(let arr of sortable)
                                {
                                    log(arr);
                                    if(arr[1] < 1)
                                    {
                                        arr[1] = arr[1].toFixed(1);
                                    }
                                    messageToSend += `\n[${arr[1]} hours on ${arr[0]}]`;
                                    //console.log(key + " -> " + quickplay[key]);
                                }
                                /*let sortedArray = Object.keys(quickplay).sort();
                                for(let key of sortedArray)
                                {
                                   if(quickplay.hasOwnProperty(key))
                                   {

                                   }
                                }*/
                                msg.reply(messageToSend);
                            }
                        }
                        else {
                            console.log(err);
                            console.log("OW status code " + res.statusCode);
                        }
                    });
            }
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
        voiceStreamDispatcher = boundVoiceChannel.connection.playStream(stream);
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
    log(words);
    if (words[0].charAt(0) != '!') {
        log("ignored");
        return;
    }
    const cmd = commands[words[0].substring(1)];
    log(cmd);
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
        logErr('ENV var JEFFYPOO_BOT_TOKEN not defined.');
        process.exit(-2);
    }
    if (!process.env.YOUTUBE_API_KEY) {
        logErr('ENV var YOUTUBE_API_KEY not defined.');
        process.exit(-2);
    }
}