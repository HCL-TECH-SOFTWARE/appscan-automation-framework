/**
 * This module automatically manages what access users have access to for both IBM AppScan Enterprise and IBM Application 
 * security on Cloud.
 */

var through2 = require('through2');
var split2 = require('split2');
var fs = require('fs');
var logger = require('../config/logger');
var config = require('../config/config');
var async = require('async');
var ase = require('./providers/ase');
var asoc = require('./providers/asoc');
const he = require('he');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
const util = require('./util');
const domain = require('domain'); //TODO: This is deprecated

var locOfCSV = null;
var appAddedCount = 0;
const addUserAccessToASE = config.addUserAccessToASE;
const addUserAccessToASoC = config.addUserAccessToASoC;
const defaultASEUserAccessType = config.defaultASEUserAccessType;



// Check if location of the CSV is passed in arguments
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-l') {
        locOfCSV = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        return console.log('-l location of the csv');
    }
}









const doesAppExist = function (appName, platform, callback) {
    let doesAppExist = false;
    let appData = null;

    if (platform == 'ASOC') {
        asoc.getApplications((allApps) => {
            for (app in allApps) {

                if (allApps[app].Name == appName) {
                    doesAppExist = true;
                    appData = allApps[app];
                }
            }
            callback(doesAppExist, appData);
        })
    }

    else if (platform == 'ASE') {
        ase.getApp((allApps) => {
//            for (app in allApps) {
            for (var i=0; i < allApps.body.length; i++) {

//                if (allApps[app].name == appName) {
                if (allApps.body[i].name == appName) {
                    logger.debug('Application: ' + appName + ' Exists in ASE...')
                    doesAppExist = true;
//                    appData = allApps[app];
                    appData = allApps.body[i];
                }
            }
            callback(doesAppExist, appData);
        })
    } else {
        logger.error('useraccessmanager - error checking if application exists.  ERROR: wrong platform parameters sent.')
        if (global.emitErrors) util.emitError('useraccessmanager - error checking if application exists.  ERROR: wrong platform parameters sent.');
        //callback('Wrong parameter sent for platform');
    }
}


// TODO: ADD - if server group exists then update - should be taken care of in application loader and not in this module
const assignUserServerGroups = function (userID, serverGroupName, domain, domainType, testPolicyName, platform, callback) {
    if (platform == 'ASE') {
        let doesServerGroupExist = false;
        let serverGroupInfo;
        ase.getServerGroups((data) => {
            parser.parseString(data.body, function (err, result) {
                let serverGroups = result['server-groups']['server-group']
                for (let s in serverGroups) {
                    if (serverGroups[s]['$'].name == serverGroupName) {
                        doesServerGroupExist = true;
                        serverGroupInfo = serverGroups[s]['$'];
                    }
                }

                // get test policies
                ase.getTestPolicies((testPolicies) => {
                    let testPolicyIDArray = [];
                    parser.parseString(testPolicies.body, function (err, result) {
                        let testPoliciesArray = result['testpolicies']['testpolicy']
                        // Check if multiple test policy name
                        let multipleTestPolicyCheck = testPolicyName.split(';');

                        if (multipleTestPolicyCheck.length > 1) {
                            // multiple test policies so multiple entries
                            for (let p in multipleTestPolicyCheck) {
                                for (let tp in testPoliciesArray) {
                                    if (result['testpolicies']['testpolicy'][tp]['$'].name == multipleTestPolicyCheck[p]) {
                                        testPolicyIDArray.push(result['testpolicies']['testpolicy'][tp]['$'].id);
                                    }
                                }
                            }
                        } else {
                            for (let tp in testPoliciesArray) {
                                if (result['testpolicies']['testpolicy'][tp]['$'].name == testPolicyName) {
                                    testPolicyIDArray.push(result['testpolicies']['testpolicy'][tp]['$'].id);
                                }
                            }
                        }
                        if (doesServerGroupExist) {
                            // assign user to server group
                            for (let testPolicy in testPolicyIDArray) {
                                ase.createUserSecurityPermission(userID, serverGroupInfo.id, testPolicyIDArray[testPolicy], (data) => {
                                })
                            }
                            callback();
                        } else {
                            // server group does not exist create it
                            ase.createServerGroup(serverGroupName, domain, domainType, (serverGroup) => {
                                // assign user to server group
                                parser.parseString(data.body, function (err, result) {
                                    let serverGroupID = result['server-groups']['server-group'][0]['$'].id;
                                    // assign user to server group
                                    for (let testPolicy in testPolicyIDArray) {
                                        ase.createUserSecurityPermission(userID, serverGroupID, testPolicyIDArray[testPolicy], () => {
                                        })
                                    }
                                    callback();
                                })
                            })
                        }

                    })
                })
            })
        })
    } else {
        callback();
    }
}


