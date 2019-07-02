/**
 * These are the api's to interact with the AppScan Enterprise Proxy
 */

/**
 * Dependencies
 */
const aseProxyServerApi = require('../apiconnectors/ASEProxyApi');
const logger = require('../../config/logger');

// Expose object
var aseProxyServer = module.exports;



/**
 * Check if proxy server is up 
 */
aseProxyServer.checkIfUp = function (callback) {
    aseProxyServerApi.doGet('')
        .then((data) => {
            callback(true);
        })
        .catch((err) => {
            callback(false);
        })
}

/**
 * Start proxy server 
 * @param {Integer} proxy - OPTIONAL, to start proxy on a specific port.  If blank a random port will be chosen
 */
aseProxyServer.startProxy = function (callback, proxy) {
    let startProxyURL;
    if (proxy) {
        startProxyURL = 'StartProxy/' + proxy;
    } else {
        startProxyURL = 'StartProxy/0';
    }

    aseProxyServerApi.doGet(startProxyURL)
        .then((data) => {
            if (data.success) {
                let portTemp = data.message.split('port=');
                let port = portTemp[1];
                // New version of proxy places in port tag 
                if (!port) {
                    port = data.port;
                }
                callback({
                    success: true,
                    port: port
                })
            } else {
                logger.error('Error trying to start AppScan Enterprise proxy, ' + data.message);
                callback({
                    success: false
                })
            }
        })
        .catch((err) => {
            logger.error('Error trying to start AppScan Enterprise proxy, ' + JSON.stringify(err));
        })
}




aseProxyServer.stopProxy = function (port, callback) {
    logger.debug('Trying to stop ASE proxy port: ' + port);
    let startProxyURL;
    if (port) {
        startProxyURL = 'StopProxy/' + port;
    } else {
        logger.error('No port was set please pass port...');
    }


    aseProxyServerApi.doGet(startProxyURL)
        .then((data) => {
            if (data.success) {
                callback({
                    success: true
                })
            } else {
                logger.error('Error trying to stop AppScan Enterprise proxy, ' + data.message);
                callback({
                    success: false
                })
            }
        })
        .catch((err) => {
            logger.error('Error trying to stop AppScan Enterprise proxy, ' + JSON.stringify(err));
        })
}



aseProxyServer.downloadTraffic = function (port, callback) {
    logger.debug('Trying to download traffic file from ASE proxy server from port ' + port);
    let downloadTrafficURL = 'Traffic/' + port;
    if (!port) {
        return logger.error('No port was passed and port is required...');
    }

    aseProxyServerApi.doDownload(downloadTrafficURL)
        .then((data) => {

            if (data.success) {
                callback({
                    success: true,
                    location: data.location
                })
            } else {
                logger.error('Error trying to download traffic from AppScan Enterprise proxy, ' + data.msg);
                callback({
                    success: false,
                    msg: data.msg
                })
            }
        })
        .catch((err) => {
            logger.error('Error trying to download traffic, ' + JSON.stringify(err));
        })
}
