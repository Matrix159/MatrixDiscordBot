/**
 * Created by Eldridge on 1/12/2017.
 */

const database = require('./mongo');
let bot = (db) => {require('./matrixbot')(db)};
database.setup(bot);