const getUserTypeID = function (userType, platform, callback) {
    if (platform == 'ASE') {
        ase.getUserTypes((userTypes) => {
            let id = null;
            for (type in userTypes.body) {
                let userTypeName = he.decode(userTypes.body[type].name);
                if (userTypeName == userType) {
                    id = userTypes.body[type].id;
                }
            }
            if (id) {
                callback(id);
            } else {
                logger.error('User Type name, ' + userType + ', is incorrect please enter the correct type...');
                if (global.emitErrors) util.emitError('User Type name, ' + userType + ', is incorrect please enter the correct type...');
            }
        })
    }
}


const createUser = function (fullName, userName, email, userType, platform, callback) {
    if (platform == 'ASOC') {
        logger.error('Creating user is not supported in ASoC yet...');
        if (global.emitErrors) util.emitError('Creating user is not supported in ASoC yet...');
    }

    if (platform == 'ASE') {
        getUserTypeID(userType, platform, (id) => {
            ase.createUser(fullName, userName, email, id, (user) => {
                callback(user)
            })
        })
    }
}



const getUserID = function (userName, fullName, email, userType, platform, callback) {
    if (platform == 'ASOC') {
        let ASOCfoundUser = false;
        let ASOCuserID;
        asoc.getAllUsers((users) => {
            //logger.debug('Users: ' + JSON.stringify(users))
            for (let user in users) {
                //console.log('USER: ' + JSON.stringify(users[user]));
                if (users[user].UserName == userName) {
                    ASOCfoundUser = true;
                    ASOCuserID = users[user];
                }
            }
            if (ASOCfoundUser) {
                callback(ASOCuserID);
            } else {
                // User does not exist so create it
                logger.error('ERROR User name: ' + userName + ' does not exist in application security on cloud...');
                callback(null);
            }
        })
    }

    if (platform == 'ASE') {
        let ASEfoundUser = false;
        let ASEuserID;
        ase.getAllUsers((users) => {
            //logger.debug('Users: ' + JSON.stringify(users))
            for (let user in users.body) {
                //console.log('USER: ' +  JSON.stringify(users[user]));
//                if (users.body[user].userName == userName) {
                if (users.body[user].userName.toLowerCase() == userName) {
                    ASEfoundUser = true;
                    ASEuserID = users.body[user].userId;
                }
            }
            if (ASEfoundUser) {
                callback(ASEuserID);
            } else {
                // User does not exist so create it
                logger.error('User name: ' + userName + ' does not exist on AppScan Enterprise...');
                createUser(fullName, userName, email, userType, platform, (user) => {
                    // assign user server groups
                    callback(user.userId);
                })
            }
        })
    }
}

