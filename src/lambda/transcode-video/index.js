'use strict';

Array.prototype.includes = function(element){
    return this.indexOf(element) > -1;
};

var allowedFiles = ['.mp4', '.avi', '.mov'];

var AWS = require('aws-sdk');
var firebase = require('firebase');

var elasticTranscoder = new AWS.ElasticTranscoder({
    region: process.env.ELASTIC_TRANSCODER_REGION
});

firebase.initializeApp({
    serviceAccount: process.env.SERVICE_ACCOUNT,
    databaseURL: process.env.DATABASE_URL
});


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
}

function checkFileExtension(extension){
    if (!allowedFiles.includes(extension)){
        throw `Invalid file extension ${extension}`;
    }
}

function createTranscoderJobParams(event){
    var key = event.Records[0].s3.object.key;
    //the input file may have spaces so replace them with '+'
    var sourceKey = decodeURIComponent(key.replace(/\+/g, ' '));

    var nameParts = parseFileName(sourceKey);
    checkFileExtension(nameParts.extension);
    var outputKey = nameParts.name;
    console.log(outputKey);

    return {
        PipelineId: process.env.ELASTIC_TRANSCODER_PIPELINE_ID,
        Input: {
            Key: sourceKey
        },
        Outputs: [
            {
                Key: outputKey + '-720p' + '.mp4',
                PresetId: '1351620000001-000010' //Generic 720p
            }
        ]};
}

function pushVideoEntryToFirebase(key, callback) {
    console.log('Adding video entry to firebase at key:', key);

    var database = firebase.database().ref();

    database
        .child('videos')
        .child(key)
        .set({
            transcoding: true
        })
        .then(function () {
            console.log('ehllo hello');
            callback(null, 'Video record saved to firebase')
        })
        .catch(function (err) {
            callback(err)
        });
}

exports.handler = function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false;

    try {
        var params = createTranscoderJobParams(event);

        console.log('creating transcoded videos');

        elasticTranscoder.createJob(params, function(error, data){
            if (error) {
                console.log('Error creating elastic transcoder job.');
                callback(error);
                return;
            }
    
            console.log('Elastic transcoder job created successfully');
            pushVideoEntryToFirebase(uniqueVideoKey, callback);
        });
    }
    catch (e) {
        callback(e);
    }
}