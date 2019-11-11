const ase = require('./providers/ase');
const logger = require('../config/logger');
var moment = require('moment');

//TODO fix logging

ase.getApp(cb => {
  var appIdArr = cb.body.map(function (app) { return app.id; });
  [...appIdArr].forEach(function (appId) {
    //console.log('appId is: ' + appId);
    ase.getApplicationScans(appId, (result) => {
      console.log('Processing appId: ' + appId);
      let scanList = result.body;
      let length = Object.keys(scanList).length;
      if (length > 0 && lastScanWasToday(scanList)) {
        console.log(scanList);
        console.log('Found scan from today');
        ase.appSecurityReport(appId, 'XML', 'high', (result) => {
          console.log('result of report gen: ' + JSON.stringify(result));
          let tmp = result.location.split("/");
          let reportId = tmp[tmp.length - 2];
          console.log('reportId: ' + reportId);
          //TODO add max tries
          let pollForReport = setInterval(function () {
            ase.getReportStatus(reportId, (status) => {
              let statusCode = status.statusCode;
              logger.debug('Status of ' + reportId + ': ' + statusCode);
              if (statusCode == 201) {
                clearInterval(pollForReport);
                logger.debug('ready to get report');
                ase.getReport(reportId, (msg) => {
                  console.log(msg);
                });
              } else {
                logger.debug('report no ready, trying agian in 5s');
              }
            });
          }, 5000)
        });
      }
    });
  });
});


// polling from
//https://stackoverflow.com/questions/13092399/asynchronous-wait-for-an-condition-to-be-met



function lastScanWasToday(scanList) {
  //we only want elements in the object that have the lastRunDate key
  let hasLastRun = scanList.filter(scan => scan.lastRunDate);
  hasLastRun.sort((a, b) => b.lastRunDate - a.lastRunDate);
  //get lastRunScanDate
  let lastRunScanDate = hasLastRun[0].lastRunDateLocalized;
  logger.debug('Last run scan was: ' + lastRunScanDate)
  //grab date partt of lastRunScanDate
  let scanDateOnly = lastRunScanDate.split(/(\s+)/)[0];
  //convert to date string: 11/6/19 => Wed Nov 06 2019
  let scanDateObj = moment(scanDateOnly, 'MM/DD/YY').toDate();
  let lastRunScanDateString = scanDateObj.toDateString()
  console.log('lastRunScanDateString = ' + lastRunScanDateString);
  let today = new Date();
  // TODO confirm timezone is right in comparison - use moment?
  //let today = moment('11/07/19', 'MM/DD/YY').toDate();
  if (lastRunScanDateString == today.toDateString()) {
    logger.debug('Last scan was today');
    return true
  } else {
    return false
  }
}
