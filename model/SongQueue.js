/**
 * Created by Eldridge on 4/20/2017.
 */

class SongQueue {

    constructor(boundTextChannel, guildID)
    {
        this.boundTextChannel = boundTextChannel;
        this.boundVoiceChannel = undefined;
        this.voiceStreamDispatcher = undefined;
        this.guildID = guildID;
        this.queue = [];
        this.volumeLevel = .25;
    }
    boundTextChannel()
    {
        return this.boundTextChannel;
    }

    boundVoiceChannel()
    {
        return this.boundVoiceChannel;
    }

    voiceStreamDispatcher()
    {
        return this.voiceStreamDispatcher;
    }
    guildID()
    {
        return this.guildID;
    }

    queue()
    {
        return this.queue;
    }


    setVolumeLevel(volume)
    {
        this.volumeLevel = volume;
    }

    addVideo(youtubeVideo)
    {
        this.queue.push(youtubeVideo);
    }


}
module.exports = SongQueue;