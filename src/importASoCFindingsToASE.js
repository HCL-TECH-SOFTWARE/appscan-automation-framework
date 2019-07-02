

// Dependecies
const config = require('../config/config');
const logger = require('../config/logger');
var ase = require('./providers/ase');
var asoc = require('./providers/asoc');

// Global variables
var scanID = null;


// Check if application ID is passed in arguments
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-s') {
        scanID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        return console.log('-s <scanID>')
    }
}









/**
 * Pull XML data of findings from ASoC
 */
var downloadXMLData = function (scanID, filename, callback) {
    asoc.downloadXML(scanID, filename, (xmlLoc) => {
        callback(xmlLoc);
    })
}

/**
 * Gets the name of the application of the scan
 * @param {*} scanID 
 * @param {*} callback 
 */
var getAppName = function (scanID, callback) {
    asoc.getScanInfo(scanID, (scanInfo) => {
        logger.debug('Application ID from Application Security on cloud: ' + scanInfo.AppId)
        asoc.getApplicationInfo(scanInfo.AppId, (appInfo) => {
            logger.debug('Application name from Application Security on cloud: ' + appInfo.Name)
            callback(appInfo.Name);
        })
    })

}


// QUESTION: HOW DO YOU want to deal with App name mapping between ASoC and ASE
// how to handle this
var uploadXMLToASE = function (appID, filename, fileloc, callback) {
    ase.uploadXML(filename, fileloc, appID, (data) => {
        callback(data);
    })
}


/**
 * Get appID from ASE
 */
var getAppID = function (appName, callback) {
    logger.debug('Getting application ID from AppScan Enterprise...');
    logger.debug('AppName: ' + appName)
    let doesAppExist = false;
    ase.getApp((applications) => {
        for (let app in applications) {
            if (applications[app].name == appName) {
                doesAppExist = true;
                callback(applications[app].id);
            }
        }
        if (!doesAppExist) {
            ase.createApp(appName, (app) => {
                callback(app.id);
            })
        }
    })
}


/**
 * Check if scan is ready
 */
var isScanReady = function (scanID, callback) {
    asoc.getScanInfo(scanID, (scan) => {
        if (scan.LatestExecution.Status == 'Running') {
            callback(false);
        }
        else {
            callback(true);
        }
    })
}












/**
 * Main Function
 * @param {*} scanID 
 */
var importFindingsASoCToASE = function (scanID) {
    isScanReady(scanID, (ready) => {
        if (ready) {
            getAppName(scanID, (appName) => {
                downloadXMLData(scanID, appName, (xmlLoc) => {
                    getAppID(appName, (appID) => {
                        uploadXMLToASE(appID, appName, xmlLoc, (complete) => {
                            if (complete.statusCode == '202') {
                                logger.info('Upload to scan findings to AppScan Enterprise was successful!');
                            }
                        })
                    })
                })
            })
        } else {
            logger.info('Scan still running...')
            // wait 10 seconds and check again
            setTimeout(() => {importFindingsASoCToASE(scanID)}, config.checkIfScanIsReadyTimer * 1000)
        }
    })
}





if (scanID === null || scanID === undefined) {
    return console.log('Please enter scanID -s')
}
else {
    importFindingsASoCToASE(scanID);
}

