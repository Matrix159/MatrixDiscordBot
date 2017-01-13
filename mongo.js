/**
 * Created by Eldridge on 1/12/2017.
 */

const MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

// Connection URL
//const url = process.env.MONGODB_URI;
const url = 'mongodb://heroku_f8vj90xv:envqke55oactljn4pme3nshe7f@ds153785.mlab.com:53785/heroku_f8vj90xv';
let database;
let collection;
function setup(callback) {
// Use connect method to connect to the Server
    MongoClient.connect(url, function (err, db) {
        database = db;
        if (!err)
            console.log("Connected to database.");
        else
            console.log(err);
        collection = db.collection('documents');
        callback(
            {
                updateNames: updateNames,
                closeDatabase: closeDatabase,
                getNames: getNames
            });
    });

}

function updateNames(botNames) {
    return new Promise((resolve, reject) => {
            collection.updateMany({name: "matrixbot"},
                {$set: {botNames: botNames}}
                , function (err, result) {
                    if (err)
                        reject(err);
                    else
                        resolve(result);
                });
    });

}
function getNames() {
    return new Promise(
        function (resolve, reject) {
            collection.findOne({name: "matrixbot"}, function (err, doc) {
                if (err)
                    reject(err);
                else
                    resolve(doc.botNames);
            })
        }
    );
}
function closeDatabase() {
    db.close();
}

module.exports.setup = setup;
//module.exports.updateNames = updateNames;
//module.exports.closeDatabase = closeDatabase;