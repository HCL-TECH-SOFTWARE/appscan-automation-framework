# AppScan Automation Framework

This framework makes it simple to interact with the APIs for HCL AppScan Enterprise and HCL AppScan on Cloud which can be used to automate tasks.  This framework also contains pre-built modules that perform certain tasks that will be explained below.

## Contributing
We would love to have you contribute to the AppScan Automation Framework.  First, please review our [Contribution Guide](CONTRIBUTING.md).

## Issues
If you find issues/bug please open up an issue in the repo with your node version info along with the stack trace and the log files.  Also, include which module you are trying to run and we will work on trying to resolve the issue.  

## License
Code is under the [MIT License](LICENSE.txt).

## Getting Started
1. Pull down this repo and in the root directory run:

        $ npm install

2. Duplicate the configSample.js file in the config directory.  Then rename it to config.js

3. Update the fields in the config, to your appropriate settings.  In the config you will see each modules names and then settings that are associated with that specific module.  Those settings will be explained below for each module.

4. Make sure to enter ASEURL, keyId, and KeySecret for AppScan Enterprise and/or AppScan on Cloud, which is done in the config.js.

5. If you would like to install the AppScan Enterprise Proxy as a windows service run the startASEProxyAsAService.js script located in the scripts directory but make sure to update the encrypt.js file located in src\providers\ and replace encryptionKey with your own encryption key.****This is important!

## Pre-Built Modules
All the pre-built modules are located in the src directory.  Each module does a certain task and will be explained below.  Make sure the settings in the config.js file are correct and up to date with what you want, then navigate to the root directory of the application.  
### userAccessManager
This module takes in a CSV file with a list of users and the applications they have access to.  It will then provision their access to the respective application(s).  This will give users access to ONLY the applications in the CSV file for that user and remove access to all other applications for IBM Application Security on Cloud and/or IBM AppScan Enterprise.  For AppScan Enterprise it will create server groups for each application and assign users with specific server groups as well as assign them to folders with the permissions stated in the CSV.  Note: user accounts must be created prior to running this module and all application folders to be granted access to must exist under Scans>ASE>Users.  The settings for this module in the config.js are:

    addUserAccessToASE - this can be set to true or false.  When set to true it will provision the user's access for IBM AppScan Enterprise.
    addUserAccessToASoC - this can be set to true or false.  When set to true it will provision the user's access for IBM Application Security on Cloud.  
    defaultASEUserAccessType - this can be set to FULL, BASIC, READ_ONLY, and NONE.  Details on the levels can be found in IBM AppScan Enterprise on the monitor tab in an application.  Then click view details and scroll down to the user's section and click on the informational i.  This access will be the default access given to the user's for the application.  

#### To use this module
A [template of the csv](sampledata/userAccessSample.csv) to be used is located in the sampledata directory and its named userAccessSample.csv.  The option for the application is:

    -l location of CSV file (required) - this is the location of the CSV file that has the information of the users and applications. 

Example:

    $ node src/userAccessManager.js -l /home/userAccess.csv

### applicationLoader
This module takes in a CSV file with application information and it will create the applications in IBM AppScan Enterprise and/or IBM Application Security on Cloud.  For applications on IBM Application Security on Cloud, it will also create a new asset group, for the application and assign the application to the asset group so you can assign users to only the applications they need access to.  If you do not want this to happen, then set createAssetGroupPerApp in the config.js file to false and then the application will be placed in the default asset group.  A [template of the csv](sampledata/appsSample.csv) to be used is located in the sampledata directory and its named appsSample.csv.  The settings for this module in the config.js are:

    loadToASE - this can be set to true or false.  When set to true it will create the application in IBM AppScan Enterprise.
    loadToASoC - this can be set to true or false.  When set to true it will create the application in IBM Application Security on Cloud.
    createAssetGroupPerApp - this can be set to true or false.  When set to true it will create an asset group per application and assign that application to the asset group in IBM Application Security on Cloud.  

#### To use this module
The option for the application is:

    -l location of CSV file (required) - this is the location of the CSV file that has the information of the applications. 

Example:

    $ node src/applicationLoader.js -l /home/applicationCSV.csv

