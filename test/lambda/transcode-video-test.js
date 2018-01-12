var chai = require('chai');
var sinon = require('sinon');
var rewire = require('rewire');
chai.use(require('sinon-chai'));

var expect = chai.expect;
var assert = chai.assert;

var sampleData = {
    'success': true
};

function getModule(createJob) {
    var rewired = rewire('../../src/lambda/transcode-video/index.js');
    rewired.__set__({
        'elasticTranscoder': { createJob: createJob }
    });
    return rewired;
}

describe('transcode-video', function() {
    describe('#execute:valid-file-name', function() {

        var createJobStub, callbackSpy, module;
        var fileName = 'test.video.mp4';

        before(function(done) {
            createJobStub = sinon.stub().yields(null, sampleData);
            callbackSpy = sinon.spy();

            var callback = function(error, result) {
                callbackSpy.apply(null, arguments);
                done();
            };

            var event = {
                'Records': [{
                    's3': {
                        'object': {
                            'key': fileName
                        }
                    }
                }]
            };

            module = getModule(createJobStub);
            module.handler(event, null, callback);
        });

        it('should run our function once', function() {
            expect(callbackSpy).has.been.calledOnce;
        });

        it('should successfully start the job', function() {
            var result = {
                'success': true
            };

            assert.deepEqual(callbackSpy.args, [[null, result]]);
        });
    });

    
    describe('#execute:invalid-file-name', function() {
        var callbackSpy, module;
        var fileName = 'test.test';

        before(function(done) {
            callbackSpy = sinon.spy();

            var callback = function(error, result) {
                callbackSpy.apply(error, arguments);
                done();
            };

            var event = {
                'Records': [{
                    's3': {
                        'object': {
                            'key': fileName
                        }
                    }
                }]
            };

            module = getModule(null);
            module.handler(event, null, callback);
        });

        it('should run our function once', function() {
            expect(callbackSpy).has.been.calledOnce;
        });

        it('should fail with an "invalid file extension" exception', function() {
            assert.deepEqual(callbackSpy.args, [['Invalid file extension .test']]);
        });
    });
});


