var https = require('https');
var util = require('util');

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
		});
	});
	req.end();
}

exports.registerApp = registerApp;
