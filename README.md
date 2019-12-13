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
Example pre-built modules are described [here](docs/modules.md)

## Building Your Own Modules
We highly encourage the creation of new modules.  When creating the new modules, the API integrations for the other services are located in src/provider.  Make sure you import the appropriate provider in your modules to give you access to the APIs.  The list of providers for tools:

    HCL Application Security on cloud: ./provider/asoc
    HCL AppScan Enterprise: ./provider/ase
    AppScan Enterprise Proxy Server: ./provider/aseProxyServer

If you would like to contribute a new module please submit a pull request, so we can review it and add it to the project.  If you would like to submit an enhancement for a new feature, please open up a new issue with the project with the details of the enhancement.

test5
