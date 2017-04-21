/**
 * Created by Eldridge on 12/15/2016.
 */
var moment = require('moment');

class YoutubeVideo {
    constructor(url, info)
    {
        this.url = url;
        this.info = info;
    }
    title()
    {
        return this.info.title;
    }
    author()
    {
        return this.info.author;
    }
    length()
    {
        let secs = this.info.lengthSeconds || this.info.length_seconds;
        console.log(`length(): secs = ${secs}`);
        return moment().seconds(secs).format('mm:ss');
    }
    link()
    {
        return this.url;
    }
    logString()
    {
        return `URL=${this.url}\nTitle=${this.title()}\nLength=${this.length()}`;
    }
}
module.exports = YoutubeVideo;