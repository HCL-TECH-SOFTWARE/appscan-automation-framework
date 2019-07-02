// Dependecies
const config = require('../../config/config')
const logger = require('../../config/logger');
var request = require('request');
var fs = require('fs');
var FormData = require('form-data');
const path = require('path');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest
var moment = require('moment');
var url = require("url"),
    http = require("http"),
    env = process.env;
const util = require('../util.js');


var proxy = {
    protocol: "http:",
    hostname: config.aseProxy.hostName,
    port: config.aseProxy.port,
}
var proxyRequests = function () {
    var proxyUrl = url.format(proxy);
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
    env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}
if (config.aseProxy.useProxy) {
    proxyRequests();
}
// Global variables
var token = {
    sessionID: null,
    cookie: null,
    timeCreated: null
}
// How often to refresh the ASE token so it does not expire in minutes
const ASETokenRefreshTime = 20;
var location;
// URL for AppScan Enterprise
var ASEURL = config.ASEURL;
// Credentials to log into AppScan Enterprise - DomainName\UserName
var ASEUserID = config.ASEUserID;
// Password for credentials to log into AppScan Enterprise
var ASEPass = config.ASEPass;
// Does user use proxy
const toUseProxy = config.aseProxy.useProxy;


// Exportable functions --------------------------------
module.exports = {
    doGet: function (url, header) {
        return new Promise((resolve, reject) => {
            get(url, function (err, response) {
                if (err) {
                    reject(err);
                } else {
                    resolve(response);
                }
            }, header)
        })
    },






    doPost: function (url, body, header) {
        return new Promise((resolve, reject) => {
            post(url, body, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            }, header)
        })
    },

    doUploadDASTFile: function (url, body, fileLoc) {
        return new Promise((resolve, reject) => {
            uploadDASTFile(url, body, fileLoc, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            })
        })
    },


    doDelete: function (url, body, header) {
        return new Promise((resolve, reject) => {
            del(url, body, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            }, header)
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


    doUpload: function (url, body, fileLoc) {
        return new Promise((resolve, reject) => {
            uploadFile(url, body, fileLoc, function (err, response) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(response);
                }
            })
        })
    }


}
// END Exportable functions ------------------------------------


// Checks if token is still valid
var isTokenValid = function (callback) {
    var checkTokenURL = ASEURL + '/version';

}

// Logs into AppScan Enterprise and stores token and session information
var loginToASE = function (callback) {
    if (token.sessionID && moment().unix() < (parseInt(token.timeCreated) + (parseInt(ASETokenRefreshTime) * 60))) {
        //token still valid
        callback();
    } else {
        // token not valid
        console.log('Logging into AppScan Enterprise...');
        var loginURL = ASEURL + '/login'
        var loginBody = {
            userId: ASEUserID,
            password: ASEPass,
            featureKey: "AppScanEnterpriseUser"
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
                token.cookie = response.headers['set-cookie'];
                //console.log('TOKEN: ' + body.sessionId)
                token.sessionID = body.sessionId;
                token.timeCreated = moment().unix();
                callback();
            }
            else {
                logger.error('Can not connect to AppScan Enterprise Server at host: ' + ASEURL + '.  Make sure you can connect to this host first!');
                if (global.emitErrors) util.emitError(error);
            }
        })
    }
}






var get = function (url, callback, header) {
    loginToASE(function () {
        let requestURL = ASEURL + url
        let headerInfo = {
            headers: {
                Cookie: token.cookie,
                asc_xsrf_token: token.sessionID
            }
        }
        if (header) {
            if (header.range) {
                headerInfo.headers['Range'] = header.range;
            }
            if (header.Accept) {
                headerInfo.headers.Accept = header.Accept
            }
        }
        request({
            headers: headerInfo.headers,
            url: requestURL,
            method: "GET",
            json: true,   // <--Very important!!!
            rejectUnauthorized: false,
            encoding: null
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                if (response.statusCode == 401) {
                    logger.error('Error trying to call ASE, ' + response.body.errorMessage);
                }
                if (response.headers.location == '/ase/LicenseWarning.aspx') {
                    logger.error('Error your AppScan Enterprise license is expiring soon warning.  You must extend your license to resolve this know issue with certain API endpoints.  (Legacy API)');
                }
                callback(null, response);
            }
        })
    })
}






var post = function (url, body, callback, header) {
    loginToASE(function () {
        let requestURL = ASEURL + url;
        let headerInfo = {
            headers: {
                Cookie: token.cookie,
                asc_xsrf_token: token.sessionID
            }
        }
        if (header) {
            if (header['If-Match']) {
                headerInfo.headers['If-Match'] = header['If-Match'];
            }
            if (header.Accept) {
                headerInfo.headers.Accept = header.Accept
            }
        }

        request({
            headers: headerInfo.headers,
            url: requestURL,
            method: "POST",
            json: true,   // <--Very important!!!
            body: body,
            rejectUnauthorized: false
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                if (response.headers.location == '/ase/LicenseWarning.aspx') {
                    logger.error('Error your AppScan Enterprise license is expiring soon warning.  You must extend your license to resolve this know issue with certain API endpoints.  (Legacy API)');
                }
                if (response.statusCode == 401) {
                    logger.error('Error trying to create folder on AppScan Enterprise, the folder could already exist or ' + response.body.errorMessage);
                }
                callback(null, response);
            }
        })
    })
}






