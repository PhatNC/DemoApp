// RUN PACKAGES

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');

const uploader = require('./routes/upload')

// SETUP APP
const app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/', express.static(__dirname + '/public'));





/* ROUTES
**********/
app.get('/', function (req, res) {
  res.render('index.html');
});

app.post('/upload', uploader);

// RUN SERVER
app.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});
