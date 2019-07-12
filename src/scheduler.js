/**
 * Scheduler - this module schedules a black out period
 */
// Dependencies
const schedule = require('node-schedule');
const moment = require('moment');
const config = require('../config/config');
const logger = require('../config/logger');
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
    } else {
        logger.debug('Outside blackout period.');
    }

}


isInBlackout();
