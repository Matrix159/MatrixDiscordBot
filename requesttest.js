/**
 * Created by Eldridge on 12/23/2016.
 */
const request = require('superagent');
request
    .get('https://owapi.net/api/v3/u/Matrix159-1403/blob')
    .end(function (err, res) {
        // Do something
        if (err)
            console.log(err);
        else {
            var quickplay = res.body.us.heroes.playtime.quickplay;
            for (var key in quickplay) {
                if (quickplay.hasOwnProperty(key)) {
                    console.log(key + " -> " + quickplay[key]);
                }
            }
        }
    });