// TODO:  add logic to update folder access.  Maybe delete access?
const addUserToFolder = function (userID, folderName, folderRole, callback) {
    let folderMotsID = folderName.split('-')[0];
    logger.debug('FOLDER ROLE: ' + folderRole);
    let folderID = null;
    // Get folderID
    ase.getFolders((folders) => {
        for (let f in folders.body) {
            //logger.error('Folder: ' + folders[f].folderName);
            if (folders.body[f].folderName == folderName) {
                folderID = folders.body[f].folderId
            }
        }
        if (folderID) {
            // take folderID and add role for user
            ase.modifyFolderRole(userID, folderID, 'add', folderRole, (modifiedFolder) => {
//                parser.parseString(modifiedFolder, function (err, result) {
                parser.parseString(modifiedFolder.body, function (err, result) {
                    if (result.folder.name) {
                        logger.debug('Successfully updated folder role for folder: ' + result.folder.name);
                        callback();
                    } else {
                        logger.error('Error trying to add folder role for userID: ' + userID);
                        if (global.emitErrors) util.emitError(err);
                    }
                })
            })
        } else {
            logger.error('Error trying to add user to folder.  Folder name, ' + folderName + ', does not exist.');
            if (global.emitErrors) util.emitError('Error trying to add user to folder.  Folder name, ' + folderName + ', does not exist.');
        }
    })
}

const doesUserExistInAppAccessControl = function (userID, appID, callback) {
    let doesUserExist = false;
    ase.getApplicationAccessControl(appID, (usersAccessList) => {
        for (user in usersAccessList.body) {
            if (usersAccessList.body[user].userId == userID) {
                doesUserExist = true;
            }
        }
        callback(doesUserExist);
    })
}

const removeASEUserAccessToOtherApps = function (userID, appList, callback) {
    let appsNotToRemoveAccessArray = [];
    for (aseApp in appList) {
        appsNotToRemoveAccessArray.push(appList[aseApp].id);
    }
    ase.getApp((allApps) => {
        //allApps.forEach((app, index, array) => {
        async.forEach(allApps.body, (app, index, array) => {
            let appName = app;
            if (appsNotToRemoveAccessArray.indexOf(app.id) > -1) {

            } else {
                // not contained in array so user should not have access
                ase.updateApplicationAccessControl(app.id, userID, 'NONE', (updatedAccess) => {

                })
            }
            // if (index === array.length - 1) {
            //     callback();
            // }
        })
        callback();
    })
}

// get appID and userID
// update app
const updateAccessForApp = function (userID, appData, folderRole, platform, callback) {
    let assetGroupNameArray = [];
    // Get all asset group names needed for access
    for (app in appData) {
        assetGroupNameArray.push(appData[app].AssetGroupName);
    }
    if (platform == 'ASOC') {
        logger.debug('Asset group to be added: ' + assetGroupNameArray + ' for user: ' + userID.UserName);
        // Get asset group id 
        // Get asset group name from app
        // get asset group id from name
        asoc.getAllAssetgroup((assetGroups) => {
            let assetGroupAccessArray = [];
            for (assetGroup in assetGroups.body) {
                if (assetGroupNameArray.indexOf(assetGroups.body[assetGroup].Name) > -1) {
                    assetGroupAccessArray.push(assetGroups.body[assetGroup].Id);
                }
            }
            asoc.updateUser(userID.Id, assetGroupAccessArray, userID.RoleId, (data) => {
                logger.info('Successfully updated user, ' + userID.UserName + ', application permissions...');
                callback();
            })
        })
    }
    if (platform == 'ASE') {
        logger.debug('Asset group to be added: ' + assetGroupNameArray + ' for user: ' + userID);
        // Check if user already has a access control entry if not create it else update it

        var iterateApps = new Promise((resolve, reject) => {
            appData.forEach((app, index, array) => {
                let appName = app;
                doesUserExistInAppAccessControl(userID, appName.id, (doesUserExistInApp) => {
                    if (doesUserExistInApp) {
                        // update access control entry
                        ase.updateApplicationAccessControl(appName.id, userID, defaultASEUserAccessType, (updatedAccess) => {
                            addUserToFolder(userID, appName.name, folderRole, () => {
                                // Add user to folder
                                // Should only be called on the last element to prevent this from running multiple times
                                if (index === array.length - 1) {
                                    removeASEUserAccessToOtherApps(userID, appData, () => {
                                        complete(index, array);
                                    })
                                }
                            })
                        })
                    } else {
                        // create new access control entry
                        ase.createAccessControlEntry(appName.id, userID, (updatedAccess) => {
                            addUserToFolder(userID, appName.name, folderRole, () => {
                                // Should only be called on the last element to prevent this from running multiple times
                                if (index === array.length - 1) {
                                    removeASEUserAccessToOtherApps(userID, appData, () => {
                                        complete(index, array);
                                    })
                                }
                            }, defaultASEUserAccessType)
                        })
                    }
                    var complete = function (index, array) {
                        if (index === array.length - 1) {
                            logger.info('Successfully updated user, ' + userID + ', application permissions...');
                            resolve();
                        }
                    }
                })
            })
        })

        iterateApps.then(() => {
            callback();
        })
    }
}