### auditReport
This module creates audit reports for both IBM AppScan Enterprise and IBM Application Security on Cloud and can contain user data and user type data.  This is great to audit the access levels for users that have access to these tools and to monitor the different account types as well.  If all types of reports from both tools are turned on it will generate 6 reports and each report will have a timestamp.  The settings for this module in the config.js are:

    ASE_Audit_Report - this can be set to true or false.  When set to true it will create an audit report for IBM AppScan Enterprise.
    ASoC_Audit_Report - this can be set to true or false.  When set to true it will create an audit report for IBM Application Security on Cloud.
    Users_Audit_Report -  this can be set to true or false.  When set to true it will generate an audit report that contains all the users in IBM AppScan Enterprise and/or IBM Application Security on Cloud.
    User_Profiles_Audit_Report - this can be set to true or false.  When set to true it will generate an audit report that contains all the account types.
    User_Profiles_With_Type_Audit_Report - this can be set to true or false.  When set to true it will generate an audit report that contains all the users and their account type to see their access level. 

#### To use this module
This module does not take in any parameters.

    $ node src/auditReport.js

### DASTAutomation
This module will help get you up and running with Dynamic Application Security Testing (DAST) very quickly.  This module leverages your current functional test to use that traffic to run DAST.  We have supplied a sample functional test, selenium java jar application, in the sampledata/DASTAutomation_Example_Data directory.  You will also need to have the AppScan Proxy Server runnng and the information set in the config.js file.  The [AppScan Proxy Server is located here](Extras/AppScan_Proxy_Server/DastProxyServerStandalone.1.1.403.zip). This module will check to see if the AppScan Proxy server is up and running, then create a new listener on the proxy server, execute the functional test and configure it to run on the new proxy server listener, once the functional test is complete it will stop the proxy server, download the traffic from the proxy server, check if there is a scan that already exists with the name and if not create a new scan on AppScan Enterprise, update the job with the traffic file, and start the scan.  The template ID, test policy ID, folder ID, and job name do not have to be passed and if it is not it will pull the defaults that you configured in the config.js file but these can be overridden with the -t, -p, -d, -a, and -n flags respectively.  


    defaultTemplateID - This is the default template Id used to run scans.  This can be overridden by the template ID sent in the command with the -t flag.
    defaultTestPolicyID - This is the default test policy Id used to run scans.  This can be overridden by the test policy Id sent in the command with the -p flag.
    defaultFolderID - This is the defaultFolderId to store the scan in ASE.  This can be overridden by the folder Id sent in the command with the -d flag.

#### To use this module
The options for the application:

    -f "functional test" (required)
    -t template Id (optional) - if no template Id is passed it will use the default template Id defined in config.js
    -p test Policy Id (optional) - if no test policy Id is passed it will use the default test policy Id defined in config.js
    -d folder Id (optional) - if no folder Id is passed it will use the default folder Id defined in config.js
    -a application Id (optional) - if no application Id is passed it will not associate the scan to an application

Example:

    $ node src/DASTAutomation.js -f "java -jar /home/seleniumFucTest.jar" -t 49 -p 3 -d 9 -1 1121

### importASoCFindingsToASE
This module is used to import vulnerability findings of a scan from IBM Application Security on Cloud to AppScan Enterprise and if the application does not exist in AppScan Enterprise, it will create it first then import the issues to the application.  The options for the application:
    
    -s scan Id (required) - this is the scan Id you would like to import the findings from

#### To use this module

    $ node src/importASoCFindingsToASE.js -s hdt6e8e3r44r443543

## scanAudit
This module will create an audit report in CSV format of DAST scans that are under the ASE folder directory in the scans menu of AppScan Enterprise.  Note: it will not check inside users directories.  It will get information about the latest scan in each folder and give statistics about it

#### To use this module
This module does not take in any parameters.  

Example:

    $ node src/scanAudit.js

