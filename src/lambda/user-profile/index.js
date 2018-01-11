'use strict';

var request = require('request');

exports.handler = function(event, context, callback) {

    if (!event.accessCode) {
    	callback('Could not find user access code');
    	return;
    }

    var options = {
        url: `https://${process.env.DOMAIN}/userinfo`,
        method: 'GET',
        json: true,
        headers: {
            "Authorization" : `Bearer ${event.accessCode}`
        }
    };

    request(options, function(error, response, body){
        if (!error && response.statusCode === 200) {
            callback(null, body);
        } else {
            callback(error);
        }
    });

};