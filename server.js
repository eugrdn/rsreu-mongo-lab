// require our dependencies
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const MongoDB = require('./db');
const path = require('path');
const engines = require('consolidate');
const port = process.env.PORT || 8080;
const DB_URL = 'mongodb://localhost:27017/library';

MongoDB.connect(DB_URL)
  .then(() => {
    console.log(`Connected to DB succsessfully!`);

    // body parser
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
      );
      next();
    });

    // route app
    const router = require('./routes');
    app.use('/', router);
    app.engine('html', engines.mustache);
    app.set('view engine', 'html');
    app.use(express.static(path.resolve(__dirname, 'node_modules/library-ui/build')));
    app.listen(port, () => {
      console.log(`Server is running: localhost:${port}`);
    });
  })
  .catch(err => console.log(`An error with connection to db ${err}!`));
