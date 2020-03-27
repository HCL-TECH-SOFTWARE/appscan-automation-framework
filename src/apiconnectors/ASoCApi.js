/**
 * ASOC API requests
 */

// Dependecies
const config = require('../../config/config')
const logger = require('../../config/logger');
var request = require('request');
var fs = require('fs');
var url = require("url"),
    http = require("http"),
    env = process.env;
var moment = require('moment');

var proxy = {
    protocol: "http:",
    hostname: config.asocProxy.hostName,
    port: config.asocProxy.port,
}
var proxyRequests = function () {
    var proxyUrl = url.format(proxy);
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
    env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}

// Global variables
const useProxy = config.asocProxy.useProxy;
const ASoC_API_URL = config.ASoCURL;
const keyId = config.keyId;
const keySecret = config.keySecret;
var ASoCSession = {
    token: null,
    timeCreated: null
}
var token;


// Exportable functions --------------------------------
module.exports = {
    login: function (callback) {
        loginASoC(function () {
            callback();
        })
    },



    doGet: function (url) {
        return new Promise((resolve, reject) => {
            get(url, function (err, response) {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            })
        })
    },






    doPost: function (url, body) {
        return new Promise((resolve, reject) => {
            post(url, body, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            })
        })
    },





    doPut: function (url, body) {
        return new Promise((resolve, reject) => {
            put(url, body, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            })
        })
    },


    downloadFile: function (filenamed, requestURL, callback) {
        downloadFile(filenamed, requestURL, function (result) {
            callback(result);
        })
    }


}


// END Exportable functions ------------------------------------


var loginASoC = function (callback) {
    // token not valid
    if (useProxy) {
        proxyRequests();
    }
    logger.info('Logging into Application Security on Cloud...');
    var loginURL = ASoC_API_URL + '/Account/ApiKeyLogin'
    var loginBody = {
        KeyId: keyId,
        KeySecret: keySecret
    }
    request({
        url: loginURL,
        method: "POST",
        json: true,
        body: loginBody,
        rejectUnauthorized: false
    }, function (error, response, body) {
        //console.log('RESPONSE: ' + JSON.stringify(response))
        if (response != undefined) {
            // Check if creds are wrong
            if (response.statusCode == 401) {
                return logger.error('Error trying to log into Application Security on Cloud, ' + response.body.Message);
            }
            setASoCSession(body.Token, () => {
                token = body.Token;
                callback();
            })
        }
        else {
            logger.error('Can not connect to Application Security on cloud at host: ' + ASoC_API_URL + '.  Make sure you can connect to this host first!');
        }
    })
}





var post = function (url, body, callback) {
    validateToken(function () {
        let requestURL = ASoC_API_URL + url;
        token = 'Bearer ' + ASoCSession.token;
        request({
            headers: {
                Authorization: token
            },
            url: requestURL,
            method: "POST",
            json: true,   // <--Very important!!!
            body: body,
            rejectUnauthorized: false
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                if (response.statusCode == 201) {
                    callback(null, response);
                } else {
                    callback(null, response);
                }
            }
        })
    })
}



var get = function (url, callback) {
    validateToken(function () {
        let requestURL = ASoC_API_URL + url;
        token = 'Bearer ' + ASoCSession.token;
        request({
            headers: {
                Authorization: token
            },
            url: requestURL,
            method: "GET",
            json: true,   // <--Very important!!!
            rejectUnauthorized: false
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                callback(null, response);
            }
        })
    })
}


var put = function (url, body, callback) {
    validateToken(function () {
        let requestURL = ASoC_API_URL + url;
        token = 'Bearer ' + ASoCSession.token;
        request({
            headers: {
                Authorization: token
            },
            url: requestURL,
            method: "PUT",
            json: true,   // <--Very important!!!
            body: body,
            rejectUnauthorized: false
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                if (response.statusCode == 201) {
                    callback(null, response);
                } else {
                    callback(null, response);
                }
            }
        })
    })
}



var downloadFile = function (filenamed, url, callback) {
    validateToken(function () {
        let requestURL = ASoC_API_URL + url;
        token = 'Bearer ' + ASoCSession.token;
        var fileName = config.locOfXML + filenamed + '.xml';
        console.log('FILE LOC: ' + fileName)
        request({
            headers: {
                Authorization: token
            },
            url: requestURL,
            method: "GET",
            json: true,   // <--Very important!!!
            rejectUnauthorized: false

        }).pipe(fs.createWriteStream(fileName))
            .on('close', function () {
                var fileName = config.locOfXML + filenamed + '.xml';
                logger.debug('XML report download complete!' + fileName);
                callback(fileName);
            })
    })
}



// Unzips file downloaded from ASoC
var unzipFile = function (filename, callback) {
    logger.debug('Unzippping file...');
    var fileName = filename + '.zip';
    var xmlFileName = filename + '.xml';
    yauzl.open(fileName, { lazyEntries: true }, function (err, zipfile) {
        if (err) throw err;
        zipfile.readEntry();
        zipfile.on("entry", function (entry) {
            if (/\/$/.test(entry.fileName)) {
                // Directory file names end with '/'.
                // Note that entires for directories themselves are optional.
                // An entry's fileName implicitly requires its parent directories to exist.
                zipfile.readEntry();
            } else {
                xmlFileName = entry.fileName;
                // file entry
                zipfile.openReadStream(entry, function (err, readStream) {
                    if (err) throw err;
                    readStream.on("end", function () {
                        zipfile.readEntry();
                    });
                    readStream.pipe(fs.createWriteStream(xmlFileName))
                        .on('close', function () {
                            console.log('Completed unzipping file.');
                            //parseXML(entry.fileName);
                            callback(filename);
                        })
                });
            }
        });
    });
}





var validateToken = function (callback) {
    if (useProxy) {
        proxyRequests();
    }
    let requestURL = ASoC_API_URL + '/Apps/Count';
    request({
        headers: {
            Authorization: 'Bearer ' + ASoCSession.token
        },
        url: requestURL,
        method: "GET",
        json: true,   // <--Very important!!!
        rejectUnauthorized: false
    }, function (error, response, body) {
        if (error) {
            logger.error('Error connecting to application security on cloud.  Error: ' + JSON.stringify(error));
        } else {
            if (response) {
                //console.log('ASOC Validate login response: ' + JSON.stringify(response));
                // If token is not valid
                if (response.statusCode === 401) {
                    loginASoC(function () {
                        callback();
                    })
                }
                else {
                    callback();
                }
            } else {
                logger.error('Response from application security on cloud is null. Error: ' + JSON.stringify(error));
            }
        }
    })
}


const setASoCSession = function (token, callback) {
    ASoCSession.token = token;
    ASoCSession.timeCreated = moment().unix();
    callback();
}
