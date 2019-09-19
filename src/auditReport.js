/**
 * This creates an audit report in csv format for ASoC and ASE.
 * Informaion in report: 
 * - Platform Name - ASoC or ASE
 * - Level of access (Ex: Administrator, application manager, etc)
 * - Active with users
 * - Allows ID Maintenance (can edit the rules of the policy)
 * - Business Description/Profile User Job function
 */

// Dependecies
const config = require('../config/config');
const logger = require('../config/logger');
var ase = require('./providers/ase');
var asoc = require('./providers/asoc');
var fs = require('fs');
var async = require('async');
const he = require('he');
const Json2csvParser = require('json2csv').Parser;
const lineReplace = require('line-replace');



// Global variables
const doASEAuditReport = config.ASE_Audit_Report;
const doASoCAuditReport = config.ASoC_Audit_Report;
const doUsersReport = config.Users_Audit_Report;
const doUserProfileReport = config.User_Profiles_Audit_Report;
const doUserProfileWithTypeReport = config.User_Profiles_With_Type_Audit_Report;
const profilesFields = ['PROFILE_NAME', 'SECURITY_SETTINGS'];
const usersReportFields = ['CUID', 'AWID', 'APPLICATIONUSERID', 'FIRST_NAME', 'MIDDLE_INITIAL', 'LAST_NAME', 'LAST_LOGON_DATE', 'ACCOUNT_ACTIVATION_DATE', 'LAST_DATE_ACCOUNT_MODIFIED', 'LAST_PASSWORD_CHANGE_DATE', 'FULL_USER_NAME', 'NT_ID', 'EMAIL'];
const usersProfileWithTypeReportField = ['CUID', 'AWID', 'APPLICATIONUSERID', 'PROFILE_NAME'];
var predefinedASEUserTypes = ['No Access', 'QuickScan User', 'Standard User', 'Administrator'];
var ASEprofilesAuditDataJSON = [];
var ASEusersAuditDataJSON = [];
var ASEuserProfileWithTypeAuditDataJSON = [];
var ASoCprofilesAuditDataJSON = [];
var ASoCusersAuditDataJSON = [];
var ASoCuserProfileWithTypeAuditDataJSON = [];
var ASoCUserRoleIDArray = [];
var ASEUserRoleIDArray = [];
var date = new Date();
const ASOCuserAuditFileName = 'ASE-Cloud_user_' + formatDateToString(date) + '.txt';
const ASOCuserProfileAuditFileName = 'ASE-Cloud_profile_' + formatDateToString(date) + '.txt';
const ASOCuserProfileWithTypeAuditFileName = 'ASE-Cloud_userprofiles_' + formatDateToString(date) + '.txt';
const ASEuserAuditFileName = 'ASE-Enterprise_user_' + formatDateToString(date) + '.txt';
const ASEuserProfileAuditFileName = 'ASE-Enterprise_profile_' + formatDateToString(date) + '.txt';
const ASEuserProfileWithTypeAuditFileName = 'ASE-Enterprise_userprofiles_' + formatDateToString(date) + '.txt';
const newLine = '\r\n';


/**
 * Values in report:
 * {
 * application_name: '',
 * mylogins_profile_name: '',
 * udam: '',
 * active_with_users: '',
 * allows_id_maintenance: '',
 * business_description: ''
 * }
 */

// Adapted from stack overflow - https://stackoverflow.com/questions/6040515/how-do-i-get-month-and-date-of-javascript-in-2-digit-format
function formatDateToString(date) {
    // 01, 02, 03, ... 29, 30, 31
    var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();
    // 01, 02, 03, ... 10, 11, 12
    var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
    // 1970, 1971, ... 2015, 2016, ...
    var yyyy = date.getFullYear();

    // create the format you want
    return (yyyy + MM + dd);
}

// Application Name
// MyLogins Profile Name (the anmes will be different Ex: Administrator, application manager, etc)
// UADM (same as 2)
// Active with users
// Allows ID Maintenance (I assume this means you can change the rules of the policy)
// Business Description/Profile User Job function

