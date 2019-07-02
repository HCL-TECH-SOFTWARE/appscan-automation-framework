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

var jobID = null;


// Assign argument values to variables
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-j') {
        jobID = process.argv[parseInt(arguments) + 1];
    }
    
    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        console.log('-j job id you want to run');
        console.log('-h this help text');
        return
    }
}


if(!jobID){
  logger.info('This requires a job id using the -j flag');
  logger.info('Use the -h flag for help');
  return
}


/**
* Run job
*/
logger.info('Running job: '+jobID);
ase.runJob(jobID, (didStartJob) => {
    if (didStartJob.success) {
        logger.info('Successfully started DAST scan for job: #'+jobID);
        console.log(didStartJob);
    } else {
        logger.info('Failed!');
        logger.info(didStartJob.msg);
    }
})
