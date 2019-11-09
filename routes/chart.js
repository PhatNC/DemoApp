const { Router } = require('express')
const router = Router()
const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const querystring = require("querystring")
const net = require('net');

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
        const text = file.mimetype.startsWith('text/plain');

        if (text) {
            console.log('File uploaded');
            next(null, true);
        } else {
            console.log("File not supported")
            //TODO:  A better message response to user on failure.
            return next();
        }
    }
};

router.post('/chart/upload', multer(multerConfig).single('file_upload'), function (req, res) {
    fileUploaded = req.file

    // console.log(fileUploaded);
    // res.redirect('/chart')
    // tempRes = res;
    // model_name = req.body.model_name;
    // // Load client secrets from a local file.
    fs.readFile('./downloads/temp.txt', function (err, data) {
        if (err) throw err;
        // console.log('OK: ' + fileUploaded.originalname);
        // console.log(data.toString())
        obj = data.toString().split('\n');
        // console.log(obj);
        obj.forEach(element => {
            if (element.length > 0) {
                // console.log(element);
                objInfo = element.split(',');
                className = objInfo[0];
                arrCount[className] = arrCount[className] + 1;
                // console.log(className + arrCount[className]);
            }
        });
        // console.log(arrCount);
        let query = 'pedestrian=' + arrCount['pedestrian'] +
            '&people=' + arrCount['people'] +
            '&bicycle=' + arrCount['bicycle'] +
            '&car=' + arrCount['car'] +
            '&van=' + arrCount['van'] +
            '&truck=' + arrCount['truck'] +
            '&tricycle=' + arrCount['tricycle'] +
            '&awningtricycle=' + arrCount['awningtricycle'] +
            '&bus=' + arrCount['bus'] +
            '&motor=' + arrCount['motor'];
        res.redirect('/chart/show?' + query);
    })
})

router.get('/chart/show', function (req, res) {
    res.render('chart.html');
});

module.exports = router
