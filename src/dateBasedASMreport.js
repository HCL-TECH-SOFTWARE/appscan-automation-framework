const ase = require('./providers/ase');
const logger = require('../config/logger');




//TODO - get all applications, loop over them one at a time (blocking)



ase.getApplicationScans(176, (result) => {
    console.log(result.body);
});


//TODO fix logging

//Turn into a function -> pass object of scans, boolean scan happened today or not

//we only want elements in the object that have the lastRunDate key
const hasLastRun = a.filter(scan => scan.lastRunDate);

// sort resulting array
hasLastRun.sort((a, b) =>  b.lastRunDate - a.lastRunDate);

//get lastRunScanDate
let lastRunScanDate = hasLastRun[0].lastRunDateLocalized;
//convert to date string: 11/6/19 3:40 PM => Wed Nov 06 2019
let lastRunScanDateString = new Date(lastRunScanDate).toDateString();

console.log(lastRunScanDate);
console.log(lastRunScanDateString);

var today  = new Date();

if (lastRunScanDateString == today.toDateString()) {
    logger.debug('last scan was today - creating report')
    //create report for this app
} else {
    logger.debug('last scan was: ' + lastRunScanDate + ' skipping...')
}



ase.appSecurityReport(175,'XML','high', (result) => {
    console.log('result of report gen: ' + JSON.stringify(result));
    let tmp = result.location.split("/");
    let reportId = tmp[tmp.length-2];
    console.log('reportId: ' + reportId);
    //TODO add max tries
    let pollForReport = setInterval(function() {
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

  // polling from
  //https://stackoverflow.com/questions/13092399/asynchronous-wait-for-an-condition-to-be-met
