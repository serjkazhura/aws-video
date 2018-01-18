'use strict';

var AWS = require('aws-sdk');
var s3 = new AWS.S3({apiVersion: '2006-03-01', region: 'us-east-1'});


function createErrorResponse(code, message) {
    var response = {
      'statusCode': code,
      'headers' : {'Access-Control-Allow-Origin' : '*'},
      'body' : JSON.stringify({'code': code, 'messsage' : message})
    };
  
    return response;
}

function createSuccessResponse(result) {
    var response = {
      'statusCode': 200,
      'headers' : {'Access-Control-Allow-Origin' : '*'},
      'body' : JSON.stringify(result)
    };
  
    return response;
}

function copyVideo(params) {
    return s3.copyObject(params).promise();
}

function deleteVideo(params) {
    return s3.deleteObject(params).promise();
}

exports.handler = function(event, context, callback) {
    
    var body = event.body;

    var oldKey = `${body.oldKey}`;
    var newKey = `${body.newKey}`;

    var copyObjectParams = {
        Bucket: process.env.BUCKET,
        CopySource: `${process.env.BUCKET}/${oldKey}`,
        Key: newKey
    };

    var deleteObjectParams = {
        Bucket: process.env.BUCKET,
        Key: oldKey
    };

    copyVideo(copyObjectParams)
        .then(deleteVideo.bind(null, deleteObjectParams))
        .then((data) => { callback(null, createSuccessResponse(data)); })
        .catch((err) => { callback(null, createErrorResponse(500, err)); });
};