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
const through2 = require("through2");
const split2 = require('split2');
const util = require('./util');
const Loc_of_Current_Scan_report = config.Loc_of_Current_Scan_report;

/**
 * Global Variables
 */
// CSV headers
var csvHeaders = ['Activity ID','JobName', 'Folder', 'Started by User', 'Job Start Time Localized', 'Server'];
var csvHeadersSummary = ['Activity ID','JobName', 'Folder', 'Started by User', 'Job Start Time Localized', 'Server', 'Job Running By', 'Job Ended By'];
var csvJSON = [];
var date = new Date();
const ASECurrentScanJobsFileName = 'ASE-CurrentScanJobs_' + formatDateToString(date) + '.csv';
const ASEScanJobsSummaryFileNameBase = 'ASE-ScanJobs_';




// Check if directory of audit directory exists if not create it
if (!fs.existsSync(Loc_of_Current_Scan_report)) {
    fs.mkdirSync(Loc_of_Current_Scan_report);
}

function formatDateToString(date, dateOnly) {
    // 01, 02, 03, ... 29, 30, 31
    var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();
    // 01, 02, 03, ... 10, 11, 12
    var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
    // 1970, 1971, ... 2015, 2016, ...
    var yyyy = date.getFullYear();
    var hh = (date.getHours() < 10 ? '0' : '') + date.getHours();
    var mm = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();

    // create the format you want
    return dateOnly ? (yyyy + MM + dd) : (yyyy + MM + dd + "-" + hh + mm);
    }

function formatDateReadable(date) {
    // 01, 02, 03, ... 29, 30, 31
    var dd = (date.getDate() < 10 ? '0' : '') + date.getDate();
    // 01, 02, 03, ... 10, 11, 12
    var MM = ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1);
    // 1970, 1971, ... 2015, 2016, ...
    var yy = date.getFullYear().toString().substr(-2);
    var hh = (date.getHours() < 10 ? '0' : '') + date.getHours();
    var mm = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();

    // create the format you want
    return dd + '/' + MM + '/' + yy + ' ' + hh + ':' + mm;
}

const getCurrentScans = function(callback) {
  var scanDataArray = []
  ase.getRunningScanJobs((allCurrentScans) =>{
    logger.debug('all current scans ' + JSON.stringify(allCurrentScans));
    allCurrentScans = allCurrentScans.body;
    for(let scan in allCurrentScans){
      let scanDataJSON = {
        activityId: allCurrentScans[scan].activityId,
        jobName: allCurrentScans[scan].jobName,
        folder: allCurrentScans[scan].folder,
        jobStartTimeLocalized: allCurrentScans[scan].jobStartTimeLocalized,
        startedByUser: allCurrentScans[scan].startedByUser,
        server: allCurrentScans[scan].server
      }
      scanDataArray.push(scanDataJSON)
    }
    callback(scanDataArray)
  })
}

