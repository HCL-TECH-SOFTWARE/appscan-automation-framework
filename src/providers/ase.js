var aseapi = require('../apiconnectors/ASEAPI');
const logger = require('../../config/logger');
const util = require('../util.js');
var date = new Date();



const applicationAccessTypeID = {
    none: 0,
    read_only: 10,
    basic: 100,
    full: 200
}

const folderRoleTypeID = {
    issue_manager: 1,
    job_administration: 2,
    no_access: 3,
    report_administration: 4,
    report_consumer: 5
}

// Expose object
var ase = module.exports;


/**
 * Get ALL applications from ASE (this function only supports range and not filters)
 * @param {Object} range - (OPTIONAL) has to keys: start and end, allows controll of what data to send.  If nothing sent
 * defaults to start at 0 and end at 99. EXAMPLE: range = {start: 0, end: 99}
 */
ase.getApps = function (callback, range) {
    let getAppURL = '/applications';
    let startRange = 0;
    let endRange = 99;
    if (range) {
        if (range.start) {
            startRange = range.start;
        }
        if (range.end) {
            endRange = range.end;
        }
    }
    let headerData = {
        header: {
            range: "items=" + startRange + '-' + endRange
        }
    }

    aseapi.doGet(getAppURL, headerData.header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get applications from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Get an application from ASE
 */
ase.getSpecificApp = function (appID, callback) {
    let getAppURL = '/applications/' + appID;

    aseapi.doGet(getAppURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get applications from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Get an ASM application scans
 */
ase.getApplicationScans = function (appID, callback) {
    let getAppURL = '/applications/' + appID + '/scans'

    aseapi.doGet(getAppURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get application scans from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}



/**
 * Get current running and pending scan jobs from ASE
 */
ase.getRunningScanJobs = function (callback) {
    let getRunningScanJobsURL = '/scansmanagement';

    aseapi.doGet(getRunningScanJobsURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get current running and pending scan jobs from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Create application in ASE
 */
ase.createApp = function (name, description, tagsArray, development_contact, callback) {
    if (!Array.isArray(tagsArray)) {
        logger.error('Error trying to create application in ASE.  Tags was sent not in array format.  Please send as array...');
        if (global.emitErrors) util.emitError('Error trying to create application in ASE.  Tags was sent not in array format.  Please send as array...');
        return;
    }
    let createAppURL = '/applications';
    let createAppBody = {
        attributeCollection: {
            attributeArray: [
                {
                    name: "Tags",
                    value: tagsArray
                },
                {
                    name: "Development Contact",
                    value: [
                        development_contact
                    ]
                }
            ]
        },
        name: name,
        description: description,
    }

    aseapi.doPost(createAppURL, createAppBody)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get applications from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Update application in ASE
 */
ase.updateApp = function (appID, lastUpdatedTimeStamp, name, description, tagsArray, development_contact, callback) {
    let updateAppURL = '/applications/' + appID;
    let updateAppBody = {
        "id": appID,
        "name": name,
        "description": "",
        "lastUpdated": lastUpdatedTimeStamp + 1,
        attributeCollection: {
            attributeArray: []
        }
    }
    let nameJSON = {
        "name": "Name",
        "value": [name]
    }
    updateAppBody.attributeCollection.attributeArray.push(nameJSON);

    if (description) {
        updateAppBody.description = description;
    }
    if (tagsArray && tagsArray.length > 0) {
        if (!Array.isArray(tagsArray)) {
            logger.error('Error trying to create application in ASE.  Tags was sent not in array format.  Please send as array...')
            if (global.emitErrors) util.emitError('Error trying to create application in ASE.  Tags was sent not in array format.  Please send as array...');
            return;
        } else {
            updateAppBody.attributeCollection.attributeArray.push({
                name: "Tags",
                value: tagsArray
            })
        }
    }
    if (development_contact) {
        updateAppBody.attributeCollection.attributeArray.push({
            name: "Tags",
            value: [
                development_contact.replace(/,/g, " ")
            ]
        })
    }
    aseapi.doPut(updateAppURL, updateAppBody)
        .then((data) => {
            if (data.errorMessage) {
                if (data.errorMessage === 'CRWAS9999E An unknown error has occurred.') {
                    logger.debug('Ignored expected error message "CRWAS9999E An unknown error has occurred."');
                    callback(data);
                } else {
                    logger.error('Error occurred when updating application in AppScan Enterprise... Error: ' + data.errorMessage);
                    if (global.emitErrors)
                        util.emitError('Error occurred when updating application in AppScan Enterprise... Error: ' + data.errorMessage);
                }
            } else callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to update application: ' + name + 'from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })

}

/**
 * Deletes one or multiple applications at once 
 */
ase.deleteApp = function (appIDArray, callback) {
    logger.debug('Deleting applications in ASE...');
    if (!Array.isArray(appIDArray)) {
        if (global.emitErrors) util.emitError('appIDArray to delete apps must be in array format, wrong format sent.');
        return logger.error('appIDArray to delete apps must be in array format, wrong format sent.');
    }
    let deleteAppURL = '/applications';
    let deleteBody = appIDArray

    aseapi.doDelete(deleteAppURL, deleteBody)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to delete applications from AppScan Enterprise, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Get application access control list for application
 */
ase.getApplicationAccessControl = function (appID, callback) {
    logger.debug('Getting application access control for applicationID: ' + appID + ' in ASE...');
    let getAppAccessControlURL = '/applications/' + appID + '/access';

    aseapi.doGet(getAppAccessControlURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get application access control for application in AppScan Enterprise. ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Update application access controll in ASE
 * @param {String} accessType - Type of access for the user. accessType: NONE, BASIC, READ_ONLY, FULL
 */
ase.updateApplicationAccessControl = function (appID, userID, accessType, callback) {
    let appAccessType;
    logger.debug('updating application access control for applicationID: ' + appID + ' in ASE...');
    if (accessType === 'NONE') {
        appAccessType = applicationAccessTypeID.none;
    }
    if (accessType === 'BASIC') {
        appAccessType = applicationAccessTypeID.basic;
    }
    if (accessType === 'READ_ONLY') {
        appAccessType = applicationAccessTypeID.read_only;
    }
    if (accessType === 'FULL') {
        appAccessType = applicationAccessTypeID.full;
    }
    let updateAppAccessControlURL = '/applications/' + appID + '/access/' + userID;
    let updateAccessControlBody = {
        userId: userID,
        accessTypeId: appAccessType
    }

    aseapi.doPut(updateAppAccessControlURL, updateAccessControlBody)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to update application access control in AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Create an access control entry for the application
 * @param {String} accessType - Optional, type of access for the user. If left blank will be default. Default is basic access
 */
ase.createAccessControlEntry = function (appID, userID, callback, accessType) {
    logger.debug('Creating access control entry for application ID: ' + appID + ' in ASE...');
    let createAccessControlEntryURL = '/applications/' + appID + '/access';
    let appAccessType = applicationAccessTypeID.basic;
    if (accessType === 'READ_ONLY') {
        appAccessType = applicationAccessTypeID.read_only;
    }
    if (accessType === 'FULL') {
        appAccessType = applicationAccessTypeID.full;
    }

    let accessControlEntryBody = {
        userId: userID,
        accessTypeId: appAccessType
    }

    aseapi.doPost(createAccessControlEntryURL, accessControlEntryBody)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to create access control entry for application in AppScan Enterprise.  ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Create user in ASE
 */
ase.createUser = function (fullName, userName, email, userType, callback) {
    logger.debug('Creating user in ASE...');
    let createUserURL = '/consoleusers';

    let createUserTypeBody = {
        userName: userName,
        email: email,
        userTypeId: userType
    }
    if (fullName) {
        createUserTypeBody.fullName = fullName;
    }

    aseapi.doPost(createUserURL, createUserTypeBody)
        .then((data) => {
            if (data.errorMessage) {
                logger.error('Error trying to create user, ' + data.errorMessage);
            }
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to create user in AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Deletes a user from ASE
 * 
 * @param {*} userId - the ID of a user
 */
ase.deleteUser = function (userId, callback) {
    logger.debug('DELETING user in ASE...');
    let deleteUserURL = '/consoleusers/' + userId;

    aseapi.doDelete(deleteUserURL, null, null)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to delete user in AppScan Enterprise.  Error: ' + err);
        })
}


/**
 * update user in ASE (must be admin to do this or you can update your account only)
 */
ase.updateUser = function (userID, fullName, email, userType, callback) {
    logger.debug('Updating user in ASE...');
    let createUserURL = '/consoleusers/' + userID;

    let createUserTypeBody = {
        email: email,
        userTypeId: userType
    }
    if (fullName) {
        createUserTypeBody.fullName = fullName;
    }
    aseapi.doPut(createUserURL, createUserTypeBody)
        .then((data) => {
            if (data.errorMessage) {
                logger.error('Error trying to update user, ' + data.errorMessage);
            }
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to update user in AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Get all user types in ASE
 */
ase.getUserTypes = function (callback) {
    logger.debug('getting all user types in ASE...');
    let getUserTypeURL = '/usertypes';

    aseapi.doGet(getUserTypeURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get user types from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Get all users in ASE
 */
ase.getAllUsers = function (callback) {
    logger.debug('Getting all users from ASE...');
    let getAllUsersURL = '/consoleusers';

    aseapi.doGet(getAllUsersURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get all users from AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
    }

/**
 * Upload XML to ASE
 */
ase.uploadXML = function (fileName, fileLoc, appID, callback) {
    logger.info('Uploading XML to ASE...');
    logger.debug('appID: ' + appID)
    let uploadIssuesToAppURL = '/issueimport/' + appID + '/14';
    let body = {
        scanName: path.basename(fileLoc)
    }
    aseapi.doUpload(uploadIssuesToAppURL, body, fileLoc)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to upload XML to AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Create job in ASE - if fileLoc is not sent then use api that creates job on only templateID
 * Create job in ASE
 * @param {*} templateId 
 * @param {*} testPolicyId 
 * @param {*} folderId 
 * @param {*} applicationId 
 * @param {*} name 
 * @param {*} description 
 * @param {*} contact 
 * @param {*} fileLoc 
 * @param {*} callback 
 */
ase.createJob = function (templateId, testPolicyId, folderId, applicationId, name, description, contact, fileLoc, callback) {
    logger.info('Creating job in ASE...');
    if (!templateId) {
        return logger.error('No template ID sent please send templateID');
    }
    // If fileLoc is null then use api to create job on only templateID
    if (fileLoc) {
        let createJobUrl = '/jobs?templateId=' + templateId;
        let createJobBody = {
            jobDetails: {
                testPolicyId: testPolicyId,
                folderId: folderId,
                applicationId: applicationId,
                name: name,
                description: description,
                contact: contact
            }
        };

        aseapi.doUpload(createJobUrl, createJobBody, fileLoc)
            .then((data) => {
                if (data.statusCode == 201) {
                    callback({
                        success: true,
                        msg: data
                    })
                } else {
                    callback({
                        success: false,
                        msg: 'Error trying to start scan, ' + data.errorMessage
                    })
                }
            })
            .catch((err) => {
                logger.error('Error trying to create job,' + JSON.stringify(err));
                if (global.emitErrors) util.emitError(err);
            })
    } else {
        let createJobUrl = '/jobs/' + templateId + '/dastconfig/createjob';
        let createJobBody = {
            testPolicyId: testPolicyId,
            folderId: folderId,
            applicationId: applicationId,
            name: name,
            description: description,
            contact: contact
        }

        aseapi.doPost(createJobUrl, createJobBody)
            .then((data) => {
                if (data.errorMessage) {
                    logger.error('Error trying to create job, ' + data.errorMessage);
                    callback({
                        success: false,
                        msg: data.errorMessage
                    })
                } else {
                    callback({
                        success: true,
                        msg: data
                    })
                }
            })
            .catch((err) => {
                logger.error('Error trying to create job,' + JSON.stringify(err));
                if (global.emitErrors) util.emitError(err);
            })
    }
}

/**
 * Update the traffic of DAST job.  This API is used to add or replace the traffic of the job with: 
    1) The traffic in the uploaded dast.config file.
    or
    2) A traffic file.
    This API is NOT applicable for Content Scan Jobs. 
 * @param {*} jobId - ID of the DAST job trying to update
 * @param {*} action - The traffic actions available are as follows:
    Traffic action 'add' - Adds the new traffic to the job.
    Traffic action 'replace' - Removes old traffic and adds the new traffic to the job.
    Traffic action 'login' - Adds a login traffic to the job.
    Traffic action 'additional_login' - Adds additional login traffic to the job.
    Traffic action 'multi_step' - Adds a traffic with multi-step operations.
    @param {*} fileLoc - location of the traffic file  
 */
ase.updateDASTJob = function (jobId, action, fileLoc, callback) {
    if (action == 'add' || action == 'replace' || action == 'login' || action == 'additional_login' || action == 'multi_step') {
        logger.info('Updating DAST job in ASE...');
        let updateDASTJobURL = '/jobs/' + jobId + '/dastconfig/updatetraffic/' + action;

        aseapi.doUploadDASTFile(updateDASTJobURL, null, fileLoc)
            .then((data) => {
                if (data.statusCode == 200) {
                    callback({
                        success: true,
                        msg: data
                    })
                } else {
                    callback({
                        success: false,
                        msg: 'Error trying to update job, ' + data.errorMessage
                    })
                }
            })
            .catch((err) => {
                logger.error('Error trying to update job,' + JSON.stringify(err));
                if (global.emitErrors) util.emitError(err);
            })

    } else {
        return logger.error('Inccorect action sent, action must be one of: add, replace, login, additional_login, or multi_step');
    }
}



/**
 * Run a job in ASE
 * @param {*} jobId 
 * @param {*} etag 
 * @param {*} callback 
 */
ase.runJob = function (jobId, callback) {
    logger.info('Running job in ASE...');
    // get etag 
    ase.getDASTJobDetails(jobId, (DASTJobDetails, resp) => {
        let runJobURL = '/jobs/' + jobId + '/actions';
        let runJobHeader = {
            'If-Match': resp.headers.etag
        }
        let runJobBody = {
            type: 'run'
        }

        aseapi.doPost(runJobURL, runJobBody, runJobHeader)
            .then((data) => {
                if (data) {
                    if (data.statusCode == 200) {
                        callback({
                            success: true,
                            msg: 'Successfully started job'
                        })
                    } else {
                        callback({
                            success: false,
                            msg: data.body.errorMessage
                        })
                    }
                } else {
                    callback({
                        success: false,
                        msg: 'Error trying to run job...'
                    })
                }
            })
            .catch((err) => {
                logger.error('Error trying to run job, ' + JSON.stringify(err));
                if (global.emitErrors) util.emitError(err);
            })
    })
}


/**
 * Create Server Group
 * @param {*} name - name of server group
 * @param {*} domain - domain of scope of server group.  domains, ip range, OR ip (if multiple seperate with semicolon)
 * @param {*} domainType - What type domain is.  Must be: domains, iprange, OR ip
 */
ase.createServerGroup = function (name, domain, domainType, callback) {
    logger.debug('Creating server group in AppScan Enterprise...');
    if (domainType == 'domains' || domainType == 'iprange' || domainType == 'ip') {

    } else {
        return callback({ success: false, msg: 'Incorrect domainType sent, must be domains, iprange, or ip.' });
    }

    let createServerGroupURL = '/servergroups/create';
    let createServerGroupBody = {
        serverGroupName: name
    }
    if (domainType == 'domains') {
        createServerGroupBody.domains = domain
    }
    if (domainType == 'iprange') {
        createServerGroupBody.iprange = domain
    }
    if (domainType == 'ip') {
        createServerGroupBody.ip = domain
    }
    let header = {
        Accept: 'application/xml'
    }
    aseapi.doPost(createServerGroupURL, createServerGroupBody, header)
        .then((serverGroup) => {
            callback(serverGroup);
        })
        .catch((err) => {
            logger.error('Error trying to create server group, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Update Server Group
 * @param {*} serverGroupID - ID of server group that is being updated
 * @param {*} name - name of server group
 * @param {*} domain - domain of scope of server group.  domains, ip range, OR ip (if multiple seperate with semicolon)
 * @param {*} domainType - What type domain is.  Must be: domains, iprange, OR ip
 * @param {*} removeDomain - remove domain of scope of server group.  domains, ip range, OR ip (if multiple seperate with semicolon)
 * @param {*} removeDomainType - What type removeDomain is.  Must be: domains, iprange, OR ip
 */
ase.updateServerGroup = function (serverGroupID, name, domain, domainType, removeDomain, removeDomainType, callback) {
    logger.debug('Updating server group in AppScan Enterprise...');
    if (domainType == 'domains' || domainType == 'iprange' || domainType == 'ip') {

    } else {
        return callback({ success: false, msg: 'Incorrect domainType sent, must be domains, iprange, or ip.' });
    }
    if (removeDomainType) {
        if (removeDomainType == 'domains' || removeDomainType == 'iprange' || removeDomainType == 'ip') {

        } else {
            return callback({ success: false, msg: 'Incorrect removeDomainType sent, must be domains, iprange, or ip.' });
        }
    }
    let updateServerGroupURL = '/servergroups/edit/' + serverGroupID;
    let updateServerGroupBody = {
        serverGroupName: name
    }
    if (domainType == 'domains') {
        updateServerGroupBody.addDomains = domain
    }
    if (domainType == 'iprange') {
        updateServerGroupBody.addIPRange = domain
    }
    if (domainType == 'ip') {
        updateServerGroupBody.addIP = domain
    }
    if (removeDomainType == 'domains') {
        updateServerGroupBody.removeDomains = removeDomain
    }
    if (removeDomainType == 'iprange') {
        updateServerGroupBody.removeIPRange = removeDomain
    }
    if (removeDomainType == 'ip') {
        updateServerGroupBody.removeIP = removeDomain
    }

    let header = {
        Accept: 'application/xml'
    }

    aseapi.doPost(updateServerGroupURL, updateServerGroupBody, header)
        .then((serverGroup) => {
            callback(serverGroup);
        })
        .catch((err) => {
            logger.error('Error trying to update server group, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


ase.deleteServerGroup = function (serverGroupID, callback) {
    logger.debug('DELETING server group in AppScan Enterprise...');
    let deleteServerGroupURL = '/servergroups/delete/' + serverGroupID;
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doDelete(deleteServerGroupURL, null, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to delete server groups, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}




/**
 * Get all server groups in ASE
 */
ase.getServerGroups = function (callback) {
    logger.debug('getting server groups in AppScan Enterprise...');
    let getServerGroupURL = '/servergroups';
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doGet(getServerGroupURL, header)
        .then((serverGroups) => {
            callback(serverGroups);
        })
        .catch((err) => {
            logger.error('Error trying to get server groups, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Get all test policies in ASE
 */
ase.getTestPolicies = function (callback) {
    logger.debug('Getting all test policies in AppScan Enterprise...');
    let getTestPoliciesURL = '/testpolicies/all';
    let header = {
        Accept: 'application/xml',
        'Accept-Encoding': 'gzip, deflate'
    }

    aseapi.doGet(getTestPoliciesURL, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get test policies, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Updates a folder 
 * @param  {*} folderID - ID of folder trying to update
 * @param  {*} folderName - name of folder
 * @param  {*} description - description of folder
 * @param  {*} contact - userID of primary contact person/group for the folder
 */
ase.updateFolder = function (folderID, folderName, description, contact, callback) {
    logger.debug('Updating folder in AppScan Enterprise...');
    let updateFolderURL = '/folders/edit/' + folderID;
    let updateFolderBody = {
        folderName: folderName
    }
    if (description) {
        updateFolderBody.description = description;
    }
    if (contact) {
        updateFolderBody.contact = contact;
    }
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doPost(updateFolderURL, updateFolderBody, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to update folder in AppScan Enterprise, ' + err);
            if (global.emitErrors) util.emitError(err);
        })

}




/**
 * Create security permission for user
 * 
 * @param {*} userID - ID of the user to add the user security permissions
 * @param {*} serverGroupIDList - List of server group IDs seperated by commas (,)
 * @param {*} testPolicyID - Test Policy ID
 */
ase.createUserSecurityPermission = function (userID, serverGroupIDList, testPolicyID, callback) {
    logger.debug('Creating user security permissions in AppScan Enterprise...');
    let createUserSecurityPermissionURL = '/usersecuritypermission/create/' + userID;
    let createUserSecPerBody = {
        serverGroupIDList: serverGroupIDList,
        testPolicyId: testPolicyID
    }
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doPost(createUserSecurityPermissionURL, createUserSecPerBody, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to create user security permissions, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Deletes the users security permision
 * 
 * @param {*} userSecurityPermissionID - ID of the users security permission
 */
ase.deleteUserSecurityPermission = function (userSecurityPermissionID, callback) {
    logger.debug('DELETING user security permissions in AppScan Enterprise....');
    let deleteUserSecurityPermissionURL = '/usersecuritypermission/delete/' + userSecurityPermissionID;
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doDelete(deleteUserSecurityPermissionURL, null, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to delete user security permissions, ' + err);
        })
}



/**
 * Get folders in AppScan Enterprise
 */
ase.getFolders = function (callback) {
    logger.debug('Getting all folders in AppScan Enterprise...');
    let getFoldersURL = '/folders';

    aseapi.doGet(getFoldersURL)
        .then((folders) => {
            callback(folders);
        })
        .catch((err) => {
            logger.error('Error trying to get folders from AppScan Enterprise, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Create a folder 
 */
ase.createFolder = function (parentID, folderName, description, contact, callback) {
    logger.debug('Creating folder in AppScan Enterprise....');
    let createFolderURL = '/folders/create';
    let createFolderBody = {
        parentId: parentID,
        folderName: folderName.replace(/&/g, "")
    }
    if (description) {
        if (!description.includes('&', '#', ';')) {
            createFolderBody.description = description;
        } else {
            logger.error('Invalid characters sent in the description make sure no characters such as: #, $, ;, etc are included in description');
            return callback({ success: false, msg: 'Invalid characters sent in the description make sure no characters such as: #, $, ;, etc are included in description' });
        }
    }
    if (contact) {
        createFolderBody.contact = contact;
    }
    let header = {
        Accept: 'application/xml'
    }
    aseapi.doPost(createFolderURL, createFolderBody, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to create folder in AppScan Enterprise, ' + err);
            if (global.emitErrors) util.emitError(err);
        })

}


ase.deleteFolder = function (folderID, callback) {
    logger.debug('DELETING folder in ASE...');
    let deleteFolderURL = '/folders/delete/' + folderID;
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doDelete(deleteFolderURL, null, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to delete folder in AppScan Enterprise, ' + err);
        })
}



/**
 * Modify users roles of a folder
 * 
 * @param {*} userID - ID of the user to modify role for folder
 * @param {*} folderID - ID of folder being updated
 * @param {*} role - This is mandatory for ADD and EDIT operations.  The available roles are: issue_manager, job_administration, no_access, report_administration, report_consumer.
 * @param {*} action - action you would like to perform.  add : For addition of an user role; 
edit : To modify an user role; 
delete : To delete any user role
 */
ase.modifyFolderRole = function (userID, folderID, action, role, callback) {
    logger.debug('Updating role for folder in AppScan Enterprise...');
    // action must be one of the following or throw error
    if (action == 'add' || action == 'edit' || action == 'delete') {
    } else {
        logger.error('Error trying to modify foler role.  Incorrect action sent, must be add, edit, or delete.')
        return callback({ success: false, msg: 'Incorrect action sent, must be add, edit, or delete.' });
    }
    if (role == 'issue_manager' || role == 'job_administration' || role == 'no_access' || role == 'report_administration' || role == 'report_consumer') {
    } else {
        logger.error('Error trying to modify foler role.  Incorrect role sent, must be issue_manager, job_administration, no_access, report_administration, or report_consumer.')
        return callback({ success: false, msg: 'Incorrect role sent, must be issue_manager, job_administration, no_access, report_administration, or report_consumer.' });
    }

    let modifyFolderRoleURL;
    if (action == 'add' || action == 'edit') {
        modifyFolderRoleURL = '/folders/access/' + action + '/' + folderID + '/' + userID + '?role=' + folderRoleTypeID[role];
    } else {
        modifyFolderRoleURL = '/folders/access/' + action + '/' + folderID + '/' + userID;
    }
    let modifyFolderRoleBody = {
        action: action,
        folderId: folderID,
        userId: userID
    }
    let header = {
        Accept: 'application/xml'
    }

    aseapi.doPost(modifyFolderRoleURL, modifyFolderRoleBody, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to modify folder role, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Gets the list of DAST jobs in a folder
 * 
 * @param {*} folderID - ID of folder to check for DAST jobs
 */
ase.getListOfDASTJobs = function (folderID, callback) {
    logger.debug('Getting list of DAST jobs in folder in ASE...');
    let getDASTJobsURL = '/folders/' + folderID + '/jobs';

    aseapi.doGet(getDASTJobsURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get list of DAST jobs in folder, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Create content scan job in specific folder
 * @param {*} folderId - folderId where job will be created
 * @param {*} appId - id of app job will be associated with
 * @param {*} templateId - template scan job will be created from
 */
ase.createConentScanJob = function (folderId, appId, templateId, scanName, callback) {
    logger.debug('Creating content scan job...');
    //TODO validate scanName
    let postFolderIdURL = '/folders/' + parseInt(folderId,10).toString() + '/folderitems' 
                        + '?templateId=' + parseInt(templateId,10).toString() 
                        + '&appId=' + parseInt(appId,10).toString()

    let jobBody = {
        "name": scanName,
        "description": "",
        "payLoad": ""
        }

    let header = {
        "Accept": 'application/xml'
    }

    aseapi.doPost(postFolderIdURL, jobBody, header)
        .then((jobinfo) => {
            callback(jobinfo);
        })
        .catch((err) => {
            logger.error('Error trying to create content scan job, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Update content scan job starting url
 * @param {*} folderItemId - folderItemId of content scan job to update
 * @param {*} startingUrl - starting url to add to content scan job
 */
ase.updateConentScanJobStartingURL = function (folderItemId, startingUrl, callback) {
  
    // post /folderitems/{folderItemId}/options/{option} 
    let option = 'epcsCOTListOfStartingUrls';
    let postUpdateURL = '/folderitems/' + parseInt(folderItemId,10).toString() 
                      + '/options/'+ option
                      + '?perform=put=1'

    //TODOvalidate url                    
    let body = {
        "value": startingUrl
        }

    let header = {
        "Accept": 'application/xml'
    }

    aseapi.doPost(postUpdateURL, body, header)
        .then((jobinfo) => {
            callback(jobinfo);
        })
        .catch((err) => {
            logger.error('Error trying to create content scan job, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Update content scan job with recorded login data 
 * @param {*} jobId - folder item id of content scan job to update
 * @param {*} action - The traffic actions available are as follows:
    Traffic action 'add' - Adds the new traffic to the job.
    Traffic action 'del' - Removes existing login data 
   @param {*} format - har or dast  
   @param {*} fileLoc - location of the traffic file  
 */
ase.updateContentScanJobLogin = function (jobId, action, format, fileLoc, callback) {
    let actionstr = '';
    if (action === 'add') {actionstr = '?Put=1'};
    if (action === 'del') {actionstr = '?delete=1'};

    if (format !== 'har' && format !== 'dast') {
        format = '';
    }
    
    let updateContentJobLoginURL = '/folderitems/' + parseInt(jobId,10).toString() + '/recordedlogindata'
                          + actionstr + '&Format=' + format;
    console.log(updateContentJobLoginURL);

    aseapi.doUploadContentJobTraffic(updateContentJobLoginURL, fileLoc)
        .then((data) => {
            console.log(data);
            if (data.statusCode == 200) {
                callback({
                    success: true,
                    msg: data
                })
            } else {
                callback({
                    success: false,
                    msg: 'Error trying to update job, ' + data.errorMessage                    
                })
            }
        })
        .catch((err) => {
            logger.error('Error trying to update job,' + JSON.stringify(err));
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Update content scan job with ME data 
 * @param {*} jobId - folder item id of content scan job to update
 * @param {*} action - The traffic actions available are as follows:
    Traffic action 'add' - Adds the new traffic to the job.
    Traffic action 'del' - Removes existing login data 
   @param {*} format - har or dast  
   @param {*} fileLoc - location of the traffic file  
 */
ase.updateContentScanJobExplore = function (jobId, action, format, fileLoc, callback) {
    let actionstr = '';
    if (action === 'add') {actionstr = '?Put=1'};
    if (action === 'del') {actionstr = '?delete=1'};

    if (format !== 'har' && format !== 'dast') {
        format = '';
    }
    
   // /ase/api/folderitems/198/httptrafficdata?put=1&format=dast&includeformfills=1
    let updateContentJobTrafficURL = '/folderitems/' + parseInt(jobId,10).toString() + '/httptrafficdata'
                          + actionstr + '&Format=' + format +'&includeformfills=1';
    console.log(updateContentJobTrafficURL);

    aseapi.doUploadContentJobTraffic(updateContentJobTrafficURL, fileLoc)
        .then((data) => {
            console.log(data);
            if (data.statusCode == 200) {
                callback({
                    success: true,
                    msg: data
                })
            } else {
                callback({
                    success: false,
                    msg: 'Error trying to update job, ' + data.errorMessage                    
                })
            }
        })
        .catch((err) => {
            logger.error('Error trying to update job,' + JSON.stringify(err));
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Update folder item status 
 * @param {*} folderItemId - folderItemId of content scan job to update
 * @param {*} action - starting url to add to content scan job
 */
ase.updateFolderItemStatus = function (folderItemId, action, callback) {
    let postUpdateURL = '/folderitems/' + parseInt(folderItemId,10).toString() 
    let actionvalue = null;
    switch (action) {
        case "run":
            actionvalue = 2;
            break;
        case "end":
            actionvalue = 5;
            break;
        default:
            logger.error('Invalid action');
            return;
    }
           
    let body = actionvalue;
        
    console.log('actionvalue is  ' + actionvalue);

    console.log('body is ' + JSON.stringify(body));

    let header = {
        "Accept": 'application/xml'
    }

    aseapi.doPost(postUpdateURL, body, header)
        .then((jobinfo) => {
            callback(jobinfo);
        })
        .catch((err) => {
            logger.error('Error trying to update folderitem status, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}

/**
 * Gets details about a DAST job
 * 
 * @param {*} jobID - the ID of the DAST job
 */
ase.getDASTJobDetails = function (jobID, callback) {
    logger.debug('Getting details of DAST job in ASE...');
    let getDASTJobDetailsURL = '/jobs/' + jobID;

    aseapi.doGet(getDASTJobDetailsURL)
        .then((data) => {
            callback(data.body, data);
        })
        .catch((err) => {
            logger.error('Error trying to get details of DAST job, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}



/**
 * Gets the scan stats of a DAST job
 * 
 * @param {*} folderItemID - folder Item ID of a specfic DAST scan job
 */
ase.getDASTScanStatistics = function (folderItemID, callback) {
    logger.debug('Getting statistics of DAST scan job in ASE...');
   // let getDASTScanStatisticsURL = '/folderitems/' + folderItemID + '/statistics/xml';
    let getDASTScanStatisticsURL = '/folderitems/' + folderItemID + '/statistics';

    let header = {
        Accept: 'application/xml',
        json: false
    }

    aseapi.doGet(getDASTScanStatisticsURL, header)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get statistics of DAST scan job, ' + err);
            if (err.message.includes('RangeError')) logger.error('Range error:\n' + err.stack);

            if (global.emitErrors) util.emitError(err);
            callback(null);
        })
}







/**
 * Stop a scan
 * @param {*} activityId 
 * @param {*} action
 * Suspend (Action=3), Discard Results and Stop (Action=4), Save Current Results and Stop (Action=5)
 */

//TODO: This function does not work yet!!
ase.stopScan = function (activityID, action, callback) {
    let appAccessType;
    logger.debug('Stopping scan for activityID: ' + activityID + ' in ASE...');
    if (!activityID) {
        logger.info('valid activityID required');
        return;
    }

    if (action == 3) {
        logger.info('Suspend');
    }
    else if (action == 4) {
        logger.info('Discard Results and Stop');
    }
    else if (action == 5) {
        logger.info('Save Current Results and Stop');
    } else {
        logger.info('valid action required (3, 4, or 5)');
        return;
    }

    let updateActionURL = '/scansmanagement/' + activityID;
    let updateActionBody = {
        activityId: activityID,
        action: action
    }

    aseapi.doPut(updateActionURL, updateActionBody)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to modify scan action in AppScan Enterprise.  Error: ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Update a job scant in ASE
 * Does not work for a Content Scan Job!!
 * @param {*} jobId 
 * @param {*} etag 
 * @param {*} callback 
 */
ase.updateJobScant = function (jobId, startingUrl, loginUsername, loginPassword, callback) {
    logger.info('Updating job scant...');
    let updateJobUrl = '/jobs/' + jobId + '/dastconfig/updatescant';
    var updateJobBody = [];
    var index = 0;
    // This API call was only returning data = undefined on both success and failure so no error handling 


    var updateJob = function (updateJobUrl, updateJobBody, callback) {
        // if the API can return a response as data modify the below code to handle it
        aseapi.doPost(updateJobUrl, updateJobBody)
            .then((data) => {
                logger.verbose('RESPONSE: ' + JSON.stringify(data));
                // TODO: data seems to always be undefined - is this API call broken??
                callback({
                    success: true,
                    msg: data
                })

                if (data.errorMessage) {
                    logger.error('Error trying to update job scant, ' + data.errorMessage);
                    callback({
                        success: false,
                        msg: data.errorMessage
                    })
                } else {
                    callback({
                        success: true,
                        msg: data
                    })
                }
            })
            .catch((err) => {
                // This was being executed even though request was successful
                // TODO Need to make sure actual errors get caught 
                if (!(Object.entries(err).length === 0)) { // checking if object is empty
                    logger.error('Error trying to update job scant,' + JSON.stringify(err));
                    if (global.emitErrors) util.emitError(err);
                }
                return;
            })
    }
    if (startingUrl) {
        logger.info(startingUrl);
        updateJobBody.push({
            scantNodeXpath: "StartingUrl",
            scantNodeNewValue: startingUrl
        })

    }

    if (loginUsername || loginPassword) {
        logger.info('Login Method');
        updateJobBody.push({
            scantNodeXpath: "LoginMethod",
            scantNodeNewValue: "Automatic"
        })
    }

    if (loginUsername) {
        logger.info('Login Username');
        updateJobBody.push({
            scantNodeXpath: "LoginUsername",
            scantNodeNewValue: loginUsername
        })

    }
    if (loginPassword) {
        logger.info('Login Password');
        updateJobBody.push({
            scantNodeXpath: "LoginPassword",
            scantNodeNewValue: loginPassword
        })

    }
    var count = function () {
        index++;
        run();
    }
    var run = function () {
        if (index < updateJobBody.length) {
            updateJob(updateJobUrl, updateJobBody[index], () => {
                count();
            })
        }
    }
    run();

}


/**
 * Generate Security Report
 */
ase.appSecurityReport = function (appId, fileFormat, minSeverity, fullJson, callback) {

    var results = {};

    if (!appId) {
        logger.error('You must provide an application Id');
        return;
    }

    if (fileFormat != 'PDF' && fileFormat != 'HTML' && fileFormat != 'XML' && fileFormat != 'XLS') {
        logger.error('You must provide a file format from the following choices: PDF/HTML/XML/XLS');
        return;
    }

    var severity = [];

    if (minSeverity == 'critical') {
        severity.push("severity=critical");
    }

    if (minSeverity == 'high') {
        //severity.push("severity=critical");
        severity.push("severity=high");
    }

    if (minSeverity == 'medium') {
        severity.push("severity=critical");
        severity.push("severity=high");
        severity.push("severity=medium");

    }
    if (minSeverity == 'low') {
        severity.push("severity=critical");
        severity.push("severity=high");
        severity.push("severity=medium");
        severity.push("severity=high");
    }
    if (severity.length == 0) {
        severity.push("severity=critical");
        severity.push("severity=high");
        severity.push("severity=medium");
        severity.push("severity=high");
        severity.push("severity=information");
    }


    // https://appscanvm:9443/ase/api/pages/apidocs.html#!/issues/generateSecurityReport
    let createReportURL = '/issues/reports/securitydetails?appId=' + appId;
    let createReportBody = {
        reportFileType: fileFormat,
        issueIdsAndQueries: severity
    };

    if (fullJson) {
        createReportBody = fullJson;
    }

    aseapi.doPost(createReportURL, createReportBody)
        .then((data) => {

            //console.log('--------------------');
            //console.log(JSON.stringify(createReportBody));
            //console.log('--------------------');
            //console.log('RESP: ' + JSON.stringify(data))
            results.responseCode = (data.req.res.statusCode);

            if (data.caseless.dict.location) {
                results.location = (data.caseless.dict.location);
                results.success = true;
            }
            else {
                results.success = false;
                results.message = 'Security report was not generated, Reponse code: ' + results.responseCode
            }

            callback(results);
            return;

        })
        .catch((err) => {
            logger.error('Error trying to generate Application Security Report from AppScan Enterprise.  Error: ' + err.stack);
            if (global.emitErrors) util.emitError(err);
        })
}


/**
 * Gets security Report Status
 * (If it has already generated or not)
 * 
 * @param {*} folderItemID - folder Item ID of a specfic DAST scan job
 */
ase.getReportStatus = function (reportID, callback) {
    logger.debug('Checking if report is ready yet...');
    let getReportStatusURL = '/issues/reports/' + reportID + '/status';
    let header = {
        Accept: 'application/json'
    }

    aseapi.doGet(getReportStatusURL, header)
        .then((data) => {
            callback(data);
            return;
        })
        .catch((err) => {
            logger.error('Error trying to get status of Security Report, ' + err);
            if (global.emitErrors) util.emitError(err);
            // callback(null);
        })
}


/**
 * Get security Report
 * 
 * 
 * @param {*} folderItemID - folder Item ID of a specfic DAST scan job
 */

ase.getReport = function (reportId, targetSubDir, callback) {
    logger.debug('Downloading report...');
    let getReportURL = '/issues/reports/' + reportId;
    /*
    let header = {
        Accept: 'application/octet-stream'
    }
    */
    aseapi.doDownload(getReportURL, targetSubDir)
        .then((data) => {

            if (data.success) {
                callback({
                    success: true,
                    location: data.location
                })
            } else {
                logger.error('Error trying to download report from AppScan Enterprise, ' + data.msg);
                callback({
                    success: false,
                    msg: data.msg
                })
            }
        })
        .catch((err) => {
            logger.error('Error trying to download report, ' + JSON.stringify(err));
        })
}






/**
 * Returns issue information of application
 * 
 * @param {*} issueID - (required) ID of issue which belongs to the given app * 
 * @param {*} appID - (required) ID of application that you want to get the issue information of
 */

ase.getApplicationIssueInfo = function (issueID, appID, callback) {
    logger.debug('Getting issue information of application...');
    let getAppIssueInfoURL = '/issues/' + issueID + '/application/' + appID;


    aseapi.doGet(getAppIssueInfoURL)
        .then((data) => {
            callback(data);
        })
        .catch((err) => {
            logger.error('Error trying to get issue information of application, ' + err);
            if (global.emitErrors) util.emitError(err);
        })
}









/**
 * Helper functions
 * Adapted from Stackoverflow: https://stackoverflow.com/questions/6040515/how-do-i-get-month-and-date-of-javascript-in-2-digit-format
 */

function formatDateToString() {
    // 01, 02, 03, ... 29, 30, 31
    var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();
    // 01, 02, 03, ... 10, 11, 12
    var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
    // 1970, 1971, ... 2015, 2016, ...
    var yyyy = date.getFullYear();
    var hh = (date.getHours() < 10 ? '0' : '') + date.getHours();
    var mm = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    var ss = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();

    // create the format you want
    return (yyyy + '-' + MM + '-' + dd + ' ' + hh + ':' + mm + ':' + ss);
}



