/**
 * Created by Eldridge on 1/12/2017.
 */

const MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

// Connection URL
const url = process.env.MONGODB_URI;
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
                getNames: getNames,
                addQuote: addQuote,
                getQuotes: getQuotes
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

function addQuote(quote) {
    return new Promise((resolve, reject) => {
        collection.updateOne({name: "matrixbot"},
            {$push: {quotes: quote}}
            , function (err, result) {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
    });

}
function getQuotes()
{
    return new Promise(
        function (resolve, reject) {
            collection.findOne({name: "matrixbot"}, function (err, doc) {
                if (err)
                    reject(err);
                else
                    resolve(doc.quotes);
            })
        }
    );
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
