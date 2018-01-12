'use strict';

var jwt = require('jsonwebtoken');
var AuthPolicy = require("aws-auth-policy");

var generatePolicy = function(event) {

    // parse the ARN from the incoming event
    var tmp = event.methodArn.split(':');
    var apiGatewayArnTmp = tmp[5].split('/');
    var awsAccountId = tmp[4];

    var apiOptions = {};
    apiOptions.region = tmp[3];
    apiOptions.restApiId = apiGatewayArnTmp[0];
    apiOptions.stage = apiGatewayArnTmp[1];
    
    var policy = new AuthPolicy('user', awsAccountId, apiOptions);
    policy.allowAllMethods();

    return policy.build();
};

exports.handler = function(event, context, callback){
    if (!event.headers.Authorization) {
    	callback('Could not find authToken');
    	return;
    }

    var token = event.headers.Authorization.split(' ')[1];

    var secretBuffer = new Buffer(process.env.AUTH0_SECRET);
    jwt.verify(token, secretBuffer, function(err, decoded){
    	if(err){
    		console.log('Failed jwt verification: ', err, 'auth: ', event.authorizationToken);
    		callback('Authorization Failed');
    	} else {
    		callback(null, generatePolicy(event));
    	}
    });
};