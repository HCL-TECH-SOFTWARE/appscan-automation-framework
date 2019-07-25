/**
 * This is a command line script that allows you to update your ASE password and encrpyts it so its not stored in plain text
 */
var fs = require('fs');
var path = require('path');
// If this file does not exist then create it
var serviceAccountPasswordJson;
checkForFile('../config/serviceAccountConfig.json', () => {
    var prompt = require('prompt');
    var config = require('../config/config');
    // if windows so /../ otherwise dont
    var os = process.platform;
    var filePath;
    if (os === 'win32') {
        filePath = config.frameworkPath + "/config/serviceAccountConfig.json"
    } else {
        filePath = config.frameworkPath + "/config/serviceAccountConfig.json"
    }
    var encryption = require('../src/providers/encrypt');
    serviceAccountPasswordJson = require('../config/serviceAccountConfig.json');

    // Start the prompt
    prompt.start();

    // Get the ASE password to encrypt
    console.log('Welcome to the service account password updator.  This will encrypt your password and store it in the config.js file so its not stored in clear text.  Please enter your corresponding service account password for the username in the config.js file, ' + config.serviceAccountUserID);

    prompt.get(['Service account password'], function (err, result) {
        if (err) {
            console.log('Error running script, please try again.  ' + err);
        } else {
            let encrptedPass = encryption.encrypt(result['Service account password']);
            serviceAccountPasswordJson.serviceaccountpassword = encrptedPass;
            writePasswordToConfig();
        }
    })




    var writePasswordToConfig = function () {

        fs.writeFile(filePath, JSON.stringify(serviceAccountPasswordJson), function (err) {
            if (err) return console.log(err);
            console.log('Successfully updated service account password!');
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
            fs.writeFile(path.resolve(__dirname, fileName), JSON.stringify(fileContent), function (err, data) {
                if (err) {
                    console.log('ERROR: ' + err);
                }
                callback();
            })
        }
    });
}
