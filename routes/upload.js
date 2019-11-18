const { Router } = require('express')
const router = Router()
const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const querystring = require("querystring")
const net = require('net');
const Axios = require('axios')
const path = require('path')

var file_url = '';
var DOWNLOAD_DIR = './downloads/';

var url_share = '';
var model_name = '';
var resultLink = '';

var imgLink = '';
var bbLink = '';
let isDone = false;

let arrCount = {
    'pedestrian': 0,
    'people': 0,
    'bicycle': 0,
    'car': 0,
    'van': 0,
    'truck': 0,
    'tricycle': 0,
    'awningtricycle': 0,
    'bus': 0,
    'motor': 0
}

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
            console.log("File not supported");
            isDone = false;
            //TODO:  A better message response to user on failure.
            return next();
        }
    }
};

var fileUploaded = ''
//GOOGLE DRIVE API

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
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

async function downloadFile(urlFile) {
    const url = urlFile;
    const fpath = path.resolve(__dirname, '../downloads', 'temp.txt')
    const writer = fs.createWriteStream(fpath)

    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
}


async function showResult(auth) {
    // file_url = resultLink.split(',')[1];

    arrCount = {
        'pedestrian': 0,
        'people': 0,
        'bicycle': 0,
        'car': 0,
        'van': 0,
        'truck': 0,
        'tricycle': 0,
        'awningtricycle': 0,
        'bus': 0,
        'motor': 0
    }

    await downloadFile(bbLink);

    fs.readFile('./downloads/temp.txt', function (err, data) {
        if (err) throw err;
        obj = data.toString().split('\n');
        obj.forEach(element => {
            if (element.length > 0) {
                objInfo = element.split(',');
                className = objInfo[0];
                arrCount[className] = arrCount[className] + 1;
            }
        });

        let query = '';

        Object.keys(arrCount).forEach(function (key) {
            var val = arrCount[key];
            if (val > 0) {
                query += key + '=' + val + '&'
            }
        });

        query = query + 'imgLink=' + imgLink;
        query = query + '&bbLink=' + bbLink;

        console.log(query);
        // query = query.slice(0, -1);

        tempRes.redirect('/chart/show?' + query);
    })

}

async function uploadFile(auth) {
    const drive = google.drive({
        version: 'v3',
        auth: auth
    });

    if (fileUploaded == undefined) {
        tempRes.redirect('/image?connect=' + isDone.toString());
        return;
    }
    else {

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
                var linkInput = file.data.webContentLink.toString();
                let st = '"' + linkInput + ', ' + type + ', ' + model_name + '"';
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
                    // console.log(data.toString('utf-8'));
                    resultLink = data.toString('utf-8');

                    let linkOutput = resultLink.split(',');

                    imgLink = linkOutput[0].replace('&export=download', '');
                    bbLink = linkOutput[1].replace('&export=download', '');

                    console.log('Link 1' + imgLink);
                    console.log('Link 2' + bbLink);

                    fs.readFile('credentials.json', async function (err, content) {
                        if (err) return console.log('Error loading client secret file:', err);
                        // Authorize a client with credentials, then call the Google Drive API.
                        authorize(JSON.parse(content), showResult);

                    });

                    isDone = true;
                    client.destroy();
                    // callback, when app replies with data
                });
                client.on('close', (data) => {
                    if (!isDone) {
                        tempRes.redirect('/image?connect=' + isDone.toString());
                    }
                    console.log('Closed');

                    // callback, when socket is closed
                });

                // client.on('error', (err) => {
                //     console.error('Something bad has happened! Failed Connect', err.stack);
                //     tempRes.redirect('/image?connect=' + isDone.toString());
                //     // throw (err);
                // })
                // showResult();
            }
        }
    }


}



router.post('/upload', multer(multerConfig).single('file_upload'), function (req, res) {
    fileUploaded = req.file
    // res.redirect('/chart')
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
