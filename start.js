
const database = require('./mongo');
let bot = (db) => {require('./matrixbot')(db)};
database.setup(bot);