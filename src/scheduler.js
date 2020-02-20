/**
 * Scheduler - this module schedules a black out period
 */
// Dependencies
const schedule = require('node-schedule');
const moment = require('moment');
const config = require('../config/config');
const logger = require('../config/logger');
const asoc = require('./providers/asoc');
const fs = require('fs');
const scheduleJSONFileLoc = config.Location_of_schedule_json;


var defaultScanWrkFile = config.Location_of_scan_temp_file;

// Global variables
var d;
var scheduleJSON;


// CANNOT DO THIS CHECK HERE...THE PARSED FILE DOESN'T EXIST YET...
// Check to make sure the schedule JSON exists otherwise fail
//if (!scheduleJSON) {
//    return logger.error('Error location of schedule JSON file does not exist.  Please specify location in config.js file for key Location_of_schedule_json.  Sample of schedule JSON is in sampledata/scheduler/scheduleSample.JSON.');
//}

schedule.scheduleJob('0 */30 * * * *', function () {
    d = new Date();
    console.log('Ran job @ ' + d.getHours() + ':' + d.getMinutes());
    isInScanWindow();
})

// Checks if the scan is inside or outside of the scan window based on the current time
// The format of the date in the schdule.JSON file for start_scan_window and end_scan_window
// must be MM/DD/YYYY HH:mm
// This function processes it for each scan one at a time and needs to complete the processing of each 
// scan before it moves on to the next one
const isInScanWindow = function () {
    let timeNow = moment();
    let timeFormat = 'MM/DD/YYYY HH:mm';
    let time = timeNow.format(timeFormat);
    let timeNowFormated = moment(time, timeFormat);
    var scanListIndex = 0;
    processNextScan();


    // Increments the scanListIndex which is the index for the scans in schedule.JSON file
    // checks if it completely itterated through the list and stops if it has
    function incrementScanIndex() {
        if (scanListIndex < scheduleJSON.scans.length - 1) {
            logger.debug('Processing next scan...')
            scanListIndex++;
            processNextScan();
        } else {
            logger.debug('Completed processing all scans...');
        }
    }


    // Checks if the scan is inside or outside the scan windows with the current time
    function processNextScan() {
        // Read JSON file
        readFile(scheduleJSONFileLoc, () => {
            // File has been read by now so do the check here...
            // Check to make sure the schedule JSON exists otherwise fail
            if (!scheduleJSON) {
                return logger.error('Error location of schedule JSON file does not exist.  Please specify location in config.js file for key Location_of_schedule_json.  Sample of schedule JSON is in sampledata/scheduler/scheduleSample.JSON.');
            }

            let scanInfo = { scanId: null, isInsideWindow: false };
            logger.debug('Checking if inside allowed scan window...');
            let scanWindowStart = moment(scheduleJSON.scans[scanListIndex].start_scan_window, timeFormat);
            let scanWindowEnd = moment(scheduleJSON.scans[scanListIndex].end_scan_window, timeFormat);


            if (timeNowFormated.isBetween(scanWindowStart, scanWindowEnd)) {
                logger.debug('Inside scan window');
                scanInfo.scanId = scheduleJSON.scans[scanListIndex].scanId
                scanInfo.isInsideWindow = true;
            } else {
                logger.debug('Outside scan window');
                scanInfo.scanId = scheduleJSON.scans[scanListIndex].scanId
                scanInfo.isInsideWindow = false;
            }

            processScan(scanInfo, () => {
                logger.debug('Completed processing scan.');
                incrementScanIndex();
            })

        })
    }

    const processScan = function (scanDetails, callback) {
        logger.debug('Processing scan: ' + scanDetails.scanId + ' is scan in windows: ' + scanDetails.isInsideWindow);

        asoc.getScanInfo(scanDetails.scanId, scanData => {
            if (scanData.body.Key === 'INVALID_SCAN_IDENTIFIER') {
                logger.error('Invalid scanId: ' + scanDetails.scanId);
                callback();
            }

            // scanId is valid
            let scanExecutionId = '';
            let scanStatus = '';

            if (scanData.body.LatestExecution) {
                scanExecutionId = scanData.body.LatestExecution.Id;
                scanStatus = scanData.body.LatestExecution.Status;
            } else {
                //scan has been configured but never run
                scanStatus = 'notStarted';
            }

            //logger.debug('ExecutionID: ' + scanExecutionId);
            //logger.debug('Status: ' + scanStatus);


            //TODO add note when skipping running scans? 
            //TODO fix logging output order

            if (scanDetails.isInsideWindow === false && scanStatus === 'Running') {
                // pause scan
                logger.debug('Scan is running but scan window has expired - pausing scan, scanExecutionId:  ' + scanExecutionId);
                asoc.pauseOrResumeDASTScan('Pause', scanExecutionId, (data) => {
                    if (data.statusCode == 200) { 
                        logger.debug('Successfully paused scan'); 
                    } else { 
                        logger.error('Error pausing scan on ASoC.  Error: ' + data.body); 
                    }
                    callback();
                });
            } else if (scanDetails.isInsideWindow === true && (scanStatus === 'Ready' || scanStatus === 'Paused' || scanStatus === 'notStarted')) {
                // start scan
                if (scanStatus === 'notStarted') {
                    logger.debug('Inside valid scan window. Scan not previously started. Starting scanId:  ' + scanDetails.scanId);
                    asoc.startDASTScan(scanDetails.scanId, (data) => {
                        if (data.statusCode == 200) {
                            logger.debug('Successfully started scan');
                        } else {
                            logger.error('Error starting scan on ASoC.  Error: ' + JSON.stringify(data.body));
                        }
                        callback();
                    });
                } else {
                    logger.debug('Inside valid scan window. Scan is currently paused. Restarting scanExecutionId:  ' + scanExecutionId);
                    asoc.pauseOrResumeDASTScan('Resume', scanExecutionId, (data) => {
                        if (data.statusCode == 200) {
                            logger.debug('Successfully resumed scan');
                        } else {
                            logger.error('Error resuming scan on ASoC.  Error: ' + JSON.stringify(data.body));
                        }
                        callback();
                    });
                }
            } else {
                callback();
            }
        });

    }
}






