var asocapi = require('../apiconnectors/ASoCApi');
const logger = require('../../config/logger');
const querystring = require('querystring');

// Expose object
var asoc = module.exports;


/**
 * Pull XML data of findings from ASoC
 */
asoc.downloadXML = function (scanID, filename, callback) {
    logger.info('Downloading XML data from application security on cloud...');
    let getScanXMLReportURL = '/Scans/' + scanID + '/Report/Xml';
    asocapi.downloadFile(filename, getScanXMLReportURL, function (result) {
        // Upload XML to ASE
        callback(result);
    })
}


/**
 * Get Scan info
 */
asoc.getScanInfo = function (scanID, callback) {
    logger.debug('Getting scan info from application security on cloud...');
    let getScanInfoURL = '/Scans/' + scanID;
    asocapi.doGet(getScanInfoURL)
        .then((scan) => {
            callback(scan);
        })
        .catch((err) => {
            logger.error('Error trying to get scan info from application security on cloud.  Error: ' + err);
        })
}

/**
 * Get Application Id
 */
asoc.getAppId = function (name, callback) {
    let query = querystring.stringify({filter: 'Name eq ' + '\'' + name + '\''})
    let AppURL = '/Apps?$' + query;
    //console.log('AppURL: ' + AppURL);
    asocapi.doGet(AppURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get applicaiton information from application security on cloud.  Error: ' + err);
        })
}


/**
 * Get Application info
 */
asoc.getApplicationInfo = function (appID, callback) {
    logger.debug('Getting application info from application security on cloud...');
    let getAppInfoURL = '/Apps/' + appID;
    asocapi.doGet(getAppInfoURL)
        .then((scan) => {
            callback(scan);
        })
        .catch((err) => {
            logger.error('Error trying to get application info from application security on cloud.  Error: ' + err);
        })
}


/**
 * Get all applications in ASoC
 */
asoc.getApplications = function (callback) {
    logger.debug('Getting all applications from application security on cloud...');
    let getApplicationsURL = '/Apps';
    asocapi.doGet(getApplicationsURL)
        .then((apps) => {
            callback(apps);
        })
        .catch((err) => {
            logger.error('Error trying to get applications from application security on cloud.  Error: ' + err);
        })
}


/**
 * Get all roles in ASoC
 */
asoc.getAllRoles = function (callback) {
    logger.debug('Getting all roles from application security on cloud...');
    let getRolesURL = '/Roles';
    asocapi.doGet(getRolesURL)
        .then((apps) => {
            callback(apps);
        })
        .catch((err) => {
            logger.error('Error trying to get roles from application security on cloud.  Error: ' + err);
        })
}


/**
 * Get all users in ASoC
 */
asoc.getAllUsers = function (callback) {
    logger.debug('Getting all users from application security on cloud...');
    let getUsersURL = '/Users';
    asocapi.doGet(getUsersURL)
        .then((apps) => {
            callback(apps);
        })
        .catch((err) => {
            logger.error('Error trying to get users from application security on cloud.  Error: ' + err);
        })
}


/**
 * Create new application
 */
asoc.createApplication = function (name, assetGroupId, description, type, development_contact, callback) {
    logger.debug('Creating new application on application security on cloud...');
    let createNewApplicationURL = '/Apps';
    let newAppData = {
        Name: name,
        AssetGroupId: assetGroupId,
        Description: description,
        Type: type,
        DevelopmentContact: development_contact
    }
    asocapi.doPost(createNewApplicationURL, newAppData)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to create a new application on application security on cloud.  Error: ' + err);
        })
}


/**
 * Update application in ASoC
 */
asoc.updateApplication = function (appID, name, assetGroupId, description, type, development_contact, callback) {
    logger.debug('Updating application on application security on cloud...');
    let updateApplicationURL = '/Apps/' + appID;
    let updateAppData = {}
    // asset group ID and appID is required for this call
    if (!assetGroupId || !appID) {
        logger.error('Error trying to update application on application security on cloud.  Update function required asset group ID and app ID and one/both were not supplied...');
        return;
    }
    if (name) {
        updateAppData.Name = name;
    }
    if (assetGroupId) {
        updateAppData.AssetGroupId = assetGroupId;
    }
    if (description) {
        updateAppData.Description = description;
    }
    if (type) {
        updateAppData.Type = type;
    }
    if (development_contact) {
        updateAppData.DevelopmentContact = development_contact;
    }
    asocapi.doPut(updateApplicationURL, updateAppData)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to update a application on application security on cloud.  Error: ' + err);
        })
}



/**
 * Create new asset group in ASoC
 */
asoc.createAssetGroup = function (name, description, callback) {
    logger.debug('Creating new asset group on application security on cloud...');
    let createAssetGroupURL = '/AssetGroups';
    let assetGroupData = {
        Name: name,
        Description: description
    }
    asocapi.doPost(createAssetGroupURL, assetGroupData)
        .then((assetGroupInfo) => {
            callback(assetGroupInfo);
        })
        .catch((err) => {
            logger.error('Error trying to create a new asset group on application security on cloud.  Error: ' + err);
        })
}


/**
 * Get all asset groups in ASoC
 */
asoc.getAllAssetgroup = function (callback) {
    logger.debug('Getting all asset groups in application security on cloud...');
    let getAssetGroupURL = '/AssetGroups';
    asocapi.doGet(getAssetGroupURL)
        .then((assetGroups) => {
            callback(assetGroups);
        })
        .catch((err) => {
            logger.error('Error trying to get all asset groups from application security on cloud.  Error: ' + err);
        })
}



/**
 * Update user
 */
asoc.updateUser = function (userID, assetGroupArray, roleID, callback) {
    logger.debug('Updating user: ' + userID + ' on application security on cloud...');
    if (!Array.isArray(assetGroupArray)) {
        logger.error('Error trying to update user in application security on cloud.  assetGroupArray was sent not in array format.  Please send as array...')
        return;
    }
    let updateUserURL = '/Users/' + userID;
    let updateUserDataJSON = {};

    if (assetGroupArray) {
        updateUserDataJSON.AssetGroupIds = assetGroupArray
    }
    if (roleID) {
        updateUserDataJSON.RoleId = roleID;
    }
    console.log('URL: ' + updateUserURL);
    console.log('BODY: ' + JSON.stringify(updateUserDataJSON));
    asocapi.doPut(updateUserURL, updateUserDataJSON)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to update user in application secuirty on cloud.  Error: ' + err);
        })
}


/**
 * Get running DAST scans
 * 
 * TODO: change to get just the Name/ID (or just ID) of the scans?
 */
asoc.getRunningDASTScans = function (callback) {
    logger.debug('Getting running DAST scans info from application security on cloud...');
    let filter="((Technology%20eq%20'DynamicAnalyzer'))%20and%20((LatestExecution%2FStatus%20eq%20'Running'))"
    let getScansURL = '/Scans?' + '$filter=' + filter;
    asocapi.doGet(getScansURL)
        .then((scanData) => {
            callback(scanData);
        })
        .catch((err) => {
            logger.error('Error trying to get running DAST Scan info from application security on cloud.  Error: ' + err);
        })
}
