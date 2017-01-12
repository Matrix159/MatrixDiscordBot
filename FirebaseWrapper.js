/**
 * Created by Eldridge on 1/11/2017.
 */
const firebase = require("firebase");
const config = {
    apiKey: "AIzaSyCCUzcOiu4BwQdPwbBslbRaRfsMIl0qhZM",
    authDomain: "matrixbot-75133.firebaseapp.com",
    databaseURL: "https://matrixbot-75133.firebaseio.com/",
    storageBucket: "matrixbot-75133.appspot.com",
};
firebase.initializeApp(config);
firebase.auth().signInAnonymously().catch(function(error) {
    // Handle Errors here.
    let errorCode = error.code;
    let errorMessage = error.message;
    console.log(`${errorCode} ${errorMessage}`);
    // ...
});
const database = firebase.database();
/*database.ref('names/').on('value', (snapshot) => {
    console.log(snapshot.val());
});*/
// Names is an array
function writeNames(names) {
    database.ref('names/').set(names);
}

module.exports.writeNames = writeNames;
module.exports.database = database;