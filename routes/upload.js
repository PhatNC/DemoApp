const { Router } = require('express')
const router = Router()
const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const async = require('async')
const querystring = require("querystring")
const net = require('net');



var url_share = '';
var model_name = '';
var resultLink = '';

let tempRes;

//MULTER CONFIG: to get file photos to temp server storage
const multerConfig = {

    //specify diskStorage (another option is memory)
    storage: multer.diskStorage({

        //specify destination
        destination: function (req, file, next) {
            next(null, './public/photo-storage');
        },

        //specify the filename to be unique
        filename: function (req, file, next) {
            next(null, file.originalname);
        }
    }),

    // filter out and prevent non-image files.
    fileFilter: function (req, file, next) {
        if (!file) {
            next();
        }

        // only permit image mimetypes
        const image = file.mimetype.startsWith('image/jpeg');
        const video = file.mimetype.startsWith('video/mp4');

        if (image || video) {
            console.log('File uploaded');
            next(null, true);
        } else {
            console.log("File not supported")
            //TODO:  A better message response to user on failure.
            return next();
        }
    }
};

var fileUploaded = ''
//GOOGLE DRIVE API

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function sendPackage() {

}


async function uploadFile(auth) {
    const drive = google.drive({
        version: 'v3',
        auth: auth
    });

    const filesMetadata = {
        // 'name': req.file.originalname
        'name': fileUploaded.originalname
    }

    const media = {
        mimeType: fileUploaded.mimeType,
        body: fs.createReadStream(fileUploaded.path)
    }

    let driveResponse = await drive.files.create({
        auth: auth,
        resource: filesMetadata,
        media: media
    })

    var fileId = driveResponse.data.id;
    var permission =
    {
        role: "reader",
        type: "anyone",
        allowFileDiscovery: true
    };

    drive.permissions.create({
        resource: permission,
        fileId: fileId
    })

    let file = await drive.files.get({
        fileId: fileId,
        fields: '*' // to show every existing field
    });

    if (driveResponse.status == 200) {
        let type = '';

        switch (fileUploaded.mimetype) {
            case "image/jpeg":
                type = 'img';
                break;
            case "video/mp4":
                type = 'video';
                break;
            default:
                break;
        }

        if (type != '' && model_name != '') {
            var link = file.data.webContentLink.toString();
            let st = '"' + link + ', ' + type + ', ' + model_name + '"';
            url_share = st;

            const client = new net.Socket();

            const postData = querystring.stringify({
                link: url_share
            });

            client.connect(50000, '171.244.21.155', () => {
                // callback, when connection successfull
                console.log('Send');
                client.write(postData);
            });
            client.on('data', (data) => {
                console.log('Reply');
                console.log(data.toString('utf-8'));
                resultLink = data.toString('utf-8');
                console.log('resultLink');
                console.log(resultLink);
                console.log('====');


                tempRes.send('<div><a href="' + resultLink + '">' + resultLink + '</a>' + '<a href="index.html">Up Another File</a></div>');

                client.destroy();
                // callback, when app replies with data
            });
            client.on('close', (data) => {
                console.log('Closed');

                // callback, when socket is closed
            });

        }
    }

}



router.post('/upload', multer(multerConfig).single('file_upload'), function (req, res) {
    fileUploaded = req.file
    tempRes = res;
    model_name = req.body.model_name;
    // Load client secrets from a local file.
    fs.readFile('credentials.json', async function (err, content) {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Drive API.
        authorize(JSON.parse(content), uploadFile);

    });
})

module.exports = router
