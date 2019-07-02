var config = require('../config/config');
var through2 = require('through2');
var split2 = require('split2');
var fs = require('fs');
var logger = require('../config/logger');
var ase = require('./providers/ase');
var asoc = require('./providers/asoc');
const he = require('he');
var async = require('async');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
const util = require('./util');
const domain = require('domain'); //TODO: This is deprecated

const loadToASE = config.loadToASE;
const loadToASoC = config.loadToASoC;
const createAssetGroupPerApp = config.createAssetGroupPerApp;
var locOfCSV = null;
var appAddedCount = 0;
var count = 0;

// Check if location of the CSV is passed in arguments
for (let arguments in process.argv) {
  if (process.argv[arguments] == '-l') {
    locOfCSV = process.argv[parseInt(arguments) + 1];
  }
  if (process.argv[arguments] == '-h' || process.argv[arguments] == '--help') {
    console.log('Command line usage is:');
    return console.log('-l location of the csv');
  }
}

/**
 * Check if the application exists in ASE or ASoC and return a true or false if the application exists or not respectively 
 * @param {*} appName 
 * @param {*} csvAppData 
 * @param {*} platform 
 * @param {*} callback 
 */
const doesAppExist = function (appName, csvAppData, platform, callback) {
  let doesAppExist = false;
  let appData = null;

  if (platform == 'ASOC') {
    asoc.getApplications((allApps) => {
      for (app in allApps) {
        if (allApps[app].Name == appName) {
          doesAppExist = true;
          appData = allApps[app];
        }
      }
      callback(doesAppExist, appData);
    })
  }

  else if (platform == 'ASE') {
    ase.getApp((allApps) => {
      for (app in allApps.body) {
        if (allApps.body[app].name == appName) {
          logger.debug('Application: ' + appName + ' Exists in ASE...')
          doesAppExist = true;
          appData = allApps.body[app];
          if (appData.description) {
            appData.description = he.decode(appData.description);
          }
        }
      }
      if (doesAppExist) {
        // get folder ID
        getFolderID(appData, platform, (updatedAppData) => {
          getServerGroupID(updatedAppData, csvAppData, platform, (updatedAppData) => {
            callback(doesAppExist, updatedAppData);
          })
        })
      } else {
        callback(doesAppExist, appData);
      }
    })
  } else {
    logger.error('applicationLoader - error checking if application exists.  ERROR: wrong platform parameters sent.');
    if (global.emitErrors) util.emitError('Wrong parameter sent for platform');
    //callback('Wrong parameter sent for platform');
  }
}


/**
 * Gets the folderID of the application
 * @param {*} appData 
 * @param {*} platform 
 * @param {*} callback 
 */
