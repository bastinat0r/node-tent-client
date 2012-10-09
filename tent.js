var https = require('https');
var util = require('util');
var url = require('url');

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

function registerApp(credentials, appInfo) {
	var opts = {
		host : credentials.host,
		path : credentials.path,
		method : 'HEAD',
		headers : {
			"Accept" : "application/vnd.tent.v0+json",
			"Content-Length" : "0",
		}
	}
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
					printBody(data);
					var profile = JSON.parse(data);
					var core = profile["https://tent.io/types/info/core/v0.1.0"];
					sendAuthenticationRequest(core, appInfo);
				});
			});
		});
	});
	req.on('error', printErrorMessage);
	req.end();
}

function sendAuthenticationRequest(profileCore, appInfo) {
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
	printOptions(opts);
	var req = https.request(opts, function(res) {
		res.on('data', printBody);
		res.on('end', function() {
			printHeader(res.headers);
		});
	});
	req.on('error', printErrorMessage);
	req.end(JSON.stringify(appInfo));
}

