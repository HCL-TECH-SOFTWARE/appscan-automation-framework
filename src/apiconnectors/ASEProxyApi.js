/**
 * These are the api's to interact with the AppScan Enterprise Proxy
 */

/**
 * Dependencies
 */
const config = require('../../config/config');
const logger = require('../../config/logger');
const fs = require('fs');
var request = require('request');

/**
 * Proxy
 */
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
const toUseProxy = config.aseProxy.useProxy;

/**
 * Global Variables
 */
const proxyURL = config.ASEProxyServerURL;
const locOfProxyTraffic = './tmp/'

// Exportable functions --------------------------------
module.exports = {
    doGet: function (url) {
        return new Promise((resolve, reject) => {
            get(url, function (data, err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        })
    },






    doPost: function (url, body) {
        return new Promise((resolve, reject) => {
            post(url, body, function (data, err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            })
        })
    },






    doDownload: function (url) {
        return new Promise((resolve, reject) => {
            download(url, function (data, err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            })
        })
    }
}
// END Exportable functions ------------------------------------

var get = function (url, callback) {
    let requestURL = proxyURL + url;
    request({
        url: requestURL,
        method: "GET",
        json: true,   // <--Very important!!!
        rejectUnauthorized: false
    }, function (error, response, body) {
        if (error) {
            callback(null, error);
        } else {
            callback(body, null);
        }
    })
}






var post = function (url, body, callback) {
    let requestURL = proxyURL + url
    request({
        url: requestURL,
        method: "POST",
        json: true,   // <--Very important!!!
        body: body,
        rejectUnauthorized: false
    }, function (error, response, body) {
        if (error) {
            callback(null, error);
        } else {
            callback(body, null);
        }
    })
}





var download = function (url, callback) {
    let requestURL = proxyURL + url;
    // RegExp to extract the filename from Content-Disposition
    var regexp = /filename=\"(.*)\"/gi;
    request({
        url: requestURL,
        method: "GET",
        json: true,
        rejectUnauthorized: false
    })
        .on('response', function (res) {
            if (res.statusCode == 200) {
            // extract filename
            let filename = regexp.exec(res.headers['content-disposition'])[1];

            // create file write stream
            let fws = fs.createWriteStream(locOfProxyTraffic + filename);

            // setup piping of data
            res.pipe(fws);

            res.on('end', () => {
                callback({
                    success: true,
                    location: locOfProxyTraffic + filename
                })
            })

        } else {
            if (res.statusCode == 410) {
                callback({
                    success: false,
                    msg: 'Traffic not found, might be using wrong port...'
                })
            } else {
                callback({
                    success: false,
                    msg: 'Error trying to download traffic...'
                })
            }
        }
        })

        .on('error', function (err) {
            callback(null, err);
        })
}






