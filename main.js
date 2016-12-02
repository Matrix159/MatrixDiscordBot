/**
 * Created by Eldridge on 11/30/2016.
 */
'use strict';
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
    console.log(client.voiceConnections);
});

client.on('message', message => {
        processMessage(message);
    }
);

let voiceDispatcher;

function processMessage(msg) {
    const words = msg.content.split(" ");
    if (msg.content.startsWith("!say ")) {
        let replyMessage = msg.content.substring(words[0].length);
        msg.channel.sendTTSMessage(replyMessage);
    }
    if(msg.content.startsWith("!stop"))
    {
        if(voiceDispatcher)
        {
            voiceDispatcher.end();
        }
    }
    if (msg.content.startsWith("!play")) {
        if (msg.member.voiceChannel) {
            var connection = msg.member.voiceChannel;
            connection.join().then(
                vc => {
                    voiceDispatcher = vc.playFile("C:/Users/Eldridge/Downloads/swamp-thing.mp3");
                    console.log("Playing a song");
                    voiceDispatcher.on('end', () => {
                        connection.leave();
                        console.log("Left voice channel.");
                    });
                }
            ).catch(error => {
                console.log(error);
            });
        }
    }
}


client.login(process.env.TOKEN);
