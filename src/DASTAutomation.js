/**
 * This is the DAST Automation module.  
 */

/**
 * Dependencies
 */
const aseProxyServer = require('./providers/aseProxyServer');
const ase = require('./providers/ase');
const logger = require('../config/logger');
const config = require('../config/config');
const { exec } = require('child_process');
//TODO: if tmp dir does not exist create this should handled my library
/**
 * Global Variables
 */
const aseProxyServerDomain = config.ASEProxyServerDomain;
// The port the AppScan Proxy server is listening for the functional test traffic
var proxyPort;
var funcTest = null;
// The default template ID that will be used to run your scan.  This can be overriden by the -t flag.  The default value can be updated
// in config.js by changing the defaultTemplateID field
var templateID = config.defaultTemplateID;
// The default test policy ID that will be used to run your scan.  This can be overriden by the -p flag.  The default value can be updated
// in config.js by changing the defaultTestPolicyID field
var testPolicyID = config.defaultTestPolicyID;
// The default folder that will be used to store your scan.  This can be overriden by the -d flag.  The default value can be updated
// in config.js by changing the defaultFolderID field.  This value must be the folder ID and not the folder name
var defaultFolderID = config.defaultFolderID;
// The default application ID that will be used to associate your scan.  This can be overriden by the -a flag.
var applicationID = null;
// The default Job name that will be used to name your scan.  This can be overriden by the -n flag.  The default value can be updated
// in config.js by changing the defaultJobName field
var jobName = config.defaultJobName;
// This setting will either always update a scan if it exists, when set to false, or always create a new scan, when set to true.  The value
// of this can be set in config.js by changing alwaysCreateNewScan
const alwaysCreateNewScan = config.alwaysCreateNewScan;


// Check if location of the CSV is passed in arguments
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-f') {
        funcTest = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-t') {
        templateID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-p') {
        testPolicyID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-d') {
        defaultFolderID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-a') {
        applicationID = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-n') {
        jobName = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        console.log('-f command of the functional test.  Ex: "-f java -jar /Users/home/funcTest.jar"');
        console.log('-t template Id to be used to create scan');
        console.log('-p test policy Id to be used for scan');
        console.log('-d folder Id to store scan in ASE');
        console.log('-n name of the job.  If not sent will use default name in config');
        return console.log('-a application Id to associate scan to in ASE');
    }
}


if (funcTest) {

} else {
    return logger.error('Must pass in functional test scripts in parameter after -f flag.');
}

if (!jobName) {
    return logger.error('Must pass in scan job name in parameter after -n flag.');
}

/**
 * Checks to see if the AppScan Proxy server is up and running.  Needs to be running to use this module (located in Extras directory)
 * @param {*} callback 
 */
const isAseProxyServerUp = function (callback) {
    aseProxyServer.checkIfUp((isServerUp) => {
        if (isServerUp) {
            callback(isServerUp);
        } else {
            logger.error('AppScan Enterprise Proxy Server is down. Please confirm the ASEProxyServerURL in the config.js file and make sure this endpoint is up.');
        }
    })
}

/**
 * Starts the proxy to listen on a new port.  The port is optional if its not sent then it will start on a random port
 * @param {*} port 
 * @param {*} callback 
 */
const startAseProxy = function (port, callback) {
    aseProxyServer.startProxy((proxyInfo) => {
        logger.debug('Started ASE proxy, ' + JSON.stringify(proxyInfo));
        if (proxyInfo.success) {
            proxyPort = proxyInfo.port;
            callback();
        }
    }, port)
}


/**
 * Determines if the job name exists in the folder or not.  If it does exist then it will update the scan, if it does not exist then it will create
 * a new scan.  If you want it to create a new scan everytime then update the alwaysCreateNewScan in config.js to true.
 * @param {*} callback 
 */
const doesJobExist = function (callback) {
    let jobDetails = {
        doesExist: false
    };
    if (alwaysCreateNewScan) {
        callback(jobDetails);
    } else {
        ase.getListOfDASTJobs(defaultFolderID, (DASTJobs) => {
            for (jobs in DASTJobs.body) {
                if (DASTJobs.body[jobs].name == jobName) {
                    jobDetails.doesExist = true;
                    jobDetails.jobID = DASTJobs.body[jobs].id;
                }
            }
            callback(jobDetails);
        })
    }
}






/**
 * Check if ASE proxy is installed and running if not error out
 */
isAseProxyServerUp((isServerUp) => {
    if (isServerUp) {
        /**
         * Start proxy at listening port
         */
        startAseProxy(null, () => {
            /**
               * call selenium traffic to run on specfic port
               */
            exec(funcTest + ' ' + aseProxyServerDomain + ':' + proxyPort, (err, stdout, stderr) => {
                if (err) {
                    logger.error('Error running functional test, ' + JSON.stringify(err));
                    console.log(stdout);
                    console.log(stderr);
                } else {
                    logger.debug('Successfully completed functional test...');
                    /**
                    * stop proxy listening port
                    */
                    aseProxyServer.stopProxy(proxyPort, (didStop) => {
                        if (didStop.success) {
                            /**
                     * Download DAST config file
                     */
                            aseProxyServer.downloadTraffic(proxyPort, (didDowloadComplete) => {
                                if (didDowloadComplete.success) {
                                    let trafficFile = didDowloadComplete.location;

                                    /**
                                   * Check if job exists and if so just update it
                                   */
                                    doesJobExist((jobDetails) => {
                                        if (jobDetails.doesExist) {
                                            // Job exists - update
                                            /**
                                            * Update job with the traffic file
                                            */
                                            ase.updateDASTJob(jobDetails.jobID, 'add', trafficFile, (didUpdateJob) => {
                                                if (didUpdateJob.success) {
                                                    logger.info('Successfully updated job with traffic data');

                                                    /**
                                                    * Run job
                                                    */
                                                    ase.runJob(jobDetails.jobID, (didStartJob) => {
                                                        if (didStartJob.success) {
                                                            logger.info('Successfully started DAST scan');
                                                        }
                                                    })
                                                }
                                            })
                                        } else {

                                            /**
                                             * Create job - using regular scan template (49), complete policy (3)
                                             */
                                            ase.createJob(templateID, testPolicyID, defaultFolderID, applicationID, jobName, 'Running scan from automation', 'Contact1', null, (didCreateJob) => {
                                                if (didCreateJob.success) {
                                                    logger.info('Successfully created job');

                                                    /**
                                                     * Update job with the traffic file
                                                     */
                                                    ase.updateDASTJob(didCreateJob.msg.body.id, 'add', trafficFile, (didUpdateJob) => {
                                                        if (didUpdateJob.success) {
                                                            logger.info('Successfully updated job with traffic data');

                                                            /**
                                                            * Run job
                                                            */
                                                            ase.runJob(didCreateJob.msg.body.id, (didStartJob) => {
                                                                if (didStartJob.success) {
                                                                    logger.info('Successfully started DAST scan');
                                                                }
                                                            })
                                                        }
                                                    })

                                                }
                                            })
                                        }
                                        // Use TemplatID 49 - regular scan
                                        // folder id - 4 - pnp admin
                                    })
                                }
                            })
                        }
                    })
                }
            })
        })
    }
})