var getAllASoCRoles = function (callback) {
    asoc.getAllRoles((roles) => {
        logger.debug('Roles: ' + JSON.stringify(roles.body));
        callback(roles.body);
    })
}


/**
 * Collexts all the users on the ASoC platform for your organization
 * @param {*} callback 
 */
var getAllASoCUsers = function (callback) {
    asoc.getAllUsers((users) => {
        logger.debug('Users: ' + JSON.stringify(users))
        users = users.body;
        for (let user in users) {
            // Add unique roleID to array
            if (ASoCUserRoleIDArray.indexOf(users[user].RoleId) < 0) {
                ASoCUserRoleIDArray.push(users[user].RoleId);
            }
        }
        logger.debug('Array: ' + ASoCUserRoleIDArray);
        callback(users);
    })
}

/**
 * In ASE it is collecting all the user types that are defined
 */
var getAllASEUserTypes = function (callback) {
    ase.getUserTypes((userTypes) => {
        logger.debug('ASE USer types: ' + JSON.stringify(userTypes))
        callback(userTypes.body);
    })
}

/**
 * Collects all the users on the ASE platform
 * @param {*} callback 
 */
var getAllASEUsers = function (callback) {
    ase.getAllUsers((users) => {
        users = users.body
        logger.debug('ASE Users: ' + JSON.stringify(users));
        for (let user in users) {
            // Add unique roleID to array
            if (ASEUserRoleIDArray.indexOf(users[user].userTypeId) < 0) {
                ASEUserRoleIDArray.push(users[user].userTypeId);
            }
        }
        logger.debug('Array: ' + ASEUserRoleIDArray);

        callback(users);
    })
}

/**
 * Writes a to a file on disk
 * @param {*} csv 
 * @param {*} filename 
 * @param {*} callback 
 */
var writeFile = function (csv, filename, callback) {
    fs.writeFile(config.Loc_of_Audit_report + filename, csv, function (err) {
        if (err) {
            return logger.error('Error trying to write csv audit file.  Error: ' + err);
        }
        logger.debug("The file was saved!");
        callback();
    });
}

/**
 * adds to file on disk
 * @param {*} csv 
 * @param {*} filename 
 */
var appendFile = function (csv, filename) {
    fs.appendFile(config.Loc_of_Audit_report + filename, csv, function (err) {
        if (err) {
            return logger.error('Error trying to write footer to csv audit file.  Error: ' + err);
        }

        logger.debug("Footer was added!");
    });
}

/**
 * replaces certain lines of a file on disk and replaces it
 * @param {*} file 
 * @param {*} line 
 * @param {*} text 
 * @param {*} callback 
 */
var fileLineReplace = function (file, line, text, callback) {
    lineReplace({
        file: config.Loc_of_Audit_report + file,
        line: line,
        text: text,
        addNewLine: true,
        callback
    })
}

/**
 * Creates the ASE User Report
 * @param {*} userTypes 
 * @param {*} callback 
 */
var generateASEUserReportData = function (userTypes, callback) {
    if (doASEAuditReport) {
        // ASE
        for (let asetypes in userTypes) {
            let nameSplit = userTypes[asetypes].fullName.split(' ');
            let lastName = nameSplit[0].replace(/,/g, "");
            let firstName = '';
            if (!userTypes[asetypes].isGroup) {
                if (nameSplit.length > 1) {
                    firstName = nameSplit[1].replace(/,/g, "");
                }
                let auditEntry = {
                    CUID: null,
                    AWID: null,
                    APPLICATIONUSERID: userTypes[asetypes].userName,
                    FIRST_NAME: null,
                    MIDDLE_INITIAL: null,
                    LAST_NAME: null,
                    LAST_LOGON_DATE: null,
                    ACCOUNT_ACTIVATION_DATE: null,
                    LAST_DATE_ACCOUNT_MODIFIED: null,
                    LAST_PASSWORD_CHANGE_DATE: null,
                    FULL_USER_NAME: userTypes[asetypes].userName,
                    NT_ID: null
                }
                if (userTypes[asetypes].email) {
                    auditEntry.EMAIL = userTypes[asetypes].email;
                }
                ASEusersAuditDataJSON.push(auditEntry);
            }
        }
        callback();
    } else {
        callback();
    }
}

