const logger = require('./logger');

var asePasswordJson = require('./aseconfig.json');
var encryption = require('../src/providers/encrypt');

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

if (serviceAccountPasswordJson.serviceaccountpassword) {
    data.serviceAccountPass = encryption.decrypt(serviceAccountPasswordJson.serviceaccountpassword)
}
module.exports = data;