'use strict';

var jwt = require('jsonwebtoken');

var generatePolicy = function(principalId, effect, event) {
    var authResponse = {};
    authResponse.principalId = principalId;
    var resource = event.methodArn;
    if (effect && resource) {
        var policyDocument = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        var statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    return authResponse;
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
    		callback(null, generatePolicy('user', 'allow', event));
    	}
    });
};