'use strict';

var request = require('request');
var jwt = require('jsonwebtoken');

exports.handler = function(event, context, callback) {

    if (!event.authToken) {
    	callback('Could not find authToken');
    	return;
    }

    var token = event.authToken.split(' ')[1];

    var secretBuffer = new Buffer(process.env.AUTH0_SECRET);
    jwt.verify(token, secretBuffer, function(err, decoded) {
    	if(err) {
    		console.log('Failed jwt verification: ', err, 'auth: ', event.authToken);
    		callback('Authorization Failed');
        } else {
            callback(null, decoded);
    	}
    });
};