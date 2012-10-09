var https = require('https');
var util = require('util');


function sendAuthenticationRequest(opts, appInfo) {
	var reqOpts = opts;
	reqOpts.path = '/apps';
	reqOpts.method = 'POST';
	reqOpts.headers = {
		'Content-Type' : 'application/vnd.tent.v0+json',
		'Accept' : 'application/vnd.tent.v0+json',
		'Content-Length' : JSON.stringify(appInfo).length
	}
	
	var req = https.request(reqOpts, function(res) {
		res.on('data', function(data) {
			util.puts(data);
		});
		res.on('end', function() {
			util.puts(JSON.stringify(res.headers));
		});
	});
	req.end(JSON.stringify(appInfo));
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
			util.puts(JSON.stringify(res.headers));
			sendAuthenticationRequest(opts, appInfo);
		});
	});
	req.end();
}

exports.registerApp = registerApp;
