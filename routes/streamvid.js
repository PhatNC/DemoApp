const { Router } = require('express')
const router = Router()
const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const querystring = require("querystring")
const net = require('net');


router.get('/video/show', function (req, res) {
    res.render('streamVid.html');
});

module.exports = router
