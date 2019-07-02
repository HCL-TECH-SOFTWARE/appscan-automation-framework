/**
 * Create a job based on a template and run it
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

var templateID = config.defaultTemplateID;
var testPolicyID = config.defaultTestPolicyID;
var defaultFolderID = config.defaultFolderID;
var applicationID = null;
var jobName = config.defaultJobName;


// Assign argument values to variables
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-t') {
        templateID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-p') {
        testPolicyID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-f') {
        defaultFolderID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-n') {
        jobName = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-a') {
        applicationID = process.argv[parseInt(arguments) + 1];
    }

    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        console.log('-t template Id to be used to create scan');
        console.log('-p test policy Id to be used for scan');
        console.log('-f folder Id to store scan in ASE');
        console.log('-n name of the job.  If not sent will use default name in config');
        console.log('-a application Id to associate scan to in ASE');
        return 
    }
}


/**
 * Create job
 * 
 * ase.createJob = function (templateId, testPolicyId, folderId, applicationId, name, description, contact, fileLoc, callback)
 */
ase.createJob(templateID, testPolicyID, defaultFolderID, applicationID, jobName, 'Created via SimpleDAST.js', 'Contact1', null, (didCreateJob) => {
    if (didCreateJob.success) {
        logger.info('Successfully created job: #'+didCreateJob.msg.id);
    } else {
      logger.info('Could not create job');
    }

})
