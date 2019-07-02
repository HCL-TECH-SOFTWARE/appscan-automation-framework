const logger = require('./logger');
// If the environment variable is not set, then the application may not work properly...
if (!process.env.ASAF_HOME) {
    err = 'Please set the ASAF_HOME environment variable to the root of the Framework codebase.';
    const logger = require('../config/logger');
    logger.error(err);
    process.exit();
}

var asePasswordJson = require('./aseconfig.json');
var encryption = require('../src/providers/encrypt');
var asePass = null;
var fs = require('fs');
var data = {};
fs.readFile('asePasswordJson', 'utf8',
    function (err, contents) {
    });
if (asePasswordJson.asePasswordJson) {
    data.asePass = encryption.decrypt(asePasswordJson.asePasswordJson)
} else {
    logger.error('No ASE password set.  Please run node scripts/updateASEPassword.js first....');
}

var serviceAccountPasswordJson = require('./serviceAccountConfig.json');
var serviceAccountPass = null;
if (serviceAccountPasswordJson.serviceaccountpassword) {
    data.serviceAccountPass = encryption.decrypt(serviceAccountPasswordJson.serviceaccountpassword)
}
module.exports = data;