/**
 * This is the Scan audit module.  It gets details on the scans that ran.  
 */

/**
 * Dependencies
 */
const ase = require('./providers/ase');
const logger = require('../config/logger');
const config = require('../config/config');
const async = require('async');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
const Json2csvParser = require('json2csv').Parser;
const he = require('he');
var fs = require('fs');
const Loc_of_Audit_report = config.Loc_of_Audit_report;



/**
 * Global Variables
 */
// CSV headers
var csvHeaders = ['Application Name', 'is Associated with Application', 'Run Start', 'Run End', 'Net Time', 'Pages Found', 'Pages Scanned', 'Last Scan date', 'Security Entities Found', 'Security Entities Tested', 'Requests Sent'];
var csvJSON = [];
var date = new Date();
const ASEScanAuditFileName = 'ASE-Scans_Audit_' + formatDateToString(date) + '.csv';



// Check if directory of audit directory exists if not create it
if (!fs.existsSync(Loc_of_Audit_report)) {
    fs.mkdirSync(Loc_of_Audit_report);
}

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


// Get folders - only looks at folders under ASE and not user folders 
const getASEFolders = function (callback) {
    let folderIDArray = [];
    ase.getFolders((allFolders) => {
        let usersFolderID;

        for (let folder in allFolders.body) {
            if (allFolders.body[folder].folderName == 'Users') {
                usersFolderID = allFolders.body[folder].folderId;
            }
            else if (usersFolderID != allFolders.body[folder].parentId) {
                if (allFolders.body[folder].parentId != -1) {
                    let appName = allFolders.body[folder].folderName
                    let nameTemp = appName.split('/');
                    if (nameTemp.length > 1) {
                        appName = nameTemp[0];
                    }
                    let appJSON = {
                        name: appName,
                        folderID: allFolders.body[folder].folderId,
                        isAppAssociated: false,
                        dastJobs: []
                    }
                    folderIDArray.push(appJSON);
                }
            } else {
                return callback(folderIDArray);
            }
        }
    })
}


// Get job IDs in folder ID array
async function getJobID(appArray, callback) {
    async.eachLimit(appArray, 5, (app, callback) => {
        ase.getListOfDASTJobs(app.folderID, (listOfDASTJobs) => {
            if (listOfDASTJobs.body.length > 0) {
                for (let job in listOfDASTJobs.body) {
                    appArray[appArray.indexOf(app)].dastJobs.push(listOfDASTJobs.body[job].id);
                }
            } else logger.info('No scans found for app ID ' + app.name);
            callback();
        })
    }, (err, data) => {
        //Remove app IDs with no jobs for efficiency
        appArray = appArray.filter((a) => a.dastJobs.length);
        callback(appArray);
    })
}


// // Check if the scan has been associated with a application or not
// const isScanAssociatedWithApp = function (appArray, callback) {
//     async.eachLimit(appArray, 3, (app, callback) => {
//         if (app.dastJobs.length) {
//             for (let DASTJob in app.dastJobs) {
//                 ase.getDASTJobDetails(app.dastJobs[DASTJob], (jobDetails) => {
//                     if (jobDetails.applicationId != -1) {
//                         appArray[appArray.indexOf(app)].isAppAssociated = true;
//                     }
//                     if (app.dastJobs.length - 1 <= DASTJob) {
//                         callback();
//                     }
//                 })
//             }
//         } else {
//             callback();
//         }
//     }, (err, data) => {
//         callback(appArray);
//     })
// }


