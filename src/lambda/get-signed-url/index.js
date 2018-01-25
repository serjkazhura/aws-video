'use strict';

var AWS = require('aws-sdk');
var async = require('async');

var s3 = new AWS.S3();

exports.handler = function(event, context, callback) {
    var body = JSON.parse(event.body);
    var urls = [];

    async.forEachOf(body, function(video, index, next) {

        console.log(video);
        console.log(index);

        var params = {
            Bucket: process.env.BUCKET, 
            Key: video.key, 
            Expires: 9000
        };

        s3.getSignedUrl('getObject', params, function(err, url) {
            if (err) {
                console.log('Error generating signed URL for', video.key);
                next(err);
            } else {
                urls.push({firebaseId: video.firebaseId, url: url});
                next();
            }
        });

    }, function (err) {
        if (err) {
            console.log('Could not generate signed URLs');
            callback(err);
        } else {
            console.log('Successfully generated URLs');

            var response = {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin':'*'},
                'body': JSON.stringify({'urls': urls})
            };

            callback(null, response);
        }
    });
};