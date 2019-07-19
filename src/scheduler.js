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

const scheduleJSON = require(config.computerPath + config.Location_of_schedule_json);

// Global variables
var d;



// Check to make sure the schedule JSON exists otherwise fail
if (!scheduleJSON) {
    return logger.error('Error location of schedule JSON file does not exist.  Please specify location in config.js file for key Location_of_schedule_json.  Sample of schedule JSON is in sampledata/scheduler/scheduleSample.JSON.');
}

schedule.scheduleJob('00 * * * *', function () {
    d = new Date();
    console.log('Ran job @ ' + d.getHours() + ':' + d.getMinutes());
    isInBlackout();
})

const isInBlackout = function () {
    logger.debug('Checking if inside blackout time period...');
    let timeFormat = 'HH:mm';
    let timeNow = moment();
    let dayOfWeek = timeNow.format('dddd');
    let time = timeNow.format(timeFormat);
    let timeNowFormated = moment(time, timeFormat);
    let blackoutStartTime = moment(scheduleJSON[dayOfWeek].start_blackout, timeFormat);
    let blackoutEndTime = moment(scheduleJSON[dayOfWeek].end_blackout, timeFormat);

    logger.debug('time: ' + time)
    logger.debug(scheduleJSON[dayOfWeek]);
    
    if (timeNowFormated.isBetween(blackoutStartTime, blackoutEndTime)) {
        logger.debug('Inside blackout period.');
        writeRunningScansFile(cb => {
            logger.debug('Scan file written');
            pauseresumeRunningScans('Pause', action => {
                logger.debug('Pause running scans...');
            })
        });
    } else {
        logger.debug('Outside blackout period.');
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
const pauseresumeRunningScans = function(operation, callback) {
    logger.debug(operation + ' running DAST scans from Application Security on Cloud...');
    var allowedOperations = ['Pause','Resume'];
    if (allowedOperations.includes(operation)){
        var currScansJson = require('../test.json');
        var fs = require('fs');
        var data = {};
        fs.readFile('currScansJson', 'utf8',
            function (err, contents) {
            });
        if (currScansJson.scans) {
            var scanArray = currScansJson.scans;
            var i;
            for (i=0; i<scanArray.length; i++){
                asoc.pauseresumeRunningDASTScan(operation,scanArray[i]);
            }
        } else {
            logger.error('No currently executing scans.');
        }
    } else {
        logger.error('Invalid operation parameter.');
    }
}


//TODO change filename to have timestamp
const writeRunningScansFile = function(callback) {
    asoc.getRunningDASTScans(runningScans => {
        if (runningScans.length > 0){
        let scanJson = {
            scans: runningScans
        };
        writeFile('test.json', JSON.stringify(scanJson), () => {
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



isInBlackout();