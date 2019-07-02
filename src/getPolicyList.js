/**
 * Get IDs of all Policies  
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



/**
 * Get list of Policies
 * 
 */

  //TODO: Handle the XML response properly instead of using string replacement
  // May not be necessary in ASE 9.0.3.12 since responses are moving to json format
 ase.getTestPolicies((didGetTestPolicies) => {
  
    if (didGetTestPolicies.body) {
    
    var policies = didGetTestPolicies.body.replace(/  <testpolicy id=/g, "");
    policies = policies.replace("<?xml version=\"1.0\" encoding=\"utf-8\"?>", "")
    policies = policies.replace("<testpolicies xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns=\"http://www.ibm.com/Rational/AppScanEnterprise\">", ""); 
    policies = policies.replace(/<testpolicy/g, "");
    policies = policies.replace("</testpolicies>", "");
    policies = policies.replace(/"/g, "");
    policies = policies.replace(/\/>/g, "");
    policies = policies.replace(/name=/g, "");
    policies = policies.replace(/description=/g, " :: ");
    
    
        logger.info('~~~~~~~~~~');
        logger.info('~Policies~');
        logger.info('~~~~~~~~~~');
        logger.info(policies);

    } else {
      logger.info('Could not get Policies');
    }
 })