const getFolderID = function (appData, platform, callback) {
  let folderName = appData.name;
  if (platform == 'ASE') {
    ase.getFolders(allFolders => {
      for (let f in allFolders.body) {

        if (allFolders.body[f].folderName == folderName) {
          appData.folderID = allFolders.body[f].folderId
        }
      }
      if (appData.folderID) {
        callback(appData)
      } else {
        // Folder ID is null and does not exist
        // create folder
        appData.description = appData.description.replace(/#/g, "");
        appData.description = appData.description.replace(/;/g, "");
        appData.description = appData.description.replace(/&/g, "");
        ase.createFolder(1, appData.name, appData.description, null, (folder) => {
          parser.parseString(folder, function (err, result) {
            let folderID = result.folder.id;
            appData.folderID = folderID;
            callback(appData);
          })
        })
      }
      //TODO: if appData.folderID ==null then create folder and recall itself then callback 2 times
      //else if not null then callback
      // Do this for server group too
    })
  }
}


/**
 * Server groups only exists in ASE and it checks if the server group for the application exists.  If it does not
 * exist it will go ahead and create it.
 * @param {*} appData 
 * @param {*} csvAppData 
 * @param {*} platform 
 * @param {*} callback 
 */
const getServerGroupID = function (appData, csvAppData, platform, callback) {
  appData.name = he.decode(appData.name);
  if (platform === 'ASE') {
    ase.getServerGroups(allServerGroups => {
      parser.parseString(allServerGroups.body, function (err, result) {
        logger.debug('Server group resp1: ' + JSON.stringify(result));
        let serverGroups = result['server-groups']['server-group'];
        for (let s in serverGroups) {
          let app = serverGroups[s]['$'].name;
          //logger.verbose('MOTS: ' + appMOTSID);
          //logger.verbose('server grup name: ' + serverGroupMOTSID);
          if (app == appData.name) {
            let serverGroupDomainType;
            let serverGroupDomain;
            //Use these as temp then iterate over to convert to string
            if (csvAppData.domainType == 'iprange') {
              for (let domain in serverGroups[s]['server-group-iprange']) {
                if (serverGroups[s]['server-group-iprange'][domain]['$'].iprange == csvAppData.domain) {
                  appData.ServerGroupDomain = serverGroups[s]['server-group-iprange'][domain]['$'].iprange;
                  appData.ServerGroupDomainType = Object.keys(serverGroups[s]['server-group-iprange'][domain]['$'])[1];
                }
              }
              appData.serverGroupID = serverGroups[s]['$'].id;
            }
            if (csvAppData.domainType == 'domains' || csvAppData.domainType == 'ip') {
              for (let domain in serverGroups[s]['server-group-domain']) {
                if (serverGroups[s]['server-group-domain'][domain]['$'].domain == csvAppData.domain) {
                  appData.ServerGroupDomain = serverGroups[s]['server-group-domain'][domain]['$'].domain;
                  appData.ServerGroupDomainType = Object.keys(serverGroups[s]['server-group-domain'][domain]['$'])[1];
                }
              }
              appData.serverGroupID = serverGroups[s]['$'].id;
            }
          }
        }
        if (appData.serverGroupID) {
          callback(appData);
        } else {
          // Server group does not exist.  Create it
          ase.createServerGroup(appData.name, csvAppData.domain, csvAppData.domainType, (servergroup) => {
            parser.parseString(servergroup, function (err, result) {
              logger.debug('Server group resp: ' + JSON.stringify(result));
              if (result.errorMessage) {
                logger.error('Error trying to create server group, ' + result.errorMessage.errorMessage);
                if (global.emitErrors) util.emitError(err);
              } else {
                let servergroupID = result['server-groups']['server-group'][0]['$'].id;
                if (result['server-groups']['server-group'][0]['server-group-domain']) {
                  appData.ServerGroupDomainType = [Object.keys(result['server-groups']['server-group'][0]['server-group-domain'][0]['$'])[1]];
                  appData.ServerGroupDomain = result['server-groups']['server-group'][0]['server-group-domain'][0]['$'][Object.keys(result['server-groups']['server-group'][0]['server-group-domain'][0]['$'])[1]];
                }
                if (result['server-groups']['server-group'][0]['server-group-iprange']) {
                  appData.ServerGroupDomainType = [Object.keys(result['server-groups']['server-group'][0]['server-group-iprange'][0]['$'])[1]];
                  appData.ServerGroupDomain = result['server-groups']['server-group'][0]['server-group-iprange'][0]['$'][Object.keys(result['server-groups']['server-group'][0]['server-group-iprange'][0]['$'])[1]];
                }
                if (result['server-groups']['server-group'][0]['server-group-ip']) {
                  appData.ServerGroupDomainType = [Object.keys(result['server-groups']['server-group'][0]['server-group-ip'][0]['$'])[1]];
                  appData.ServerGroupDomain = result['server-groups']['server-group'][0]['server-group-ip'][0]['$'][Object.keys(result['server-groups']['server-group'][0]['server-group-ip'][0]['$'])[1]];
                }
                appData.serverGroupID = servergroupID;
                callback(appData);
              }
            })
          })
        }
      })
    })
  }
}


/**
 * This function updates the applications data
 * @param {*} oldAppDataJSON 
 * @param {*} newAppDataJSON 
 * @param {*} platform 
 * @param {*} callback 
 */
const updateApp = function (oldAppDataJSON, newAppDataJSON, platform, callback) {
  if (platform == 'ASOC') {
    // update application
    asoc.updateApplication(oldAppDataJSON.Id, newAppDataJSON.application_Id, oldAppDataJSON.AssetGroupId, newAppDataJSON.application_descriptions, '', newAppDataJSON.development_contact, (response) => {
      logger.info('Successfully updated application: ' + oldAppDataJSON.Name + ' on application security on cloud...');
      callback();
    })
  }

  if (platform == 'ASE') {
    ase.updateApp(oldAppDataJSON.id, oldAppDataJSON.lastupdated_timestamp, newAppDataJSON.application_Id, newAppDataJSON.application_descriptions, newAppDataJSON.tag, newAppDataJSON.development_contact, (response) => {
      ase.updateFolder(oldAppDataJSON.folderID, newAppDataJSON.application_Id, newAppDataJSON.application_descriptions, newAppDataJSON.development_contact, (response) => {
        ase.updateServerGroup(oldAppDataJSON.serverGroupID, newAppDataJSON.application_Id, newAppDataJSON.domain, newAppDataJSON.domainType, oldAppDataJSON.ServerGroupDomain, oldAppDataJSON.ServerGroupDomainType, (resp) => {
          logger.info('Successfully updated application: ' + oldAppDataJSON.name + ' on AppScan Enterprise...');
          callback();
        })
      })
    })
  }
}
/**
 * This function will create a new application.  For the ASE platform it will create a new application on the monitor side, create a folder for that application
 * on the scans side, and create a server group for the application.  For the ASoC platform, it will create a asset group for the application
 * and create a new application and place that application in the asset group.  
 */
const createApp = function (appDataJSON, platform, callback) {
  if (platform == 'ASOC') {
    // create assest group - naming asset group the same as app name
    createAssetGroup(appDataJSON.application_Id, null, (assetGroupId) => {
      // create application and tie to asset group if not null
      asoc.createApplication(appDataJSON.application_Id, assetGroupId, appDataJSON.application_descriptions, '', appDataJSON.development_contact, (response) => {
        if (response.Id) {
          logger.info('Successfully created application: ' + response.Name + ' on application security on cloud...');
        }
        callback();
      })
    })
  }

  if (platform == 'ASE') {
    logger.debug('Creating folder application description: ' + JSON.stringify(appDataJSON));
    ase.createApp(appDataJSON.application_Id, appDataJSON.application_descriptions, appDataJSON.tag, '', (response) => {
      // create folder
      ase.createFolder(1, appDataJSON.application_Id, appDataJSON.application_descriptions, null, (folder) => {
        // create server group
        ase.createServerGroup(appDataJSON.application_Id, appDataJSON.domain, appDataJSON.domainType, (servergroup) => {
          if (response.id) {
            logger.info('Successfully created application: ' + response.name + ' on AppScan Enterprise...');
          }
          callback();
        })
      })
    })
  }
}


/**
 * 
 * @param {*} appDataJSON JSON object with app data
 * @param {*} platform which platform this app is associated with (EX: ASOC or ASE)
 * 
 * This takes in the JSON app data object and creates a new application in ASoC
 */
const loadApp = function (newAppDataJSON, platform, callback) {
  let appName = newAppDataJSON.application_Id;
  // Check if app exists
  doesAppExist(appName, newAppDataJSON, platform, (doesAppExist, appData) => {
    if (doesAppExist) {
      if (appData) {
        // If app exists and update app
        updateApp(appData, newAppDataJSON, platform, () => {
          callback();
        })
      }
    } else {
      // If does not exist create new app
      createApp(newAppDataJSON, platform, () => {
        callback();
      })
    }
  })
}


/**
 * Asset groups only exist in ASoC and this function creates a new asset group
 * @param {*} assetGroupName 
 * @param {*} description 
 * @param {*} callback 
 */
const createAssetGroup = function (assetGroupName, description, callback) {
  if (createAssetGroupPerApp) {
    asoc.createAssetGroup(assetGroupName, description, (assetGroupInfo) => {
      let assetGroupID = assetGroupInfo.Id;
      callback(assetGroupID);
    })
  } else {
    callback(null);
  }
}

module.exports = processRecord = () => {

  // const parseCSV = () => {
  //   let templateKeys = []
  //   let parseHeadline = true
  //   return through2.obj((data, enc, cb) => {
  //     //logger.verbose('DATA: ' +  JSON.stringify(data))
  //     if (parseHeadline) {
  //       templateKeys = [data
  //         .toString()]
  //       //.split('<')
  //       parseHeadline = false
  //       return cb(null, null)
  //     }
  //     const entries = [data
  //       .toString()]
  //     //.split('<')
  //     const obj = {}
  //     templateKeys.forEach((el, index) => {
  //       obj[el] = entries[index]
  //     })
  //     return cb(null, obj)
  //   })
  // }
  // const processRecord = () => {
  return through2.obj(function (data, enc, cb) {
    let dom = domain.create();
    dom.on('error', err => {
      cb(err);
    });

    dom.run(function () {
      let appTag = [];
      // Implement your own processing 
      // logic here e.g.:
      for (t in data) {
        console.log('------------------')
        let key = t.split(',');
        let value;
        if (data[t].split('"').length > 1) {
          value = data[t].split('",');
        } else {
          value = data[t].split(',');
        }
        // Build appDataJSON
        let appDataJSON = {}
        for (item in key) {
          let parsedKey = key[item].replace(/\s/g, '').replace(/"/g, "").toLowerCase();
          let parsedValue;
          if (value[item] == undefined) {
            parsedValue = null;

          } else {
            parsedValue = value[item].replace(/\s/g, '').replace(/"/g, "").toLowerCase();
          }

          console.log("PARSED DATA: " + parsedKey + " : " + parsedValue);

          if (parsedKey == 'applicationid') {
            appDataJSON.application_Id = parsedValue;
          }

          if (parsedKey == 'applicationacronym') {
            // check if application acronym is blank
            if (parsedValue.length > 0) {
            } else {
              if (global.emitErrors) util.emitError('No application acronym set please set application acronym!');
              return logger.error('No application acronym set please set application acronym!');
            }
            // combine application ID and application acronym
            let appName;
            if (appDataJSON.application_Id) {
              appName = appDataJSON.application_Id + '-' + parsedValue;
            } else {
              appName = parsedValue;
              if (global.emitErrors) util.emitError('No application ID set please set application ID!');
              return logger.error('No application ID set please set application ID!');
            }
            appDataJSON.application_Id = appName;
          }

          if (parsedKey == 'applicationdescription') {
            // Dont used parsed value because its description
            if (value[item] != undefined) {
              appDataJSON.application_descriptions = value[item].replace(/"/g, "");
            } else {
              appDataJSON.application_descriptions = ' ';
            }
            // Only allow up to 1020 characters because ASE does not allow more than 1024 in description
            if (appDataJSON.application_descriptions.length > 1020) {
              appDataJSON.application_descriptions = appDataJSON.application_descriptions.substring(0, 1020);
            }
          }

          if (parsedKey == 'pciindicator') {
            if (parsedValue == 'yes') {
              appTag.push('PCI');
            }
          }


          if (parsedKey == 'domain') {
            if (value[item] != undefined) {
              appDataJSON.domain = value[item].replace(/"/g, "");
            }
          }

          if (parsedKey == 'domain_type') {
            if (value[item] != undefined) {
              appDataJSON.domainType = value[item].replace(/"/g, "");
            }
          }


          if (parsedKey == 'applicationcontact') {
            appDataJSON.development_contact = parsedValue;
          }
        }
        appDataJSON.tag = appTag;

        // Check if App ID and app acroynm exists if not stop!
        if (!appDataJSON.application_Id) {
          if (global.emitErrors) util.emitError('Application ID or application acronym');
          return logger.error('Application ID or application acronym')
        }


        // Add application to ASE
        async.parallel({
          ase: function (callback) {
            if (loadToASE) {
              loadApp(appDataJSON, 'ASE', () => {
                callback();
              });
            } else {
              logger.info('Not loading application to AppScan Enterprise because loadToASE set to false.');
              callback();
            }
          },
          asoc: function (callback) {
            if (loadToASoC) {
              loadApp(appDataJSON, 'ASOC', () => {
                callback();
              })
            } else {
              logger.info('Not loading application to application security on cloud because loadToASoC set to false.');
              callback();
            }
          }
        }, (err, results) => {
          console.log('Both function completed!');
          logger.info('Added ' + appAddedCount + ' applications!');
          appAddedCount++;
          logger.info('Added ' + appAddedCount + ' applications!');


          // REMOVE COUNT!!!
          if (count < 11) {
            cb();
          }
        })
        console.log('JSON: ' + JSON.stringify(appDataJSON));
      }
    });
  })
}

if (process.argv[1].endsWith('applicationLoader.js')) { //Script invoked directly

  if (locOfCSV === null || locOfCSV === undefined) {
    return console.log('Please enter location of csv -l')
  }

  // adapted from Stackoverflow: https://stackoverflow.com/questions/16010915/parsing-huge-logfiles-in-node-js-read-in-line-by-line/16013228
  fs.createReadStream(locOfCSV)
    // Read line by line
    .pipe(split2())
    // Parse CSV line
    .pipe(util.parseCSV())
    // Process your Records
    .pipe(processRecord())
}