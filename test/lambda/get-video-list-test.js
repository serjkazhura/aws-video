var chai = require('chai');
var sinon = require('sinon');
var rewire = require('rewire');
chai.use(require('sinon-chai'));

var expect = chai.expect;
var assert = chai.assert;

var sampleData = {
    Contents: [
        {
            Key: 'file1.mp4',
            ETag: '1234',
            Size: '12',
            bucket: 'my-bucket'
        },
        {
            Key: 'file2.mp4',
            ETag: '4321',
            Size: '21',
            bucket: 'my-bucket'
        }
    ]
};

var env = {
    "BASE_URL": "my-sample-base-url",
    "BUCKET": "my-sample-buscket"
};

function getModule(listObjects) {
    var rewired = rewire('../../src/lambda/get-video-list/index.js');
    rewired.__set__({
        's3': { listObjects: listObjects }
    });
    rewired.__set__({
        'process': { "env": env }
    });
    return rewired;
}

describe('get-video-list', function() {
    var listObjectsStub, callbackSpy, module;

    describe('#execute', function() {
        before(function(done) {
            listObjectsStub = sinon.stub().yields(null, sampleData);
            callbackSpy = sinon.spy();

            var callback = function(error, result) {
                callbackSpy.apply(null, arguments);
                done();
            };

            var event = {

            };

            module = getModule(listObjectsStub);
            module.handler(event, null, callback);
        });

        it('should run our function once', function() {
            expect(callbackSpy).has.been.calledOnce;
        })

        it('should have correct results', function() {
            var result = {
                "baseUrl": env.BASE_URL,
                "bucket": env.BUCKET,
                "urls": [
                    {
                        "filename": sampleData.Contents[0].Key,
                        "eTag": sampleData.Contents[0].ETag,
                        "size": sampleData.Contents[0].Size
                    },
                    {
                        "filename": sampleData.Contents[1].Key,
                        "eTag": sampleData.Contents[1].ETag,
                        "size": sampleData.Contents[1].Size
                    }
                ]
            };

            assert.deepEqual(callbackSpy.args[0][1].body, JSON.stringify(result));
        });
    });
});