var del = function (url, body, callback, header) {
    loginToASE(function () {
        let requestURL = ASEURL + url;
        let headerInfo = {
            headers: {
                Cookie: token.cookie,
                asc_xsrf_token: token.sessionID
            }
        }
        if (header) {
            if (header['If-Match']) {
                headerInfo.headers['If-Match'] = header['If-Match'];
            }
            if (header.Accept) {
                headerInfo.headers.Accept = header.Accept
            }
        }

        request({
            headers: headerInfo.headers,
            url: requestURL,
            method: "DELETE",
            json: true,   // <--Very important!!!
            body: body,
            rejectUnauthorized: false
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                if (response.headers.location == '/ase/LicenseWarning.aspx') {
                    logger.error('Error your AppScan Enterprise license is expiring soon warning.  You must extend your license to resolve this know issue with certain API endpoints.  (Legacy API)');
                }
                callback(null, response);
            }
        })
    })
}






var put = function (url, body, callback) {
    loginToASE(function () {
        let requestURL = ASEURL + url
        request({
            headers: {
                Cookie: token.cookie,
                asc_xsrf_token: token.sessionID
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
                if (response.headers.location == '/ase/LicenseWarning.aspx') {
                    logger.error('Error your AppScan Enterprise license is expiring soon warning.  You must extend your license to resolve this know issue with certain API endpoints.  (Legacy API)');
                }
                callback(null, response);
            }
        })
    })
}






var uploadFile = function (url, body, fileLoc, callback) {
    loginToASE(function () {
        fs.readFile(fileLoc, 'utf8', function (err, data) {
            if (err) {
                if (global.emitErrors) util.emitError(err);
                return logger.error('Error trying to upload findings to ASE.  Error: ' + err);
            }
            //console.log(data);
            var fd = new FormData();
            fd.append('asc_xsrf_token', token.sessionID)
            //fd.append('scanName', path.basename(fileLoc))

            if (body) {
                Object.keys(body).forEach(function (key) {
                    const val = body[key];
                    fd.append(key, (typeof val === 'object' ? JSON.stringify(val) : val));
                });
            }

            if (!fs.existsSync(fileLoc)) {
                callback(null, 'File not found: ' + fileLoc);
                return;
            }


            fd.append('uploadedfile', data, { contentType: 'text/xml', filename: path.basename(fileLoc) })

            let requestURL = ASEURL + url
            //console.log('FDDD: ' + JSON.stringify(fd));
            request({
                headers: {
                    Cookie: token.cookie,
                    asc_xsrf_token: token.sessionID,
                    'Content-Type': 'multipart/form-data; boundary=' + fd.getBoundary(),
                    Accept: "application/json, text/javascript, */*;q=0.01",
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en'
                },
                url: requestURL,
                method: "POST",
                json: false,   // <--Very important!!!
                body: fd,
                rejectUnauthorized: false
            }, function (error, response) {
                if (error) {
                    callback(err, null);
                } else {
                    if (response.headers.location == '/ase/LicenseWarning.aspx') {
                        logger.error('Error your AppScan Enterprise license is expiring soon warning.  You must extend your license to resolve this know issue with certain API endpoints.  (Legacy API)');
                    }
                    callback(null, response);
                }
            })
        })
    })
}


var uploadDASTFile = function (url, body, fileLoc, callback) {
    loginToASE(function () {
        let requestURL = ASEURL + url
        //Construct the form, first with all of the body parameters, then with the file
        const fd = new FormData();
        fd.append('asc_xsrf_token', token.sessionID)

        const headers = {
            Cookie: token.cookie,
            asc_xsrf_token: token.sessionID,
            'Content-Type': 'multipart/form-data; boundary=' + fd.getBoundary(),
            Accept: "application/json, text/javascript, */*;q=0.01",
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en'
        };
        if (body) {
            Object.keys(body).forEach(function (key) {
                const val = body[key];
                fd.append(key, (typeof val === 'object' ? JSON.stringify(val) : val));
            });
        }

        if (!fs.existsSync(fileLoc)) {
            callback('File not found: ' + fileLoc, null, null);
            return;
        }

        fd.append('uploadedfile', fs.createReadStream(fileLoc), { contentType: 'application/xml', filename: path.basename(fileLoc) });

        request({
            headers: headers,
            url: requestURL,
            method: "POST",
            json: false,
            body: fd,
            rejectUnauthorized: false
        }, function (error, response) {
            if (error) {
                callback(error, null);
            } else {
                if (response.headers.location == '/ase/LicenseWarning.aspx') {
                    logger.error('Error your AppScan Enterprise license is expiring soon warning.  You must extend your license to resolve this know issue with certain API endpoints.  (Legacy API)');
                }
                callback(null, response);
            }
        });
    })
}


loginToASE(() => {
})
