/**
 * This script starts the AppScan Enterprise proxy as a windows service
 * 
 * Note: To uninstall run command with flag -uninstall
 */
var service = require('node-windows').Service;
const config = require('../config/config');
const locOfASEProxyFile = config.locOfASEProxyFile;
var unistallService = false;


// Check if location of ASE proxy file is defined or not if not stop script
if (!locOfASEProxyFile) {
    return console.log('No location of AppScan Enterprise proxy js file.  Please define this in config file.');
}


// Check if unistall flag is sent
// Check if application ID is passed in arguments
var arguments = process.argv[2];
if (arguments == '-uninstall') {
    unistallService = true;
}


// Create a new service object
var aseService = new service({
    name: 'IBM Security AppScan Enterprise Proxy',
    description: 'The AppScan Enterprise proxy is used to collect traffic for DAST automation.',
    script: locOfASEProxyFile
})


// User that logs in for the service
aseService.logOnAs.domain = config.serviceAccountDomain;
aseService.logOnAs.account = config.serviceAccountUserID;
aseService.logOnAs.password = config.serviceAccountPass;



// Listen for the "install" event, which indicates the
// process is available as a service.
aseService.on('install', function () {
    aseService.start();
})


// Listen for the "uninstall" event, to uninstall service
aseService.on('uninstall', function () {
    console.log('Uninstall complete.');
})




if (unistallService) {
    aseService.uninstall();
} else {
    service.isAdminUser(function (isAdmin) {
        if (isAdmin) {
            aseService.install();
        } else {
            console.log('User is not a admin, user must have admin privileges to install this service...');
        }
    })
}
