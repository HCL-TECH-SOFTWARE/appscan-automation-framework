/**
 * logger.js
 * 
 * This contains the configuration for logging
 */

 // Dependencies
 const winston = require('winston');
 const fs = require('fs');
 const path = require('path');
 const config = require('./config');
 
 // Global variables
 const env = process.env.NODE_ENV || 'development';
 const logDir = config.frameworkLogsDir;
 
 winston.emitErrs = true;
 
 // Create the log directory if it does not exist
 if (!fs.existsSync(logDir)) {
     fs.mkdirSync(logDir);
 }
 
 const tsFormat = () => (new Date()).toLocaleTimeString();
 
 
 var logger = new winston.Logger({
     transports: [
         // colorize the output to the console
         new (winston.transports.Console)({
             timestamp: tsFormat,
             colorize: true,
             level: 'debug'
         }),
 
         new (require('winston-daily-rotate-file'))({
             filename: `${logDir}/-Application.log`,
             timestamp: tsFormat,
             datePattern: 'YYYY-MM-DD',
             prepend: true,
             level: env === 'development' ? 'verbose' : 'info'
         })
     ]
 });
 
 module.exports = logger;
 module.exports.stream = {
     write: function(message) {
         logger.info(message);
     }
 }
 
 // logger.debug('Debugging info');
 // logger.verbose('Verbose info');
 // logger.info('Hello info');
 // logger.warn('Warning message');
 // logger.error('Error info');