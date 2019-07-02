/**
 * Scheduler - this module schedules a black out period
 */
// Dependencies
const schedule = require('node-schedule');
const moment = require('moment');

// Global variables
var d;



schedule.scheduleJob('00 * * * *', function () {
    d = new Date();
    console.log('Ran job @ ' + d.getHours() + ':' + d.getMinutes());
})