## userAndApplicationManager
This module combines both applicationLoader and userAccessManager modules.  The use of this module is if you want both user and application management to be handled automatically.  This module takes in a CSV file with application and user information and it will create the application in AppScan Enterprise, create a folder for that application on the scans menu, and create a server group (with the domain specified, this defines the location of the application and will only let you scan that domain/ip/ip range for that application.  If you do not want this level of control set the ip range to 0.0.0.0-255.255.255.255) for the application.  Then it will create the user if it does not exist and give the user access to the application specified with the level of permission specified.  A [template of the csv](sampledata/userApplicationLoaderSample.csv) to be used if located in the sampledata directory and its name userApplicationLoaderSample.csv.csv.

#### To use this module
The options for the application:

    -l location of CSV (required)

Example:

    $ node src/userAndApplicationManager.js -l /home/userApplicationLoaderSample.csv



### applicationCreate
Add a new application to the AppScan Enterprise Console.


#### To use this module
Parameters (* required)

    -n * Application name
    -d Application description
    -c Name or email address of developer contact person
    -t A single application tag
    -h This help text

Example:

    $ node applicationCreate.js -n <AppName> -d <Description>






### applicationReport
Generate and download an application report from the AppScan Enterprise Console. Report can be given a custom name and path, and multiple file formats are available.


#### To use this module
Parameters (* required)

    -a * Application Id you want the report for (required)
    -s minimum Severity to display (critical/high/medium/low) by default shows everything including info results
    -p Path to save the zip file to (defaults to the location of this node script)
    -n Name of the report zip filename. Include the .zip part when you specify (defaults to AppScanReportOutput.zip)
    -f Format of the report (HTML/PDF/XML/XLS) default is PDF)
    -h this Help text

Example:

    $ node applicationReport.js -a <applicationId> -p <report path> -f <file format>





### folderList
Get a list of IDs of all Folders in the ASE scan view


#### To use this module
This module does not take any Parameters (* required)

    $ node folderList.js



### jobCreate
Create a job based on a template. All parameters are optional and defaults can be set in config.js
The template must be an imported .scant file generated from AppScan Standard or this will not work


#### To use this module
Parameters

    -t template Id to be used to create scan
    -p test policy Id to be used for scan
    -f folder Id to store scan in ASE
    -n name of the job.  If not sent will use default name in config
    -a application Id to associate scan to in ASE

Example:

    $ node jobCreate.js -t <templateId> -f <folderId> -n <JobName> -a <applicationId>





### jobModify
Modify a job that was set up using a .scant file as a template. Change the starting url, login, and password


#### To use this module
Parameters (* required)

    -j * Job ID (must also include at least one other parameter)
    -u Starting URL
    -l Application credentials Login/username
    -p Application credentials password
    -h This help text

Example:

    $ node jobModify.js -u <URL> -l <loginUsername> -p <password>





### jobRun
This module runs a scan job.


#### To use this module
Parameters (* required)

    -j * job id you want to run
    -h this help text

Example:

    $ node jobRun.js -j <jobId>





### policyList
Get a list of ids for all available policies


#### To use this module
This module does not take any Parameters


Example:

    $ node policyList.js





### scanStatus
Get the status of a job or scan. There is a known issue that if a job has never been run before this module will return an error


#### To use this module
Parameters (* required)

    -j * job id you want to check the status
    -h this help text

Example:

    $ node scanStatus.js -j <jobId>





### scanStop
Stop a running job or chage it's current status (suspend, etc...)
This module is in development and does not work yet


#### To use this module
Parameters (* required)

    -s * scan activity id you want to stop 
    -a * action code 3(suspend), 4(stop/discard results), 5(stop/save results)
    -h this help text

Example:

    $ node scanStop.js -s scanId -a action


## Building Your Own Modules
We highly encourage the creation of new modules.  When creating the new modules, the API integrations for the other services are located in src/provider.  Make sure you import the appropriate provider in your modules to give you access to the APIs.  The list of providers for tools:

    IBM Application Security on cloud: ./provider/asoc
    IBM AppScan Enterprise: ./provider/ase
    AppScan Enterprise Proxy Server: ./provider/aseProxyServer

If you would like to contribute a new module please submit a pull request, so we can review it and add it to the project.  If you would like to submit an enhancement for a new feature, please open up a new issue with the project with the details of the enhancement.
