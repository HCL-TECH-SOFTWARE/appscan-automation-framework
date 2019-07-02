const setupEnv = require('./setupEnv');
module.exports = {
    'saToolLocation': '<LOCATION_OF_THE_SA_CLIENT_TOOL>',
    'ASoCURL': 'https://appscan.ibmcloud.com/api/v2',
    'keyId': '',
    'keySecret': '',
    'filePath': process.env.ASAF_HOME,
    'ASEURL': 'https://<ASE URL>:<ASE PORT>/ase/api',
    'ASEUserID': '<DOMAIN_NAME>\\<USER_NAME>',
    'ASEPass': setupEnv.asePass,
    'ASEProxyServerURL': 'http://<Proxy Domain>:<Proxy Port (default is 8383)>/automation/',
    'ASEProxyServerDomain': '<Proxy Domain>',
    'computerPath': process.env.ASAF_HOME,
    'aseProxy': {
        'useProxy': false,
        'hostName': '',
        'port': ''
    },

    'asocProxy': {
        'useProxy': false,
        'hostName': '',
        'port': ''
    },

    //ThreadFix
    'threadFixRESTURL': 'https://<host>:<port>/threadfix/rest',
    'threadFixAPIKey': '<key>',


    // startASEProxyAsAService script
    // Location of AppScan Enterprise Proxy js file 
    'locOfASEProxyFile': null,
    'serviceAccountDomain': '<DOMAIN_NAME>',
    'serviceAccountUserID': '<USER_NAME>',
    'serviceAccountPass': setupEnv.serviceAccountPass,



    // ASoC API URL
    'ASoC_CreateApp_URL': '/Apps',


    // Location of audit reports
    'Loc_of_Audit_report': './audit_reports/',




    // auditReport
    'ASE_Audit_Report': true,
    'ASoC_Audit_Report': true,
    'Users_Audit_Report': true,
    'User_Profiles_Audit_Report': true,
    'User_Profiles_With_Type_Audit_Report': true,


    // applicationLoader
    'loadToASE': true,
    'loadToASoC': true,
    'createAssetGroupPerApp': true,



    // userAccessManager
    'addUserAccessToASE': true,
    'addUserAccessToASoC': true,
    'defaultASEUserAccessType': 'FULL',



    // DASTAutomation
    // Update values with your corresponding information in AppScan Enterprise
    'defaultTemplateID': 49,
    'defaultTestPolicyID': 3,
    'defaultFolderID': 4,
    'defaultJobName': 'Automation Scan',
    'alwaysCreateNewScan': false,


        // getCurrentScanJobs
        'Loc_of_Current_Scan_report': './current_scans_report/'
}
