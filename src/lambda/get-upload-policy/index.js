'use strict';

Date.prototype.addHours = function(h) {    
    this.setTime(this.getTime() + (h*60*60*1000)); 
    return this;   
}

var AWS = require('aws-sdk');
var async = require('async');
var crypto = require('crypto');

var s3 = new AWS.S3();

function createErrorResponse(code, message) {
    console.log('error');

    var response = {
        'statusCode': code,
        'headers' : {'Access-Control-Allow-Origin' : '*'},
        'body' : JSON.stringify({'message' : message})
    };

    return response;
}

function createSuccessResponse(message) {
    console.log('success');

    var response = {
        'statusCode': 200,
        'headers' : {'Access-Control-Allow-Origin' : '*'},
        'body' : JSON.stringify(message)
    };

    return response;
}

function base64encode (value) {
    return new Buffer(value).toString('base64');
}

//policy will expire in 2 hours
function generateExpirationDate() {
    var currentDate = new Date().addHours(2);
    return new Date(currentDate).toISOString();
}

function generatePolicyDocument(filename, next) {
    //adding random directory prefix to avoid filename clashes
    var directory = crypto.randomBytes(20).toString('hex');
    var key = directory + '/' + filename;
    var expiration = generateExpirationDate();

    var policy = {
        'expiration' : expiration,
        'conditions': [
            {key: key},
            {bucket: process.env.UPLOAD_BUCKET},
            {acl: 'private'},
            ['starts-with', '$Content-Type', '']
        ]
    };

    next(null, key, policy);
}

function encode(key, policy, next) {
    var encoding = base64encode(JSON.stringify(policy)).replace('\n','');

    next(null, key, policy, encoding);
}

function sign(key, policy, encoding, next) {
    
    //create a signature using user's (IAM user with permission to uplaod a file to s3) private key
    var signature = crypto.createHmac('sha1', process.env.SECRET_ACCESS_KEY).update(encoding).digest('base64');

    next(null, key, policy, encoding, signature);
}

exports.handler = function(event, context, callback){
    var filename = null;

    console.log('starting');

    if (event.queryStringParameters && event.queryStringParameters.filename) {
        filename = decodeURIComponent(event.queryStringParameters.filename);
    } else {
        callback(null, createErrorResponse(500, 'Filename must be provided'));
        return;
    }

    console.log('generating policy');

    async.waterfall([async.apply(generatePolicyDocument, filename), encode, sign],
        function (err, key, policy, encoding, signature) {
            if (err) {
                callback(null, createErrorResponse(500, err));
            } else {
                var result = {
                    signature: signature,
                    encoded_policy: encoding,
                    access_key: process.env.ACCESS_KEY,
                    upload_url: process.env.UPLOAD_URI + '/' + process.env.UPLOAD_BUCKET,
                    key: key
                };

                callback(null, createSuccessResponse(result));
            }
        }
    );
};