// // Get the scan statistics of a DAST job
// const getDASTScanStatistics = function (appArray, callback) {
//     async.eachLimit(appArray, 3, (app, callback) => {
//         let statArray = [];
//         let DASTJobArrayCounter = 0;
//         if (app.dastJobs.length) {
//             for (let DASTJob in app.dastJobs) {
//                 ase.getDASTScanStatistics(app.dastJobs[DASTJob], (jobDetails) => {
//                     if (jobDetails.body) {
//                         parser.parseString(jobDetails.body, function (err, result) {
//                             if (result.statistics['$']) {
//                                 let statJson = {
//                                     jobID: app.dastJobs[DASTJob],
//                                     statistics: result.statistics['$']
//                                 }
//                                 DASTJobArrayCounter++;
//                                 statArray.push(statJson);
//                             }
//                         })
//                     } else {
//                         DASTJobArrayCounter++;
//                         logger.debug('DAST job ' + app.dastJobs[DASTJob] + ' did not scan properly, please update to get statistics.');
//                     }
//                     //if (app.dastJobs.length - 1 <= DASTJob) {
//                     if (DASTJobArrayCounter == app.dastJobs.length) {
//                         appArray[appArray.indexOf(app)].statistics = statArray;
//                         callback();
//                     }
//                 })
//             }
//         } else {
//             callback();
//         }
//     }, (err, data) => {
//         callback(appArray);
//     })
// }



const getLatestSuccessfulAndAssociated = function (appArray, cbOuter) {

    //TODO: Avoid using global.  Would prefer to use async.eachOfLimit
    global.appArray = appArray;

    async.eachLimit(appArray, 3, (app, cbEach) => {

        logger.debug('Getting scan data for app ID ' + app.name + ' (' + (global.appArray.indexOf(app) + 1) + ' of ' + global.appArray.length + ')');

        async.series([
            (cbSeries) => {
                async.parallel({
                    getLatestSuccessful: (cbPar) => {
                        let sortedJobIds = app.dastJobs.slice(0).sort((a, b) => b - a);
                        async.until(() => { return app.mostRecentSuccessfulJob !== undefined || !sortedJobIds.length }, (cbUntil) => {
                            let idToTest = sortedJobIds.shift();
                            ase.getDASTScanStatistics(idToTest, (jobDetails) => {
                                jobDetails = jobDetails.body;
                                if (jobDetails) {
                                    parser.parseString(jobDetails, function (err, result) {
                                        if (result.statistics['$']) {
                                            app.mostRecentSuccessfulJob = { id: idToTest, statistics: result.statistics['$'] };
                                            logger.debug('Found successful DAST job ' + idToTest + ' for app ID ' + app.name);
                                            //TODO: Make sure that this actually indicates success
                                        }
                                    })
                                } else if (sortedJobIds.length) {
                                    logger.debug('DAST job ' + idToTest + ' did not scan properly; trying to fall back to next most recent scan for app ID ' + app.name);
                                } else {
                                    logger.debug('Could not find completed scan for app ID ' + app.name);
                                }
                                cbUntil();
                            });
                        }, cbPar)
                    },

                    getLatestAssociated: (cbPar) => {
                        let sortedJobIds = app.dastJobs.slice(0).sort((a, b) => b - a);
                        async.until(() => { return app.mostRecentAssociatedJob !== undefined || !sortedJobIds.length }, (cbUntil) => {
                            let idToTest = sortedJobIds.shift();
                            ase.getDASTJobDetails(idToTest, (jobDetails) => {
                                if (jobDetails.applicationId !== -1) {
                                    app.mostRecentAssociatedJob = {id: idToTest};
                                    logger.debug('Found associated DAST job ' + idToTest + ' for app ID ' + app.name);
                                } else if (sortedJobIds.length) {
                                    logger.verbose('DAST job ' + idToTest + ' is not associated with an application; trying to fall back to next most recent scan for app ID ' + app.name);
                                } else {
                                    logger.info('Could not find any scans associated to an application for app ID ' + app.name);
                                }
                                cbUntil();
                            })
                        }, cbPar)
                    }
                }, cbSeries);
            },

            (cbSeries) => {
                //TODO: If mostRecentSuccessfulJob === undefined, no point in doing this since it won't even make it into the report anyway?
                if (app.mostRecentAssociatedJob !== undefined && (app.mostRecentSuccessfulJob === undefined || app.mostRecentSuccessfulJob.id !== app.mostRecentAssociatedJob.id)) {

                    logger.debug('Most recent successful and associated jobs are different for app ID ' + app.name + ' - obtaining data for associated scan ' + app.mostRecentAssociatedJob.id);

                    ase.getDASTScanStatistics(app.mostRecentAssociatedJob.id, (jobDetails) => {
                        jobDetails = jobDetails.body;
                        if (jobDetails) {
                            parser.parseString(jobDetails, function (err, result) {
                                if (result.statistics['$']) {
                                    app.mostRecentAssociatedJob.statistics = result.statistics['$'];
                                    logger.debug('Associated DAST job ' + app.mostRecentAssociatedJob.id + ' for app ID ' + app.name + ' was successful, though not most recent successful');
                                    //TODO: Make sure that this actually indicates success
                                }
                            })
                        } else {
                            logger.warn('Associated DAST job ' + app.mostRecentAssociatedJob.id + ' for app ID ' + app.name + ' was not successful');
                        }
                        cbSeries();
                    });

                } else if (app.mostRecentAssociatedJob !== undefined && app.mostRecentSuccessfulJob !== undefined && app.mostRecentAssociatedJob.id === app.mostRecentSuccessfulJob.id) {
                    logger.verbose('Linking identical successful and associated scan ' + app.mostRecentSuccessfulJob.id + ' for app ID ' + app.name);
                    app.mostRecentAssociatedJob = app.mostRecentSuccessfulJob;
                    cbSeries();
                } else cbSeries();
            }
        ], cbEach);



    }, () => {
        appArray = appArray.filter((a) => a.mostRecentSuccessfulJob === undefined || (a.mostRecentSuccessfulJob.statistics['security-entities-tested'] !== undefined && a.mostRecentSuccessfulJob.statistics['security-entities-tested'] !== '0'));
        cbOuter(appArray)
    });
};