/**
*     - Open and read json file created by getRunningDASTScans.
*     - json data should look like {"scans":["id1","id2","id3"]} (or similar)
*     - Loop through execution id's for all running scans provided and then call REST query to 
*     - pause them one by one (if given 'pause' parameter).
*     - Loop through execution id's for all running scans provided and then call REST query to 
*     - resume them one by one (if given 'resume' parameter).
*/
const pauseresumeRunningScans = function (operation, callback) {
    logger.debug(operation + ' running DAST scans from Application Security on Cloud...');
    fs.readFile(defaultScanWrkFile, 'utf8',
        function (err, contents) {
            if (err) {
                return logger.error('Error trying to read file, ' + err);
            } else {
                let parseJson = JSON.parse(contents);
                if (parseJson.scans && parseJson.scans.length > 0) {
                    let tempScanArray = [];
                    tempScanArray.push(parseJson.scans);
                    var i;
                    for (i = 0; i < tempScanArray.length; i++) {
                        asoc.pauseresumeRunningDASTScan(operation, tempScanArray[i], (data) => {
                            //CHECK IF PAUSING IS SUCCESSFUL THEN REMOVE FROM LIST
                            logger.debug('Data: ' + JSON.stringify(data.body));
                            if (operation == 'Resume') {
                                tempScanArray = tempScanArray.filter((value, index, arr) => {
                                    logger.debug('DONE')
                                    return value == tempScanArray[i]
                                })
                                let scanJson = {
                                    scans: tempScanArray
                                };
                                logger.debug('STUFF: ' + JSON.stringify(scanJson));
                                writeFile(defaultScanWrkFile, JSON.stringify(scanJson), () => {
                                });
                            }
                        });
                    }
                    callback();
                } else {
                    logger.error('No currently executing scans.');
                }
            }
        });
}


//TODO change filename to have timestamp
const writeRunningScansFile = function (callback) {
    asoc.getRunningDASTScans(runningScans => {
        if (runningScans.length > 0) {
            let scanJson = {
                scans: runningScans
            };
            writeFile(defaultScanWrkFile, JSON.stringify(scanJson), () => {
                callback();
            });
        }
        console.log(runningScans);
    })
}

var writeFile = function (filename, data, callback) {
    fs.writeFile(filename, data, function (err) {
        if (err) {
            return logger.error('Error trying to write file.  Error: ' + err);
        }
        logger.debug("The file was saved!");
        callback();
    });
}


const readFile = function (file, callback) {
    //    logger.debug('file : ' + file);
    fs.readFile(file, 'utf8',
        function (err, contents) {
            if (err) {
                return logger.error('Error trying to read file, ' + err);
            } else {
                try {
                    scheduleJSON = JSON.parse(contents);
                    callback();
                } catch (error) {
                    return logger.error('Error trying to parse JSON file.  Please make sure file, ' + file + ', is in correct JSON format.');
                }
            }
        })
}


isInScanWindow();