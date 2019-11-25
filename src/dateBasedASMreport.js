const ase = require('./providers/ase');
const logger = require('../config/logger');
const moment = require('moment');
const async = require('async');

/*
Example script to create xml report for any applicaiton that was scanned today
*/

//main loop 
buildAppIdArr(appIdArr => {
  console.log('Starting processing of appId Array: ' + appIdArr);
  async.forEachSeries(appIdArr, function (appId, cbAppIdLoop) {
    ase.appSecurityReport(appId, 'XML', null, null, (result) => {
      console.log('Processing appId: ' + appId);
      logger.debug('result of report gen: ' + JSON.stringify(result));
      let tmp = result.location.split("/");
      let reportId = tmp[tmp.length - 2];
      let tryNumber = 1;
      let pollForReport = setTimeout(function waitForReport() {
        ase.getReportStatus(reportId, (status) => {
          logger.debug('Attempt number: ' + tryNumber + ' to download report ' + reportId);
          let statusCode = status.statusCode;
          logger.debug('Status of ' + reportId + ': ' + statusCode);
          if (statusCode == 201) {
            logger.debug('Ready to get report');
            ase.getReport(reportId, null, (msg) => {
              clearTimeout(pollForReport);
              //console.log(msg);
              cbAppIdLoop();
            });
          } else {
            // 6 * 5s = 30s max
            if (tryNumber == 6) {
              logger.error('Max time waiting for report exceeded. No report generated for appId:' + appId);
              clearTimeout(pollForReport);
              cbAppIdLoop();
            } else {
              tryNumber++;
              logger.debug('Report not ready, trying again in 5s');
              setTimeout(waitForReport, 5000);
            }
          }
        });
      }, 5000);
    });
  });
});

function buildAppIdArr(callback) {
  let outAppIds = [];
  let countProcessed = 0;
  ase.getApp(cb => {
    var appIdArr = cb.body.map(function (app) { return app.id; });
    let appIdsToProcess = appIdArr.length;
    [...appIdArr].forEach(function (appId) {
      //NOTE: could limit to 10 or 20 at a time if needed
      ase.getApplicationScans(appId, (result) => {
        logger.debug('Checking appId: ' + appId);
        let scanList = result.body;
        let length = Object.keys(scanList).length;
        if (length > 0 && lastScanWasToday(scanList)) {
          logger.debug('Matching scan found for appId: ' + appId);
          logger.debug(scanList);
          outAppIds.push(appId);
          countProcessed++;
        } else {
          logger.debug('Skipping, no matching scans. AppId: ' + appId);
          countProcessed++;
        }
        if (countProcessed === appIdsToProcess) {
          callback(outAppIds);
        }
      });
    });
  });
}

function lastScanWasToday(scanList) {
  //we only want elements in the object that have the lastRunDate key
  let hasLastRun = scanList.filter(scan => scan.lastRunDate);
  //return here if none of the elements have lastRunDate key
  if (hasLastRun.length === 0) return false;
  hasLastRun.sort((a, b) => b.lastRunDate - a.lastRunDate);
  //get lastRunScanDate
  let lastRunScanDate = hasLastRun[0].lastRunDateLocalized;
  logger.debug('Last run scan was: ' + lastRunScanDate)
  //grab date partt of lastRunScanDate
  let scanDateOnly = lastRunScanDate.split(/(\s+)/)[0];
  //convert to date string: 11/6/19 => Wed Nov 06 2019
  let scanDateObj = moment(scanDateOnly, 'MM/DD/YY').toDate();
  let lastRunScanDateString = scanDateObj.toDateString()
  //console.log('lastRunScanDateString = ' + lastRunScanDateString);
  let today = new Date();
  if (lastRunScanDateString == today.toDateString()) {
    logger.debug('Last scan was today');
    return true
  } else {
    return false
  }
}

/*
example full json that could be used in ase.appSecurityReport

let reportJson =
{
  "config": {
      "executiveSummaryIncluded": true,
      "advisoriesIncluded": true,
      "issueConfig": {
          "issueAttributeConfig": {
              "showEmptyValues": false,
              "attributeLookups": [
                  "applicationname",
                  "cvss",
                  "comments",
                  "description",
                  "id",
                  "location",
                  "overdue",
                  "scanname",
                  "scanner",
                  "severityvalue",
                  "status",
                  "datecreated",
                  "fixeddate",
                  "lastupdated",
                  "custom_report_date",
                  "accesscomplexity",
                  "accessvector",
                  "authentication",
                  "availabilityimpact",
                  "confidentialityimpact",
                  "exploitability",
                  "integrityimpact",
                  "remediationlevel",
                  "reportconfidence",
                  "api",
                  "callingline",
                  "callingmethod",
                  "class",
                  "classification",
                  "databasename",
                  "databaseservicename",
                  "databasetype",
                  "databaseversion",
                  "discoverymethod",
                  "domain",
                  "element",
                  "externalid",
                  "host",
                  "line",
                  "package",
                  "path",
                  "port",
                  "projectid",
                  "projectname",
                  "projectversion",
                  "projectversionid",
                  "scheme",
                  "sourcefile",
                  "third-partyid",
                  "username",
                  "really_overdue"
              ]
          },
          "includeAdditionalInfo": true,
          "variantConfig": {
              "variantLimit": 1,
              "requestResponseIncluded": true,
              "trafficCharactersCount": -1,
              "differencesIncluded": true
          }
      },
      "applicationAttributeConfig": {
          "showEmptyValues": false,
          "attributeLookups": [
              "businessimpact",
              "businessunit",
              "description",
              "riskrating",
              "testingstatus",
              "criticalissues",
              "overdueissues",
              "totalissues"
          ]
      },
      "pdfPageBreakOnIssue": false,
      "sortByURL": false
  },
  "layout": {
      "reportOptionLayoutCoverPage": {
          "companyLogo": "",
          "additionalLogo": "",
          "includeDate": true,
          "includeReportType": true,
          "reportTitle": "Application Report",
          "description": "This report includes important security information about your application."
      },
      "reportOptionLayoutBody": {
          "header": "",
          "footer": ""
      },
      "includeTableOfContents": true
  },
  "reportFileType": "XML",
  "issueIdsAndQueries": [
      "status=open,status=inprogress,status=reopened,status=new,classification=definitive,classification=suspect,severity=medium",
      "status=open,status=inprogress,status=reopened,status=new,classification=definitive,classification=suspect,severity=high"
  ]
};

*/