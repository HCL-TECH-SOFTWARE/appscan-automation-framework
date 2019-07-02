/**
 * Create a new application in your portfolio
 * Uses the following API enpoints:
 * /applications
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


var appName = null;
var appDescription = 'Application added via REST API';
var appContact = '';
var tagsArray = [];


// Assign argument values to variables
for (let arguments in process.argv) {
    if (process.argv[arguments] == '-n') {
        appName = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-d') {
        appDescription = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-c') {
        appContact = process.argv[parseInt(arguments) + 1];
    }
    if (process.argv[arguments] == '-t') {
        tagsArray.push(process.argv[parseInt(arguments) + 1]);
    }
    if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        console.log('-n Application name');
        console.log('-d Application description');
        console.log('-c Name or email address of developer contact person');
        console.log('-t A single application tag');
        console.log('-h This help text');
        return
    }
}

if(!appName){
  logger.error('You must provide a name for the application');
  logger.info('Use the -h flag for help');
  return
}


/**
 * Create Application
 * 
 * ase.createApp = function (name, description, tagsArray, development_contact, callback) 
 */
ase.createApp(appName, appDescription, tagsArray, appContact, (didCreateApp) => {

    if (didCreateApp.id) {
        logger.info('Successfully created application: '+appName+' id#'+didCreateApp.id);

    } else {
      logger.info('Could not create application: '+appName);
    }

})
