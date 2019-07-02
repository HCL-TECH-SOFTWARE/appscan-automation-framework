/**
 * Get IDs of all Folders and Policies 
 *
 * Calls the following API endpoints:
 * /jobs/<jobID>
 * /folderitems/<jobID>/statistics/xml
 *
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
 * Get the general details of the job
 * Note: This may fail if the job wasn't originally created from a scant file
 */
 ase.getDASTJobDetails(jobID, (didGetJobDetails) => {
    if (didGetJobDetails) {
        console.log(didGetJobDetails);
    } else {
      logger.info('Could not get job Details');
    }
 })


/**
 * Get the scan status and informaion about the scan
 * Note: This will fail if the job has never been run before
 */
 ase.getDASTScanStatistics(jobID, (didGetJobStats) => {
    if (didGetJobStats) {
        
        /*
        console.log("Response code:");
        console.log(didGetJobStats.req.res.statusCode);
        console.log("Response header:");
        console.log(didGetJobStats.caseless.dict);
        console.log("Response body:");
        console.log(didGetJobStats.body);
        */
        var parseString = require('xml2js').parseString;
        var xml = didGetJobStats.body;
        parseString(xml, function (err, result) {
            var scanStatus = result.statistics.$;
            delete scanStatus.xmlns;
            delete scanStatus["xmlns:xsi"];
            delete scanStatus["xmlns:xsd"];
            console.log(scanStatus);
        });
        
    } else {
      logger.info('Could not get job statistics, this could mean job has never been run');
    }
 })

return



