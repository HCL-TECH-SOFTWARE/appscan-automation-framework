/**
 * Create a job based on a template and run it
 */






/**
 * Dependencies
 */
const ase = require('./providers/ase');
const logger = require('../config/logger');

//TODO: if tmp dir does not exist create this should handled my library

/**
 * Global Variables
 */

var activityID = null;
var action = null;



/*
  logger.info('This module does not work yet');
  return;
*/



// Assign argument values to variables
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-s') {
        activityID = process.argv[parseInt(arguments) + 1];
    }
    
    if (process.argv[arguments] == '-a') {
        action = process.argv[parseInt(arguments) + 1];
    }
    
    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        console.log('-s scan activity id you want to stop');
        console.log('-a action code 3(suspend), 4(stop/discard), 5(stop/save)');
        console.log('-h this help text');
        return
    }
}


if(!activityID){
  logger.info('This requires a scan activity id using the -s flag');
  logger.info('Use the -h flag for help');
  return
}

if(!action){
  logger.info('This requires an action code using the -a flag');
  logger.info('Use the -h flag for help');
  return
}

/**
* Stop job
*/
logger.info('Stopping job: '+activityID);
ase.stopScan(activityID, action, (didStopJob) => {
    // return;

    if (didStopJob.statusCode == 204) {
        logger.info('Successfully stopped DAST scan for scan activity: #'+activityID);
    } else {
        logger.info('Failed!');
        logger.info(didStopJob.msg);
    }
})
