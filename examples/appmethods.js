const asoc = require('../src/providers/asoc');

//returns appId
function findOrCreateApp(appname, callback) {
    asoc.getAppId(appname, cbappdata => {
        let appsFound = cbappdata.length;
        if (appsFound === 0) {
            console.log('Application does not exist in ASoC, will create: ' + appname);
            asoc.createApplication(appname, cb=> {
                callback(cb.Id);
            })
        } else if (appsFound === 1) {
            console.log('Application found ASoC with Id: ' + cbappdata[0].Id);
            callback(cbappdata[0].Id);
        } else {
            console.log('getAppId returned invalid number of applications: ' + appsFound);
        }
    })
}

