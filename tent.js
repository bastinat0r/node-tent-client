var https = require('https');
var http = require('http');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var crypto = require('crypto');

exports.registerApp = registerApp;

var debug = true;

function printErrorMessage(error) {
	util.puts('ERROR: \n' + error);
}

function printBody(data) {
	if(debug)	util.puts('Response Body:\n'+data);
}

function printHeader(headers) {
	if(debug)	util.puts('HTTP Headers:\n'+JSON.stringify(headers));
}

function printOptions(opts) {
	if(debug)	util.puts('HTTP Options:\n'+JSON.stringify(opts));
}

function printUrl(url) {
	if(debug)	util.puts('URL:\n'+url);
}

function registerApp(entityUrl, appInfo) {
	var opts = url.parse(entityUrl);
	opts.method = 'HEAD';
	opts.headers = {
		"Accept" : "application/vnd.tent.v0+json",
		"Content-Length" : "0",
	};
	var req = https.request(opts, function(res) {
		res.on('end', function() {
			printHeader(res.headers);
			
			// the link looks like this: <https:// ... >, we want it
			var profileUrl = /<[^>]*>/.exec(res.headers.link);
			// now we want to get rid of the '<' and '>'
			profileUrl = (""+profileUrl).replace(/[<>]/g,'');
			printUrl(profileUrl);
			https.get(url.parse(profileUrl), function(res) {
				res.on('data', function(data) {
					printHeader(res.headers);
					printBody(data);
					var profile = JSON.parse(data);
					var core = profile["https://tent.io/types/info/core/v0.1.0"];
					generateAuthenticationUrl(core, appInfo);
				});
			});
		});
	});
	req.on('error', printErrorMessage);
	req.end();
}

function generateAuthenticationUrl(profileCore, appInfo) {
/* todo: generate state-string */
	var contentLength = JSON.stringify(appInfo).length;
	var apiRootUrl = profileCore.servers[0];
	var opts = url.parse(apiRootUrl);
	opts.method = 'POST';
	opts.path = opts.path + '/apps';
	opts.headers = {
		"Accept" : "application/vnd.tent.v0+json",
		"Content-Type" : "application/vnd.tent.v0+json",
		"Content-Length" : contentLength.toString()
	}
	var components;
	printOptions(opts);
	var req = https.request(opts, function(res) {
	var data = "";
		res.on('data', function(chunk) {
			data = data + chunk;
		});
		res.on('end', function() {
			printHeader(res.headers);
			printBody(data);
			components = JSON.parse(data);
			var scope = "";
			for (i in components.scopes) {
				scope = scope + i + ","
			};
			scope.replace(/,$/,'');	// strip the last ',' away
			if(debug) util.puts("Scopestring:\n" + scope);
			var oauthUrl = 	apiRootUrl + 
				'/oauth/authorize?client_id=' + components.id +
				'&redirect_uri=' + components.redirect_uris[0] +
				'&scope=' + scope;
			util.puts('OAUTH-URL, paste it in your favorite Webbrowser:\n' + oauthUrl);
		});
	});
	req.on('error', printErrorMessage);
	req.end(JSON.stringify(appInfo));
	var srv = http.createServer(function(req, res) {
		req.on('end', function() {
			res.writeHead(200);
			res.end('OK');
			var query = url.parse(req.url).query;
			var param = querystring.parse(query);
			
			if(param.code) {
				printHeader(req.headers);
				printUrl(req.url);
				util.puts('Got code: ' + param.code);
				components.code = param.code;
				finishRegistration(opts, components);
				srv.close();
			}
		});
	});
	srv.listen('8080', 'localhost');
}

function finishRegistration(opts, oauthComponents) {
	var requestBody = JSON.stringify({
		'code' : oauthComponents.code,
		'token_type' : "mac"
	});
	
	opts.path = opts.path + '/' + oauthComponents.id + '/authorizations';
	var nonce = "";
	while (nonce.length < 5) {
		var c = crypto.randomBytes(1);
		if(/[a-z0-9]/.test(c))
			nonce = nonce + c;
	}
	var timeStamp = parseInt((new Date()).getTime() / 1000, 10); 
	var normalizedRequestString = "" 
			+ timeStamp + '\n'
			+ nonce + '\n'
			+ 'POST' + '\n'
			+ opts.path + '\n'
			+ opts.host + '\n'
			+ '443' + '\n'
			+ '\n' ;

	util.puts("normalizedRequestString:\n" + normalizedRequestString);
	util.puts('Key: \n' + oauthComponents.mac_key);
	
	var hmac = crypto.createHmac('sha256', oauthComponents.mac_key);
	hmac.update(normalizedRequestString);
	opts.headers = {
		'Content-Type' : 'application/vnd.tent.v0+json',
		'Accept' : 'application/vnd.tent.v0+json',
		'Content-Length' : requestBody.length,
		'Authorization' : 'MAC id="' + oauthComponents.mac_key_id 
				+ '", ts="' + timeStamp
				+ '", nonce="' + nonce
				+ '", mac="' + hmac.digest('base64') + '"'
	}
	printOptions(opts);
	util.puts("Autentication Request Body:\n" + requestBody);
	var req = https.request(opts, function(res) {
		res.on('data', function(data) {
			printHeader(res.headers);
			printBody(data);
		});
		res.on('error', printErrorMessage);
	});
	req.end(requestBody);
}