const buildAppListForAccess = function (appDataJSON, platform, callback) {
    let appsToAccessArray = [];
    logger.verbose('Building app list.  List of Apps: ' + JSON.stringify(appDataJSON.apps));

    var iterateApps = new Promise((resolve, reject) => {
        appDataJSON.apps.forEach((app, index, array) => {
            let appName = app;
            // Check if app exists
            doesAppExist(appName, platform, (doesAppExist, appData) => {
                if (doesAppExist) {
                    if (appData) {
                        appsToAccessArray.push(appData);
                        // When building array completes check when array is complete by having same number of apps 
                        if (appDataJSON.apps.length == appsToAccessArray.length) resolve();
                    }
                } else {
                    // If does not exist log out error
                    logger.error('Trying to add application, ' + appName + ' that does not exist, so skipping...');
                    if (global.emitErrors) util.emitError('Trying to add application, ' + appName + ' that does not exist, so skipping...');
                }
            })
        })
    })

    iterateApps.then(() => {
        callback(appsToAccessArray);
    })
}

const updateUserInfo = function (platform, userID, fullName, email, userType, callback) {
    if (platform == 'ASE') {
        ase.updateUser(userID, fullName, email, userType, () => {
            callback();
        })
    }
}





/**
 * 
 * @param {*} appDataJSON JSON object with app data
 * @param {*} platform which platform this app is associated with (EX: ASOC or ASE)
 * 
 * This takes in the JSON app data object and creates a new application in ASoC
 */
const addUserToApp = function (appDataJSON, platform, callback) {
    logger.debug('Adding access to user: ' + appDataJSON.user);
    getUserID(appDataJSON.user, appDataJSON.fullName, appDataJSON.email, appDataJSON.userType, platform, (userID) => {
        logger.debug('JSON: ' + JSON.stringify(appDataJSON))

        // When userID is not null.  If userId is null then user does not exist and skip
        if (userID) {
            // get user type ID to update user
            getUserTypeID(appDataJSON.userType, platform, (id) => {
                // update user
                updateUserInfo(platform, userID, appDataJSON.fullName, appDataJSON.email, id, (result) => {

                    // assign server groups for ASE
                    assignUserServerGroups(userID, appDataJSON.serverGroupName, appDataJSON.domain, appDataJSON.domainType, appDataJSON.testPolicy, platform, () => {
                        buildAppListForAccess(appDataJSON, platform, (appsToAccessArray) => {
                            //logger.verbose('Going into update Access For App.  List: ' + JSON.stringify(appsToAccessArray))
                            updateAccessForApp(userID, appsToAccessArray, appDataJSON.folderRole, platform, (result) => {
                                callback();
                            })
                        })
                    })
                })
            })
        } else {
            callback();
        }
    })
}


