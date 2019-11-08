// RUN PACKAGES

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');

const uploader = require('./routes/upload')
// const chart = require('./routes/chart')
const path = require('path');


// SETUP APP
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', express.static(__dirname + '/public'));

app.set('views', path.join(__dirname, '/public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

/* ROUTES
**********/
app.get('/', function (req, res) {
  res.render('index.html');
});

app.post('/upload', uploader);

app.get('/chart', function (req, res) {
  res.render('chart.html');
});

// app.use('/chart', chart);
// RUN SERVER
app.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});
