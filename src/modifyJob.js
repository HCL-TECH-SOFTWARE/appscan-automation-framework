/**
 * Modify a job that was set up using a scant file
 * Do things like change the starting url, login, password
 *
 * Uses following API calls:
 *  /jobs/<jobid>/dastconfig/updatescant
 */

/**
 * Dependencies
 */
const ase = require('./providers/ase');
const logger = require('../config/logger');
const config = require('../config/config');
//TODO: if tmp dir does not exist create this should handled my library

/**
 * Global Variables
 */

var testPolicyID = config.defaultTestPolicyID;
var jobId = null;
var startingUrl = null;
var loginUsername = null;
var loginPassword = null;
var required = 0;


// Assign argument values to variables
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-j') {
        jobId = process.argv[parseInt(arguments) + 1];
    } 
    if (process.argv[arguments] == '-u') {
        startingUrl = process.argv[parseInt(arguments) + 1];
        required = 1;
    } 
    if (process.argv[arguments] == '-l') {
        loginUsername = process.argv[parseInt(arguments) + 1];
        required = 1;
    } 
    if (process.argv[arguments] == '-p') {
        loginPassword = process.argv[parseInt(arguments) + 1];
        required = 1;
    } 

    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        console.log('-j Job ID');
        console.log('-u Starting URL');
        console.log('-l Application credentials Login/username');
        console.log('-p Application credentials password');
        console.log('-h This help text');
        return
    }
}

if(!jobId || !required){
    logger.error('You must pass a job ID and at least one argument');
    logger.info('-h for help');
    return;
}


// modify job
ase.updateJobScant(jobId, startingUrl, loginUsername, loginPassword, (didUpdateDASTJob) => {
    if (didUpdateDASTJob.success) {
        logger.info('Successfully updated job: #'+jobId);
        logger.info('Note: Success detection may not be working');

    } else {
      logger.info('Could not update job');
    }

})