var writeFile = function (csv, filename, callback) {
    fs.writeFile(Loc_of_Audit_report + filename, csv, function (err) {
        if (err) {
            return logger.error('Error trying to write csv audit file.  Error: ' + err);
        }
        logger.debug("The file was saved!");
        callback();
    });
}


// Create CSV
const createCSV = function (appArray) {

    logger.info('Creating CSV...');

    // const getLastestScan = function (dastArray, callback) {
    //     let returnedIndex;
    //     let highestJobID = 0;
    //     for (let d in dastArray) {
    //         if (dastArray[d].jobID > highestJobID) {
    //             highestJobID = dastArray[d].jobID;
    //             returnedIndex = d;
    //         }
    //     }
    //     callback(returnedIndex);
    // }
    async.eachLimit(appArray, 3, (app, callback) => {

        let jobStats = app.mostRecentSuccessfulJob ? app.mostRecentSuccessfulJob.statistics : null;
        if (!jobStats) { callback(); return; }

        let tempJSON = {
            'Application Name': he.decode(app.name),
            'is Associated with Application': app.mostRecentAssociatedJob !== undefined,
            'Run Start': jobStats['run-start'],
            'Run End': jobStats['run-end'],
            'Net Scan Time': jobStats['net-scan-time'],
            'Pages Found': jobStats['pages-found'],
            'Pages Scanned': jobStats['pages-scanned'],
            'Security Entities Found': jobStats['security-entities-found'],
            'Security Entities Tested': jobStats['security-entities-tested'],
            'Requests Sent': jobStats['requests-sent'],
            'Latest Associated Scan Start': app.mostRecentAssociatedJob !== undefined && app.mostRecentAssociatedJob.statistics !== undefined
                ? app.mostRecentAssociatedJob.statistics['run-start'] : ''
        };

        csvJSON.push(tempJSON);
        callback();
    }, (err, data) => {
        if (err) {
            logger.error('ERROR while building CSV: ' + err);
        }
        const json2csvParser = new Json2csvParser({ csvHeaders });
        const csv = json2csvParser.parse(csvJSON);
        //let parsedHeader = json2csvParser.getHeader().replace(/"/g, "");
        writeFile(csv, ASEScanAuditFileName, () => {
        });
    })
};





/**
 * Get the list of folder IDs to check
 */
getASEFolders((appArray) => {
    /**
     * Get list of job IDs in each folder
     */
    getJobID(appArray, (appArray) => {
        /**
         * Check if the DAST Job has been associated with a application
         */
        getLatestSuccessfulAndAssociated(appArray, (appArray) => {
            /**
             * Build CSV
             */
            createCSV(appArray);
        })
    })

});