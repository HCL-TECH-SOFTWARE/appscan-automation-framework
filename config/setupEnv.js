const logger = require('./logger');

var asePasswordJson = require('./aseconfig.json');
var encryption = require('../src/providers/encrypt');

var fs = require('fs');
var data = {};
fs.readFile('asePasswordJson', 'utf8',
    function (err, contents) {
    });
    /// USE API KEY THEN REMOVE IT
if (asePasswordJson.asePasswordJson) {
    data.asePass = encryption.decrypt(asePasswordJson.asePasswordJson)
} else {
    logger.error('No ASE password set.  Please run node scripts/updateASEPassword.js first....');
}

// Move this out to the script of the run as a service script
var serviceAccountPasswordJson = require('./serviceAccountConfig.json');

if (serviceAccountPasswordJson.serviceaccountpassword) {
    data.serviceAccountPass = encryption.decrypt(serviceAccountPasswordJson.serviceaccountpassword)
}
module.exports = data;