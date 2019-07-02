/**
 * This is a command line script that allows you to update your ASE password and encrpyts it so its not stored in plain text
*/
var fs = require('fs');
var path = require('path');
const config = require('../config/config');

// If this file does not exist then create it
var asePasswordJson;
var aseConfigFileLoc;
var os = process.platform;

//const filePath = config.computerPath;
const filePath = config.computerPath;
//console.log(filePath)

//if (!filePath ) {
//    err = 'Please set the ASAF_HOME environment variable to the root of the Framework codebase.';
//    return console.log('ERROR: ' + err);
//}

if (os === 'win32') {
    aseConfigFileLoc = '\\config\\aseconfig.json'
} else {
    aseConfigFileLoc = '/config/aseconfig.json';
}
aseConfigFileLoc = filePath + aseConfigFileLoc;
console.log(aseConfigFileLoc)

checkForFile(aseConfigFileLoc, () => {
//    console.log('DIRRR: ' + aseConfigFileLoc)
    setTimeout(() => {
        asePasswordJson = require('../config/aseconfig.json');
    }, 3000)
    var prompt = require('prompt');
    var config = require('../config/config');
    // if windows so /../ otherwise dont
    var os = process.platform;
    // if (os === 'win32') {
    //     filePath = config.computerPath + "/../config/aseconfig.json"
    // } else {
    //     filePath = config.computerPath + "/config/aseconfig.json"
    // }
    var encryption = require('../src/providers/encrypt');

    // Start the prompt
    prompt.start();

    // Get the ASE password to encrypt
    console.log('Welcome to the AppScan Enterprise password updater.  This will encrypt your password and store it in the aseconfig.json file so its not stored in clear text.  Please enter your corresponding AppScan eneterpise password for the username in the config.js file, ' + config.ASEUserID);

    prompt.get(['AppScan Enterprise password'], function (err, result) {
        if (err) {
            console.log('Error running script, please try again.  ' + err);
        } else {
            let encrptedPass = encryption.encrypt(result['AppScan Enterprise password']);
            asePasswordJson.asePasswordJson = encrptedPass;
            console.log('ASE file loc: ' + aseConfigFileLoc);
            writePasswordToConfig(aseConfigFileLoc);
        }
    })
   
    var writePasswordToConfig = function (fileName) {

//        fs.writeFile(filePath + fileName, JSON.stringify(asePasswordJson), function (err) {
        fs.writeFile(aseConfigFileLoc, JSON.stringify(asePasswordJson), function (err) {
            if (err) return console.log(err);
            console.log('Successfully updated ASE password!');
            console.log('writing to ' + filePath);
        });
    }
})


function checkForFile(fileName, callback) {
    fs.exists(fileName, function (exists) {
        if (exists) {
            callback();
        } else {
            let fileContent = {
                asePasswordJson: ''
            };
            fs.writeFile(path.resolve(filePath, fileName), JSON.stringify(fileContent), function (err, data) {
                if (err) {
                    console.log('ERROR: ' + err);
                }
                callback();
            })
        }
    });
}

