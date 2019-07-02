var chai = require('chai');
const ase = require('../../src/providers/ase');
var Promise = require("promise");
const testdata = require('../testData').ase;
const assert = chai.assert;
var xml2js = require('xml2js');
var parser = new xml2js.Parser();


var workingData = {};


describe('Running tests for ASE provider...', () => {
    /**
     * Create functions
     */
    it('creating user in ASE', function (done) {
        this.timeout(10000);

        var promise = new Promise(function (resolve, reject) {
            ase.createUser(testdata.fullName, testdata.domain + testdata.userName, testdata.email, testdata.userType, (data) => {
                resolve(data);
            })
        });
        promise.done(function (data) {
            workingData.userId = data.body.userId;
            assert.equal(data.body.fullName, testdata.fullName);
            done();
        })
    })

    it('creating server group in ASE', function (done) {
        this.timeout(10000);

        var promise = new Promise(function (resolve, reject) {
            ase.createServerGroup(testdata.serverGroup.name, testdata.serverGroup.domain, testdata.serverGroup.domainType, (response) => {
                resolve(response);
            })
        })
        promise.done(function (data) {
            parser.parseString(data.body, function (err, result) {
                workingData.serverGroupID = result['server-groups']['server-group'][0]['$'].id;
                let serverGroupName = result['server-groups']['server-group'][0]['$']['name']
                assert.equal(serverGroupName, testdata.serverGroup.name);
                done();
            });
        })
    })


    it('creating user security permissions', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.createUserSecurityPermission(workingData.userId, workingData.serverGroupID, testdata.testPolicyID, (data) => {
                parser.parseString(data, function (err, result) {
                    resolve(data);
                })
            })
        })
        promise.done(function (data) {
            parser.parseString(data.body, function (err, result) {
                let securityPermission = result['user-security-permissions']['user-security-permission'][0]['username'][0];
                workingData.userSecurityPermissionId = result['user-security-permissions']['user-security-permission'][0]['$']['UserSecurityPermissionId'];
                assert.equal(securityPermission, testdata.domain + testdata.userName);
                done();
            })
        })
    })


    it('creating server group with wrong domain type so should fail', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.createServerGroup(testdata.serverGroup.name, testdata.serverGroup.domain, 'wrong', (response) => {
                resolve(response);
            })
        })
        promise.done(function (data) {
            assert.equal(data.msg, 'Incorrect domainType sent, must be domains, iprange, or ip.');
            done();
        })
    })

    it('create folder', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.createFolder(testdata.folder.parentId, testdata.folder.name, testdata.folder.description, null, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            parser.parseString(data.body, function (err, result) {
                let folderName = result.folder.name;
                assert.equal(folderName, testdata.folder.name);
                done();
            })
        })
    })

    it('create application', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.createApp(testdata.application.name, testdata.application.description, testdata.application.tags, testdata.application.contact, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            workingData.applicationID = data.body.id;
            assert.equal(data.statusCode, 200);
            assert.equal(data.body.name, testdata.application.name);
            done();
        })
    })




    /**
     * Get functions
     */
    it('get all server groups', function (done) {
        this.timeout(10000);

        var promise = new Promise(function (resolve, reject) {
            ase.getServerGroups((response) => {
                resolve(response)
            })
        })
        promise.done(function (data) {
            let serverName = null;
            parser.parseString(data.body, function (err, result) {
                let serverGroups = result['server-groups']['server-group'];
                for (let s in serverGroups) {
                    if (serverGroups[s]['$'].name == testdata.serverGroup.name) {
                        serverName = serverGroups[s]['$'].name
                    }
                }
                assert.equal(serverName, testdata.serverGroup.name);
                done();
            })
        })
    })

    // it('get all test policies', function (done) {
    //     var promise = new Promise(function (resolve, reject) {
    //         ase.getTestPolicies((response) => {
    //             resolve(response)
    //         })
    //     })
    //     promise.done(function (data) {
    //         parser.parseString(data, function (err, result) {
    //             let testPolicy = result['testpolicies']['testpolicy'][0]['$'].name
    //             assert.equal(testPolicy, testdata.testPolicy);
    //             done();
    //         })
    //     })
    // })
    it('get applications', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.getApp((data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            for (let app in data.body) {
                if (data.body[app].name == testdata.application.name) {
                    assert.equal(data.body[app].name, testdata.application.name);
                    done();
                }
            }
        })
    })

    it('get folders', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.getFolders((folders) => {
                resolve(folders);
            })
        })
        promise.done(function (folders) {
            let fName;
            for (let f in folders.body) {
                if (folders.body[f].folderName == testdata.folder.name && folders.body[f].parentId == testdata.folder.parentId) {
                    workingData.folderID = folders.body[f].folderId;
                    fName = folders.body[f].folderName;
                }
            }
            assert.equal(fName, testdata.folder.name);
            done();
        })
    })

    // it('get DAST Job ID in folder', function (done) {
    //     var promise = new Promise(function (resolve, reject) {
    //         ase.getListOfDASTJobs(testdata.folder.id, (data) => {
    //             resolve(data)
    //         })
    //     })
    //     promise.done(function (data) {
    //         assert.equal(data.errorMessage, null);
    //         done();
    //     })
    // })

    // it('get details of DAST job', function (done) {
    //     var promise = new Promise(function (resolve, reject) {
    //         ase.getDASTJobDetails(testdata.folder.DASTJobID, (data) => {
    //             resolve(data);
    //         })
    //     })
    //     promise.done(function (data) {
    //         assert.equal(data.id, testdata.folder.DASTJobID);
    //         done();
    //     })
    // })

    // it('get statistics of DAST job', function (done) {
    //     var promise = new Promise(function (resolve, reject) {
    //         ase.getDASTScanStatistics(testdata.folder.DASTJobID, (data) => {
    //             resolve(data);
    //         })
    //     })
    //     promise.done(function (data) {
    //         parser.parseString(data, function (err, result) {
    //             assert.equal(result.statistics['$'].status, "Ready");
    //             done();
    //         })
    //     })
    // })



    /**
     * Update functions
     */
    it('update server group', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.updateServerGroup(workingData.serverGroupID, testdata.serverGroup.updatedName, testdata.serverGroup.domain, testdata.serverGroup.domainType, testdata.serverGroup.domain, testdata.serverGroup.domainType, (response) => {
                resolve(response);
            })
        })
        promise.done(function (data) {
            assert.equal(data.statusCode, 200);
            done();
        })
    })

    // it('update folder', function (done) {
    //     var promise = new Promise(function (resolve, reject) {
    //         ase.updateFolder(28, testdata.folder.updatedFolderName, 'description', null, (folder) => {
    //             resolve(folder);
    //         })
    //     })
    //     promise.done(function (data) {
    //         parser.parseString(data, function (err, result) {
    //             let foldername = result.folder.name;
    //             assert.equal(testdata.folder.updatedFolderName, foldername);
    //             done();
    //         })
    //     })
    // })

    // it('modify user role for folder', function (done) {
    //     var promise = new Promise(function (resolve, reject) {
    //         ase.modifyFolderRole(116, testdata.folder.id, testdata.folder.modifyAction, testdata.folder.role, (data) => {
    //             resolve(data);
    //         })
    //     })
    //     promise.done(function (data) {
    //         parser.parseString(data, function (err, result) {
    //             let folderID = result.folder.id;
    //             assert.equal(folderID, testdata.folder.id);
    //             done();
    //         })
    //     })
    // })



    // /**
    //  * Delete functions (clean up env)
    //  */
    it('delete user security permission', function (done) {
        this.timeout(10000);

        var promise = new Promise(function (resolve, reject) {
            ase.deleteUserSecurityPermission(workingData.userSecurityPermissionId, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            assert.equal(data.statusCode, 200);
            done();
        })
    })
    it('delete user', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.deleteUser(workingData.userId, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            assert.equal(data.statusCode, 200);
            done();
        })
    })
    // // Delete folder
    it('delete server group', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.deleteServerGroup(workingData.serverGroupID, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            assert.equal(data.statusCode, 200);
            done();
        })
    })
    it('delete folder', function (done) {
        var promise = new Promise(function (resolve, reject) {
            ase.deleteFolder(workingData.folderID, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            assert.equal(data.statusCode, 200);
            done();
        })
    })
    it('delete application', function (done) {
        var promise = new Promise(function (resolve, reject) {
            let appArray = [workingData.applicationID]
            ase.deleteApp(appArray, (data) => {
                resolve(data);
            })
        })
        promise.done(function (data) {
            assert.equal(data.statusCode, 200);
            done();
        })
    })
})