const updateSummaryFile = function(scanDataArray) {

    //See if we have a summary report for today yet

    let now = date;
    let yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);

    let summaryFileNameYesterday = ASEScanJobsSummaryFileNameBase +
        formatDateToString(yesterday, true) + '.csv';
    let summaryFileNameToday = ASEScanJobsSummaryFileNameBase +
        formatDateToString(now, true) + '.csv';
    let summaryFileMetricsNameToday = ASEScanJobsSummaryFileNameBase +
        formatDateToString(now, true) + '-metrics.csv';

    const json2csvParser = new Json2csvParser({ fields: csvHeadersSummary });

    async.waterfall([

        (cbWF) => {

            let csvSummaryJSON = [];
            let metrics = {running: 0, completed: 0};

            if (fs.existsSync(Loc_of_Current_Scan_report + summaryFileNameToday)) {

                //Update today's file

                logger.info('Updating summary for ' + formatDateToString(now, true));

                let existingRows = [];

                fs.createReadStream(Loc_of_Current_Scan_report + summaryFileNameToday).pipe(split2()).pipe(util.parseCSV()).pipe((() => {

                    let keys;

                    return through2.obj(function (data, enc, cb) {

                        if (!keys) keys = Object.keys(data)[0].replace(/['"]/g,'').split(',');
                        let values = Object.values(data)[0].replace(/['"]/g,'').split(',');

                        let existingRow = {}; for (let i in keys) existingRow[keys[i]] = values[i];

                        existingRow['Activity ID'] = parseInt(existingRow['Activity ID']);

                        this.push(existingRow);

                        cb();

                    }).on('data', (row) => {
                        existingRows.push(row);
                    }).on('end', () => {

                        let existingActivityIDs = [];

                        existingRows.forEach((existingRow) => {
                            if (existingRow['Job Ended By']) {
                                //Job already finished - pass through if in the same day
                                //TODO: Clean this up
                            } else if (scanDataArray.some((hourlyRow) => hourlyRow.jobName === existingRow.JobName))  {
                                //Job is still ongoing - update date
                                existingRow['Job Running By'] = formatDateReadable(now);
                                metrics.running++;
                            } else {
                                //Job has ended since the last summary - set end date
                                existingRow['Job Running By'] = '';
                                existingRow['Job Ended By'] = formatDateReadable(now);
                                metrics.completed++;
                            }
                            csvSummaryJSON.push(existingRow);
                            existingActivityIDs.push(existingRow['Activity ID']);
                        });

                        //Add new jobs to the summary
                        scanDataArray.filter((hourlyRow) => !existingActivityIDs.includes(hourlyRow.activityId)).forEach((newRow) => {
                            csvSummaryJSON.push({
                                'Activity ID': newRow.activityId,
                                'JobName':newRow.jobName,
                                'Folder':newRow.folder,
                                'Started by User':newRow.startedByUser,
                                'Job Start Time Localized':newRow.jobStartTimeLocalized,
                                'Server':newRow.server,
                                'Job Running By':formatDateReadable(now),
                                'Job Ended By':''
                            });
                            metrics.running++;
                        });

                        cbWF(null, csvSummaryJSON, metrics);

                    });

                })());

            } else if (fs.existsSync(Loc_of_Current_Scan_report + summaryFileNameYesterday)) {

                //Carry over yesterday's summary to today and update.

                logger.info('Rolling over summary data from  ' + formatDateToString(yesterday, true));

                let yesterdayRows = [];

                fs.createReadStream(Loc_of_Current_Scan_report + summaryFileNameYesterday).pipe(split2()).pipe(util.parseCSV()).pipe((() => {

                    let keys;

                    return through2.obj(function (data, enc, cb) {

                        if (!keys) keys = Object.keys(data)[0].replace(/['"]/g,'').split(',');
                        let values = Object.values(data)[0].replace(/['"]/g,'').split(',');

                        let yesterdayRow = {}; for (let i in keys) yesterdayRow[keys[i]] = values[i];

                        yesterdayRow['Activity ID'] = parseInt(yesterdayRow['Activity ID']);

                        this.push(yesterdayRow);

                        cb();

                    }).on('data', (row) => {
                        yesterdayRows.push(row);
                    }).on('end', () => {

                        let yesterdayActivityIDs = [];

                        yesterdayRows.forEach((yesterdayRow) => {
                            if (yesterdayRow['Job Ended By']) {
                                //TODO: Clean this up
                                //nop - Job finished yesterday - do not include in today's report
                            } else if (scanDataArray.some((hourlyRow) => hourlyRow.jobName === yesterdayRow.JobName))  {
                                //Job is still ongoing - update date
                                yesterdayRow['Job Running By'] = formatDateReadable(now);
                                csvSummaryJSON.push(yesterdayRow);
                                metrics.running++;
                            } else {
                                //Job has ended since the last summary - set end date
                                yesterdayRow['Job Running By'] = '';
                                yesterdayRow['Job Ended By'] = formatDateReadable(now);
                                csvSummaryJSON.push(yesterdayRow);
                                metrics.completed++;
                            }
                            yesterdayActivityIDs.push(yesterdayRow['Activity ID']);
                        });

                        //Add new jobs to the summary
                        scanDataArray.filter((hourlyRow) => !yesterdayActivityIDs.includes(hourlyRow.activityId)).forEach((newRow) => {
                            csvSummaryJSON.push({
                                'Activity ID': newRow.activityId,
                                'JobName':newRow.jobName,
                                'Folder':newRow.folder,
                                'Started by User':newRow.startedByUser,
                                'Job Start Time Localized':newRow.jobStartTimeLocalized,
                                'Server':newRow.server,
                                'Job Running By':formatDateReadable(now),
                                'Job Ended By':''
                            });
                            metrics.running++;
                        });

                        cbWF(null, csvSummaryJSON, metrics);

                    });

                })());

                //As this is the first new summary of the day, clean out yesterday's hourly reports.
                fs.readdir(Loc_of_Current_Scan_report, (err, files) => {
                    files.filter((f) => f.startsWith('ASE-CurrentScanJobs_' + formatDateToString(yesterday, true))).forEach((f) => {
                        logger.debug('Deleting ' + f);
                        fs.unlink(Loc_of_Current_Scan_report + f, () => {});
                    })
                });


            } else {

                //Create a new summary

                logger.info('Creating new summary for ' + formatDateToString(now, true));

                scanDataArray.forEach((app) => {
                    csvSummaryJSON.push({
                        'Activity ID': app.activityId,
                        'JobName':app.jobName,
                        'Folder':app.folder,
                        'Started by User':app.startedByUser,
                        'Job Start Time Localized':app.jobStartTimeLocalized,
                        'Server':app.server,
                        'Job Running By':formatDateReadable(now),
                        'Job Ended By':''
                    });
                });

                metrics.running = scanDataArray.length;

                cbWF(null, csvSummaryJSON, metrics);

            }

        }, (csvSummaryJSON, metrics, cbWF) => {

            //Write the summary file
            const csv = json2csvParser.parse(csvSummaryJSON);
            writeFile(csv, summaryFileNameToday, () => {
                logger.debug('Saved summary file: ' + summaryFileNameToday);
            });

            //Write the metrics file
            let metricsPath = Loc_of_Current_Scan_report + summaryFileMetricsNameToday;
            fs.appendFile(metricsPath, (!fs.existsSync(metricsPath) ? '"Time", "Jobs Running", "Jobs Completed"' : '')
                + '\n"' + formatDateReadable(now) + '",' + metrics.running + ',' + metrics.completed,(err) =>
            {
                if (err) logger.error('Error trying to write csv audit file.  Error: ' + err);
                else logger.debug('Saved metrics file: ' + summaryFileMetricsNameToday);
            });

            cbWF();
        }

    ]);

};


var writeFile = function (csv, filename, callback) {
    fs.writeFile(Loc_of_Current_Scan_report + filename, csv, function (err) {
        if (err) {
            return logger.error('Error trying to write csv audit file.  Error: ' + err);
        }
        logger.debug("The file was saved!");
        callback();
    });
}


// Create CSV
const createCSV = function (appArray) {
  logger.debug('Inside create CSV function');


        async.eachLimit(appArray, 3, (app, callback) => {
      logger.debug(JSON.stringify(app));
        let tempJSON = {
            'Activity ID':app.activityId,
            'JobName':app.jobName,
            'Folder':app.folder,
            'Started by User':app.startedByUser,
            'Job Start Time Localized':app.jobStartTimeLocalized,
            'Server':app.server
        }
csvJSON.push (tempJSON)
                callback();

    }, (err, data) => {
      if (err) {
            logger.error('ERROR while building CSV: ' + err);
        }
        const json2csvParser = new Json2csvParser({ fields: csvHeaders });

        const csv = json2csvParser.parse(csvJSON);
        //let parsedHeader = json2csvParser.getHeader().replace(/"/g, "");
        writeFile(csv, ASECurrentScanJobsFileName, () => {
        });
    })
}

// TO DO:
// ***** TO DO: if does not exist create it! ******
// *** Update open source


            /**
             * Get current scans in ASE
             */
            getCurrentScans((currentScans) => {
                logger.debug('Current Scans Array'+JSON.stringify(currentScans))
                /**
                 * Build CSV
                 */
                createCSV(currentScans);
                updateSummaryFile(currentScans);
            })
