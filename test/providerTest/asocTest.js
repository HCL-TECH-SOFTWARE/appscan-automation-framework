var chai = require('chai');
const asoc = require('../../src/providers/asoc');
var Promise = require("promise");
const testdata = require('../testData').asoc;
const assert = chai.assert;
var xml2js = require('xml2js');
var parser = new xml2js.Parser();


var workingData = {};

describe('Running tests for ASoC provider...', () => {
    /**
     * Create functions
     */
    it('creating asset group in ASoC', function (done) {
        this.timeout(10000);

        var promise = new Promise(function (resolve, reject) {
            asoc.createAssetGroup(testdata.assetGroup.name, testdata.assetGroup.description, (data) => {
                resolve(data);
            })
        });
        promise.done(function (data) {
            workingData.assetGroupID = data.body.Id;
            assert.equal(data.body.Name, testdata.assetGroup.name);
            done();
        })
    })

    it('creating application in ASoC', function (done) {
        this.timeout(10000);

        var promise = new Promise(function (resolve, reject) {
            asoc.createApplication(testdata.application.name, workingData.assetGroupID, testdata.application.description, null, testdata.application.contact, (data) => {
                resolve(data);
            })
        });
        promise.done(function (data) {
            workingData.appID = data.body.Id;
            assert.equal(data.body.Name, testdata.assetGroup.name);
            done();
        })
    })

    /**
     * Delete functions
     */
    // it('deleting asset group in ASoC', function (done) {
    //     this.timeout(10000);

    //     var promise = new Promise(function (resolve, reject) {
    //     })
    // })
})