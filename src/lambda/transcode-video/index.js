'use strict';

Array.prototype.includes = function(element){
    return this.indexOf(element) > -1;
};

var AWS = require('aws-sdk');

var elasticTranscoder = new AWS.ElasticTranscoder({
    region: 'us-east-1'
});

var allowedFiles = ['.mp4', '.avi', '.mov'];

function parseFileName(fileName){
    //we could've gotten all fancy by using node's 'path' module. 
    //But this is simpler and faster.
    var extensionStart = fileName.lastIndexOf('.');

    var name = fileName.substring(0, extensionStart);
    var extension = fileName.substring(extensionStart, fileName.length);

    return {
        name : name,
        extension : extension
    };
};

function checkFileExtension(extension){
    if (!allowedFiles.includes(extension)){
        throw `Invalid file extension ${extension}`;
    }
};

function createTranscoderJobParams(event){
    var key = event.Records[0].s3.object.key;
    //the input file may have spaces so replace them with '+'
    var sourceKey = decodeURIComponent(key.replace(/\+/g, ' '));

    var nameParts = parseFileName(sourceKey);
    checkFileExtension(nameParts.extension);
    var outputKey = nameParts.name;
    console.log(outputKey);

    return {
        PipelineId: '1514432685255-6fdbwl',
        Input: {
            Key: sourceKey
        },
        Outputs: [
            {
                Key: outputKey + '-1080p' + '.mp4',
                PresetId: '1351620000001-000001' //Generic 1080p
            },
            {
                Key: outputKey + '-720p' + '.mp4',
                PresetId: '1351620000001-000010' //Generic 720p
            },
            {
                Key: outputKey + '-web-720p' + '.mp4',
                PresetId: '1351620000001-100070' //Web Friendly 720p
            }
        ]};
};

exports.handler = function(event, context, callback){
    try {
        var params = createTranscoderJobParams(event);

        console.log('creating transcoded videos');

        elasticTranscoder.createJob(params, function(error, data){
            if (error){
                console.log(error);
                callback(error);
            } else {
                callback(null, data);
            }
        });
    }
    catch (e) {
        callback(e);
    }
};