/**
 * Creates the ASoC User Report
 * @param {*} userTypes 
 * @param {*} callback 
 */
var generateASoCUserReportData = function (userTypes, callback) {
    if (doASoCAuditReport) {
        // ASE
        for (let asoctypes in userTypes) {
            let auditEntry = {
                CUID: null,
                AWID: null,
                APPLICATIONUSERID: userTypes[asoctypes].UserName,
                FIRST_NAME: userTypes[asoctypes].FirstName,
                MIDDLE_INITIAL: null,
                LAST_NAME: userTypes[asoctypes].LastName,
                LAST_LOGON_DATE: null,
                ACCOUNT_ACTIVATION_DATE: null,
                LAST_DATE_ACCOUNT_MODIFIED: null,
                LAST_PASSWORD_CHANGE_DATE: null,
                FULL_USER_NAME: userTypes[asoctypes].UserName,
                NT_ID: null,
                EMAIL: userTypes[asoctypes].UserName,
            }
            ASoCusersAuditDataJSON.push(auditEntry);
        }
        callback();
    } else {
        callback();
    }
}

var createUsersReport = function (aseUsers, asocUsers) {
    async.parallel({
        aseUsersData: function (callback) {
            generateASEUserReportData(aseUsers, () => {
                callback();
            })
        },
        asocUsersData: function (callback) {
            generateASoCUserReportData(asocUsers, () => {
                callback();
            })
        }
    }, (error, results) => {
        if (doASEAuditReport) {
            const json2csvParser = new Json2csvParser({ usersReportFields });
            const csv = json2csvParser.parse(ASEusersAuditDataJSON);
            let parsedHeader = json2csvParser.getHeader().replace(/"/g, "");
            let footerFields = ['TotalRecords', ASEusersAuditDataJSON.length + 2, 'UADM USER PROFILE DATA STANDARD 2.2'];
            writeFile(csv, ASEuserAuditFileName, () => {
                appendFile(newLine + footerFields, ASEuserAuditFileName);
                fileLineReplace(ASEuserAuditFileName, 1, parsedHeader, () => { });
            });
        }
        if (doASEAuditReport) {
            const json2csvParser = new Json2csvParser({ usersReportFields });
            const csv = json2csvParser.parse(ASoCusersAuditDataJSON);
            let parsedHeader = json2csvParser.getHeader().replace(/"/g, "");
            let footerFields = ['TotalRecords', ASoCusersAuditDataJSON.length + 2, 'UADM USER PROFILE DATA STANDARD 2.2'];
            writeFile(csv, ASOCuserAuditFileName, () => {
                appendFile(newLine + footerFields, ASOCuserAuditFileName);
                fileLineReplace(ASOCuserAuditFileName, 1, parsedHeader, () => { });
            });
        }
    })
}

var generateASEUserProfileReportData = function (userTypes, callback) {
    if (doASEAuditReport) {
        // ASE
        for (let asetypes in userTypes) {
            let auditEntry = {
                //application_name: 'AppScan Enterprise',
                // Text is HTML coded and converting it to string
                PROFILE_NAME: he.decode(userTypes[asetypes].name),
                // Removes any special characters
                //udam: he.decode(userTypes[asetypes].name),
                //active_with_users: 'No',
                //allows_id_maintenance: 'No'
            }
            if (userTypes[asetypes].description) {
                auditEntry.SECURITY_SETTINGS = he.decode(userTypes[asetypes].description).trim();
            }
            if (predefinedASEUserTypes.indexOf(userTypes[asetypes].name) > -1) {
                //auditEntry.allows_id_maintenance = 'Yes';
            }
            if (ASEUserRoleIDArray.indexOf(userTypes[asetypes].id) > -1) {
                //auditEntry.active_with_users = 'Yes';
            }
            ASEprofilesAuditDataJSON.push(auditEntry);
        }
        callback();
    } else {
        callback();
    }
}

var generateASoCUserProfileReportData = function (asocroles, callback) {
    if (doASoCAuditReport) {
        // ASoC
        for (let asocrole in asocroles) {
            let auditEntry = {
                //application_name: 'Application Security on Cloud',
                PROFILE_NAME: asocroles[asocrole].Name,
                //udam: asocroles[asocrole].Name,
                //active_with_users: 'No',
                //allows_id_maintenance: 'No'
            }
            if (asocroles[asocrole].Description) {
                auditEntry.SECURITY_SETTINGS = asocroles[asocrole].Description
            }
            if (!asocroles[asocrole].Predefined) {
                //auditEntry.allows_id_maintenance = 'Yes';
            }
            if (ASoCUserRoleIDArray.indexOf(asocroles[asocrole].Id) > -1) {
                //auditEntry.active_with_users = 'Yes';
            }
            ASoCprofilesAuditDataJSON.push(auditEntry);
        }
        callback()
    } else {
        callback();
    }
}

var createUserProfileReport = function (aseUserProfile, asocUserProfile) {
    async.parallel({
        aseAuditData: function (callback) {
            generateASEUserProfileReportData(aseUserProfile, () => {
                callback();
            })
        },
        asocAuditData: function (callback) {
            generateASoCUserProfileReportData(asocUserProfile, () => {
                callback();
            })
        }
    }, (err, results) => {
        if (doASEAuditReport) {
            const json2csvParser = new Json2csvParser({ profilesFields });
            const csv = json2csvParser.parse(ASEprofilesAuditDataJSON);
            let parsedHeader = json2csvParser.getHeader().replace(/"/g, "");
            let footerFields = ['TotalRecords', ASEprofilesAuditDataJSON.length + 2, 'UADM USER PROFILE DATA STANDARD 2.2'];
            writeFile(csv, ASEuserProfileAuditFileName, () => {
                appendFile(newLine + footerFields, ASEuserProfileAuditFileName);
                fileLineReplace(ASEuserProfileAuditFileName, 1, parsedHeader, () => { });
            });
        }
        if (doASoCAuditReport) {
            const json2csvParser = new Json2csvParser({ profilesFields });
            const csv = json2csvParser.parse(ASoCprofilesAuditDataJSON);
            let parsedHeader = json2csvParser.getHeader().replace(/"/g, "");
            let footerFields = ['TotalRecords', ASoCprofilesAuditDataJSON.length + 2, 'UADM USER PROFILE DATA STANDARD 2.2'];
            writeFile(csv, ASOCuserProfileAuditFileName, () => {
                appendFile(newLine + footerFields, ASOCuserProfileAuditFileName);
                fileLineReplace(ASOCuserProfileAuditFileName, 1, parsedHeader, () => { });
            });
        }
    })
}


var generateASEUserProfileReportWithTypeData = function (users, userTypes, callback) {
    if (doASEAuditReport) {
        // ASE
        for (let aseUser in users) {
            let userTypeID = users[aseUser].userTypeId;
            if (!users[aseUser].isGroup) {
                let auditEntry = {
                    CUID: null,
                    AWID: null,
                    APPLICATIONUSERID: users[aseUser].userName
                }
                for (let type in userTypes) {
                    if (userTypeID == userTypes[type].id) {
                        auditEntry.PROFILE_NAME = userTypes[type].name
                    }
                }
                ASEuserProfileWithTypeAuditDataJSON.push(auditEntry);
            }
        }
        callback();
    } else {
        callback();
    }
}


var generateASoCUserProfileReportWithTypeData = function (users, userTypes, callback) {
    if (doASoCAuditReport) {
        // ASE
        for (let asocUsers in users) {
            let userTypeID = users[asocUsers].RoleId;
            let auditEntry = {
                CUID: null,
                AWID: null,
                APPLICATIONUSERID: users[asocUsers].UserName
            }
            for (let type in userTypes) {
                if (userTypeID == userTypes[type].Id) {
                    auditEntry.PROFILE_NAME = userTypes[type].Name
                }
            }
            ASoCuserProfileWithTypeAuditDataJSON.push(auditEntry);
        }
        callback();
    } else {
        callback();
    }
}


var createUserProfileWithTypeReport = function (aseUserProfile, aseUserType, asocUserProfile, asocRoles) {
    async.parallel({
        aseAuditData: function (callback) {
            generateASEUserProfileReportWithTypeData(aseUserProfile, aseUserType, () => {
                callback();
            })
        },
        asocAuditData: function (callback) {
            generateASoCUserProfileReportWithTypeData(asocUserProfile, asocRoles, () => {
                callback();
            })
        }
    }, (err, results) => {
        if (doASEAuditReport) {
            const json2csvParser = new Json2csvParser({ usersProfileWithTypeReportField });
            let footerFields = ['TotalRecords', ASEuserProfileWithTypeAuditDataJSON.length + 2, 'UADM USER PROFILE DATA STANDARD 2.2'];
            const csv = json2csvParser.parse(ASEuserProfileWithTypeAuditDataJSON);
            writeFile(csv, ASEuserProfileWithTypeAuditFileName, () => {
                appendFile(newLine + footerFields, ASEuserProfileWithTypeAuditFileName);
            });
        }
        if (doASoCAuditReport) {
            const json2csvParser = new Json2csvParser({ usersProfileWithTypeReportField });
            let footerFields = ['TotalRecords', ASoCuserProfileWithTypeAuditDataJSON.length + 2, 'UADM USER PROFILE DATA STANDARD 2.2'];
            const csv = json2csvParser.parse(ASoCuserProfileWithTypeAuditDataJSON);
            writeFile(csv, ASOCuserProfileWithTypeAuditFileName, () => {
                appendFile(newLine + footerFields, ASOCuserProfileWithTypeAuditFileName);
            });
        }
    })
}


var generateAuditReport = function () {
    // If both reports are turned off then log and dont do anything
    if (!doASEAuditReport && !doASoCAuditReport) {
        logger.info('Both ASE and ASoC audit reports are diabled.  Please turn them on and run again!');
        return;
    }
    async.parallel({
        getASEUsers: function (callback) {
            if (doASEAuditReport) {
                getAllASEUsers((aseUsers) => {
                    callback(null, aseUsers);
                })
            } else {
                logger.debug('Not creating ASE Audit report because it was diabled...')
                callback();
            }
        },
        getASEUserTypes: function (callback) {
            if (doASEAuditReport) {
                getAllASEUserTypes((userTypes) => {
                    callback(null, userTypes);
                })
            } else {
                callback();
            }
        },
        getASoCUsers: function (callback) {
            if (doASoCAuditReport) {
                getAllASoCUsers((asocUsers) => {
                    callback(null, asocUsers);
                })
            } else {
                logger.debug('Not creating ASoC Audit report because it was diabled...')
                callback();
            }
        },
        getASoCUserRoles: function (callback) {
            if (doASoCAuditReport) {
                getAllASoCRoles((asocroles) => {
                    callback(null, asocroles);
                })
            } else {
                callback();
            }
        }
    }, (err, results) => {
        let ASEUsers = results.getASEUsers;
        let ASEUserTypes = results.getASEUserTypes;
        let ASoCUsers = results.getASoCUsers;
        let ASoCUserRoles = results.getASoCUserRoles
        if (doUserProfileReport) {
            // Generate User Profile Report
            createUserProfileReport(ASEUserTypes, ASoCUserRoles);
        }
        if (doUsersReport) {
            // Generate Users Report
            createUsersReport(ASEUsers, ASoCUsers);
        }
        if (doUserProfileWithTypeReport) {
            // Generate User Profile with type Report
            createUserProfileWithTypeReport(ASEUsers, ASEUserTypes, ASoCUsers, ASoCUserRoles);
        }
    })
}



generateAuditReport();


