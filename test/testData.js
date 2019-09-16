module.exports = {
    ase: {
        domain: 'APPSCANTEST',
        userName: '\\user3',
        email: 'test@test.com',
        userType: 6,
        fullName: 'John Smith',
        serverGroup: {
            name: 'testServergroup',
            domain: 'demo.testfire.net',
            domainType: 'domains'
        },
        testPolicy: 'wf-default-test-policy',
        testPolicyID: '2',
        folder: {
            id: 12,
            modifyAction: 'add',
            role: 'report_administration',
            name: 'testFolder',
            parentId: 1
        },
        application: {
            name: 'testAppASE1',
            description: 'Test description for test application',
            tags: ['testTag1'],
            contact: 'test contact user 1'
        }
    },
    asoc: {
        application: {
            name: 'testApp1',
            description: 'Test description for test application',
            contact: 'test contact user 1'
        },
        assetGroup: {
            name: 'testAssetGroup1',
            description: 'Test asset group'
        }
    }
}