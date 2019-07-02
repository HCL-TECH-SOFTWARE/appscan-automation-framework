
/**
 * Get IDs of all Folders and Policies  
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
 * Get list of Folders
 * 
 */

 ase.getFolders((didGetFolders) => {
     
    if (didGetFolders.body) {
        logger.info('~~~~~~~~~');
        logger.info('~Folders~');
        logger.info('~~~~~~~~~');


        for (var i in didGetFolders.body) {
          val = didGetFolders.body[i];
          logger.info('#'+val.folderId + ' ' + val.folderName);
        }

        logger.info('~~~~~~~~~');
        
    } else {
      logger.info('Could not get folders');
    }
 })

