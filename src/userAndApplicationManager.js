const through2 = require('through2');
const split2 = require('split2');
const fs = require('fs');
const logger = require('../config/logger');
const util = require('./util');

var locOfCSV = null;

global.emitErrors = true; //TODO: Globals are bad practice

// Check if location of the CSV is passed in arguments
for (let arguments in process.argv) {
    if (process.argv[arguments] === '-l') {
        locOfCSV = process.argv[parseInt(arguments) + 1];
        }
    if (process.argv[arguments] === '-h' || process.argv[arguments] == '--help') {
        console.log('Command line usage is:');
        return console.log('-l location of the csv');
    }
}
if (locOfCSV === null || locOfCSV === undefined) return console.error('Please enter location of csv -l');
if (!fs.existsSync(locOfCSV)) return console.error('File "' + locOfCSV + '" does not exist');

const applicationLoaderProcessor = require('./applicationLoader')().on('error', (err, obj) => {});
const addUserAccessManagerProcessor = require('./userAccessManager')().on('error', (err, obj) => {});

function validate(input, keyMappings, i) {

    const regex = {
        domain: /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/,
        iprange: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\-\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
        ip: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
        applicationExclude: /[^-@./#&+\w\s]/g,
        acronymExclude: /[^-&()\w]/g,
        trimWhitespace: /(^\s+|\s+$)/g
    };

    function checkDomain(regex) {
        return input[keyMappings.domain] && input[keyMappings.domain].split(';').some(t => null === t.match(regex))
    }

    let result = [];
    
    if (!input[keyMappings.user]) result.push('Empty user');
    if (!input[keyMappings.application]) result.push('Empty application ID');
    else if (input[keyMappings.application].includes(',')) result.push('Multiple applications are not supported');
    if (!input[keyMappings.acronym]) result.push('Empty application acronym');
    if (!input[keyMappings.domain]) result.push('Empty domain');
    if (!input[keyMappings.domain_type]) result.push('Empty domain type');
    else {
        switch (input[keyMappings.domain_type]) {
            case 'domains':
                if (checkDomain(regex.domain))
                    result.push('Invalid domain list');
                break;
            case 'iprange':
                if (checkDomain(regex.iprange))
                    result.push('Invalid IP range list');
                break;
            case 'ip':
                if (checkDomain(regex.ip))
                    result.push('Invalid IP list');
                break;
            default:
                result.push('Invalid domain type');
        }
    }
    if (!input[keyMappings.test_policy]) result.push('Empty test policy');
    if (!input[keyMappings.user_type]) result.push('Empty user type');
    if (!input[keyMappings.folder_role]) result.push('Empty folder role');

    if (!result.length) {

        //Sanitize
        if (input[keyMappings.application] !== (input[keyMappings.application] = input[keyMappings.application].replace(regex.applicationExclude, '').replace(regex.trimWhitespace, '')))
            logger.warn('Removed special characters or extra spaces from application on line ' + i);
        if (input[keyMappings.acronym] !== (input[keyMappings.acronym] = input[keyMappings.acronym].replace(regex.acronymExclude, '')))
            logger.warn('Removed special characters or extra spaces from acronym on line ' + i);

        return null;

    } else return result;

}

const processRecord = () => {

    let i = 0, keyMappings = null;

    return through2.obj(function (data, enc, cb) {
        logger.info('Processing CSV  ' + JSON.stringify(data));

        logger.info('Processing CSV line ' + ++i + '...');

        for (t in data) {

            if (!keyMappings) {

                let resolveKey = (() => {
                    let keys = t.split(',');
                    return match => {for (let i in keys) if (keys[i] === match) return i};
                })();

                keyMappings = {
                    user: resolveKey('user'),
                    full_name: resolveKey('full_name'),
                    email: resolveKey('email'),
                    application: resolveKey('application'),
                    acronym: resolveKey('acronym'),
                    description: resolveKey('description'),
                    pci: resolveKey('pci'),
                    contact: resolveKey('contact'),
                    domain: resolveKey('domain'),
                    domain_type: resolveKey('domain_type'),
                    test_policy: resolveKey('test_policy'),
                    user_type: resolveKey('user_type'),
                    folder_role: resolveKey('folder_role'),
                    server_group: resolveKey('server_group')
                };

                let missingHeaders = Object.entries(keyMappings).filter(kv => !kv[1]).map(kv => kv[0]);
                if (missingHeaders.length) logger.warn('Missing headers: ' + missingHeaders.join(', '));

            }

            let value = util.splitWithQuotes(data[t]);

            let numHeaders = Object.entries(keyMappings).filter(kv => kv[1]).length;
            if (value.length > numHeaders && value.slice(numHeaders).every(v => v === '')) {
                logger.debug('Dropping extraneous empty values on CSV line ' + i);
                value = value.slice(0, numHeaders);
            } else if (value.length !== numHeaders) {
                logger.error('Header/value mismatch on CSV line ' + i + ' (' + numHeaders + ' headers, ' + value.length + ' values)');
                logger.error('Value: ' + JSON.stringify(value));
                cb(); return;
            }

            let validationResult = validate(value, keyMappings, i);
            if (validationResult) {
                logger.error('Invalid data on line ' + i + ': ' + validationResult.join(', '));
                cb(); return;
            }

            //Divide the data into appLoader and userLoader data

            let appLoaderData = {

                applicationid: value[keyMappings.application],
                applicationacronym: value[keyMappings.acronym],
                applicationdescription: value[keyMappings.description],
                pciindicator: value[keyMappings.pci],
                applicationcontact: value[keyMappings.contact],
                domain: value[keyMappings.domain],
                domain_type: value[keyMappings.domain_type]

            };

            let userLoaderData = {

                user: value[keyMappings.user],
                full_name: value[keyMappings.full_name],
                email: value[keyMappings.email],
                server_group: value[keyMappings.server_group],
                domain: value[keyMappings.domain],
                domain_type: value[keyMappings.domain_type],
                test_policy: value[keyMappings.test_policy],
                user_type: value[keyMappings.user_type],
                folder_role: value[keyMappings.folder_role],
                applicationacronym: value[keyMappings.acronym],
                application: value[keyMappings.application],

            };

            //Reformat the data into the expected format

            let appLoaderDataSerialized = {};
            appLoaderDataSerialized[Object.keys(appLoaderData).join()] = Object.values(appLoaderData).join();

            let userLoaderDataSerialized = {};
            userLoaderDataSerialized[Object.keys(userLoaderData).join()] = Object.values(userLoaderData).join();

            //Application loader must precede user loader
            applicationLoaderProcessor.write(appLoaderDataSerialized,
                (err, obj) => {
                    if (err) {
                        logger.error('Error occurred during application loader processing for CSV line ' + i + ': ' + err);
                        cb();
                    }
                    else addUserAccessManagerProcessor.write(userLoaderDataSerialized, (err, obj) => {
                        if (err) logger.error('Error occurred during user loader processing for CSV line ' + i + ': ' + err);
                        else logger.info('Finished processing CSV line ' + i);
                        cb();
                    });
                }

            );

        }

    })

};

fs.createReadStream(locOfCSV)
// Read line by line
    .pipe(split2())
    // Parse CSV line
    .pipe(util.parseCSV())
    // Process your Records
    .pipe(processRecord());