module.exports = processRecord = () => {
    return through2.obj(function (data, enc, cb) {

        let dom = domain.create();
        dom.on('error', err => {
            cb(err);
        });

        dom.run(function () {
            logger.verbose('CSV DATA: ' + JSON.stringify(data))

            // const parseCSV = () => {
            //     let templateKeys = []
            //     let parseHeadline = true
            //     return through2.obj((data, enc, cb) => {
            //         //logger.verbose('DATA: ' +  JSON.stringify(data))
            //         if (parseHeadline) {
            //             templateKeys = [data
            //                 .toString()]
            //             //.split('<')
            //             parseHeadline = false
            //             return cb(null, null)
            //         }
            //         const entries = [data
            //             .toString()]
            //         //.split('<')
            //         const obj = {}
            //         templateKeys.forEach((el, index) => {
            //             obj[el] = entries[index]
            //         })
            //         return cb(null, obj)
            //     })
            // }




            // const processRecord = () => {
            //     return through2.obj(function (data, enc, cb) {
            for (t in data) {
                console.log('------------------')
                let key = t.split(',');
                let value = data[t].split(',');
                let appArray = [];
                // push apps into array
                for (apps in value) {
                    // Last item in CSV is the list of apps
                    if (apps == value.length-1) {
                        value[apps] = value[apps].trim().replace(/"/g, "")//.toLowerCase()
                        appArray.push(value[apps]);
                    }
                }
                // Build appDataJSON
                let appDataJSON = {}
                for (item in key) {
                    // console.log('Key: ' + key[item]);
                    // console.log('Value: ' + value[item]);
                    let parsedKey = key[item].replace(/\s/g, '').replace(/"/g, "").toLowerCase();

                    if (parsedKey == 'user') {
                        let parsedValue = value[item].replace(/\s/g, '').replace(/"/g, "").toLowerCase();
                        appDataJSON.user = parsedValue;
                    }

                    if (parsedKey == 'folder_role') {
                        appDataJSON.folderRole = value[item];
                    }

                    if (parsedKey == 'application') {
                        appDataJSON.apps = appArray;
                    }

                    if (parsedKey == 'full_name') {
                        appDataJSON.fullName = value[item];
                    }

                    if (parsedKey == 'email') {
                        let parsedValue = value[item].replace(/\s/g, '').replace(/"/g, "").toLowerCase();
                        appDataJSON.email = parsedValue;
                    }

                    if (parsedKey == 'user_type') {
                        appDataJSON.userType = value[item].replace(/"/g, "");
                    }

                    if (parsedKey == 'server_group') {
                        appDataJSON.serverGroupName = value[item];
                    }
                    if (parsedKey == 'applicationacronym') {
                        // Rename server group to ba the app name
                        if (!appDataJSON.serverGroupName) {
                            for (let app in appArray) {
                                //serverGroupArray.push(appArray[0] + '-' + value[item]);
                            }
                            appDataJSON.serverGroupName = appArray[0] + '-' + value[item];
                        }
                    }
                    if (parsedKey == 'domain') {
                        appDataJSON.domain = value[item];
                    }

                    if (parsedKey == 'domain_type') {
                        appDataJSON.domainType = value[item];
                    }

                    if (parsedKey == 'test_policy') {
                        appDataJSON.testPolicy = value[item];
                    }
                }

                // Add application to ASE
                async.parallel({
                    ase: function (callback) {
                        if (addUserAccessToASE) {
                            addUserToApp(appDataJSON, 'ASE', () => {
                                logger.verbose('ASE completed!')
                                callback();
                            });
                        } else {
                            logger.info('Not adding user access to AppScan Enterprise because addUserAccessToASE set to false.');
                            callback();
                        }
                    },
                    asoc: function (callback) {
                        if (addUserAccessToASoC) {
                            addUserToApp(appDataJSON, 'ASOC', () => {
                                logger.verbose('ASoC Completed!')
                                callback();
                            })
                        } else {
                            logger.info('Not adding user access to application security on cloud because addUserAccessToASoC set to false.');
                            callback();
                        }
                    }
                }, (err, results) => {
                    logger.debug('Both function completed!');
                    appAddedCount++;
                    logger.info('Updated ' + appAddedCount + ' users!');
                    setTimeout
                    cb();
                })

            }
        });
    })
}

if (process.argv[1].endsWith('userAccessManager.js')) { //Script invoked directly

    if (locOfCSV === null || locOfCSV === undefined) {
        return console.log('Please enter location of csv -l')
    }

    // adapted from Stackoverflow: https://stackoverflow.com/questions/16010915/parsing-huge-logfiles-in-node-js-read-in-line-by-line/16013228
    fs.createReadStream(locOfCSV)
        // Read line by line
        .pipe(split2())
        // Parse CSV line
        .pipe(util.parseCSV())
        // Process your Records
        .pipe(processRecord())
}