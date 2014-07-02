var http = require("http");

// Global variables used in multiple functions
var host = 'localhost';
var userName;
var filePath = '/webhdfs/v1/users/';
var user_access_name = '&user.name=root';

// Variables used for extracting datanode location
var datanode;
var datanode_host;
var datanode_port;
var datanode_op;

/**************************/
/**   FINDING RAML FILE  **/
/**************************/
exports.findById = function (req, res) {
	console.log("FINDING RAML FILE");
	var file = req.params.id;
	console.log("file: " + file);

	console.log("Sending request...");
	// Options for request
	var options1 = {
		hostname: host,
		port: '50070',
		path: filePath + userName + '/' + file + '?op=OPEN',
		method: 'GET'
		};

	// FIRST REQUEST: Get specific file form HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));

		var options2 = {
			hostname: 'localhost',
			port: '50075',
			path: filePath + userName + '/' + file + '?op=OPEN&namenoderpcaddress=localhost:9000&user.name=root',
			method: 'GET',
		};

		// SECOND REQUEST: Get content from HDFS
		var req2 = http.request(options2, function(res2) {
				console.log("STATUS: " + res2.statusCode);
				console.log("HEADERS: " + JSON.stringify(res2.headers));

				res2.setEncoding('utf8');
				res2.on('data', function (chunk) {
					//console.log('BODY: ' + chunk);
					item = { "content": chunk };
					res.send(item);
				});
		});

		req2.on('error', function(e) {
				console.log("Problem with request2: " + e.message);
		});

        req2.end();
	});

	// If an errooccurs display problem
	req1.on('error', function(e) {
		console.log("Problem with request1: " + e.message);
	});

	req1.end();	
};

/**************************/
/**  GETTING ALL FILES   **/
/**************************/
exports.findAll = function (req, res) {

	var paths = [];

	console.log("GETTING ALL FILES");
	/** Getting username from Nginx Authorization **/
	var headers = req.header("authorization");
	// Remove BASIC tag
	var sub = headers.substring(6, headers.length)
	// Decode header from base 64 to a string
	var buffer = new Buffer(sub, 'base64');
	var decoded = buffer.toString();
	// Split and grab the Username
	var index = decoded.indexOf(':');
	userName = decoded.substring(0, index);

	var fileList = new Object();

	var options1 = {
			hostname: host,
			port: '50070',
			path: filePath + userName + '?op=LISTSTATUS',
			method: 'GET'
	};

	// FIRST REQUEST: Get all files form HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));

		// Grabbing all of the path file names
		res1.setEncoding('utf8');
		res1.on('data', function (chunk) {
				var split1 = chunk.split("pathSuffix\":\"");

				// Start at 1 to avoid grabbing "FileStatuses"
				for(var i = 1; i < split1.length; i++)
				{
					var split2 = split1[i].split("\",");
					
					console.log(split2[0]);
					paths.push(split2[0]);
				}

				// Add each of the path names to fileList object
				for (var i = 0; i < paths.length; i++)
				{
					//console.log("path[" + i + "]:" + paths[i]);
					fileList[paths[i]] = {};
					fileList[paths[i]]["path"] = "/" + paths[i];
				}
				//console.log("FILELIST: " + JSON.stringify(fileList));
				
				// Send the fileList object
				res.send(JSON.stringify({status: "ok", response: fileList}));
			});
	});

	// If an error occurs display problem
	req1.on('error', function(e) {
		console.log("Problem with request1: " + e.message);
	});

	req1.end();	
};


/**************************/
/** ADDING NEW RAML FILE **/
/**************************/
exports.addFile = function (req, res) {
	console.log("Adding file to user: " + userName);

	// Getting the file path name from the request body
	var file = req.body.path;

	console.log("file name: " + file);
	console.log("body: " + req.body.content);

	// Options for first request
	options1 = {
		hostname: host,
		port: '50070',
		path: filePath + userName + file + '?op=CREATE',
		method: 'PUT'
    };

	// FIRST REQUEST: Send intial request to redirect HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));
		
		// Extracting location header and parsing it for second request
		datanode = res1.headers['location'];
		var sub = datanode.split("http://");
		var firstColon = sub[1].indexOf(":");
		var questionMark = sub[1].indexOf("?");
		datanode_host = sub[1].substring(0, firstColon);
		datanode_port = sub[1].substring(firstColon+1, sub[1].indexOf("/"));
		datanode_op = sub[1].substring(questionMark);
		
		var options2 = {
			hostname: datanode_host,
			port: datanode_port,
			path: filePath + userName + file + datanode_op + user_access_name,
			method: 'PUT',
		};

		// SECOND REQUEST: Put file to HDFS
		var req2 = http.request(options2, function(res2) {
				console.log("STATUS: " + res2.statusCode);
				console.log("HEADERS: " + JSON.stringify(res2.headers));

				res2.on('data', function (chunk) {
					console.log('BODY: ' + chunk);
				});
		});

		req2.on('error', function(e) {
				console.log("Problem with request2: " + e.message);
		});
	
		// Write the contents to HDFS
		req2.write(req.body.content);

        req2.end();
	});

	// If an error occurs display problem
	req1.on('error', function(e) {
		console.log("Problem with request1: " + e.message);
	});

	req1.end();	

};

/**************************/
/**  UPDATING RAML FILE  **/
/**************************/
exports.updateFile = function (req, res) {
	console.log("UPDATING RAML FILE");

	// Getting the file path name from the request body
	var file = req.body.path;
	console.log("File: " + file);

	var options1 = {
			hostname: host,
			port: '50070',
			path: filePath + userName + file + '?op=OPEN',
			method: 'GET'
			};

	// FIRST REQUEST: Send initial request to redirect HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));
		
		// Extracting location header and parsing it for second request
		datanode = res1.headers['location'];
		var sub = datanode.split("http://");
		var firstColon = sub[1].indexOf(":");
		var questionMark = sub[1].indexOf("?");
		datanode_host = sub[1].substring(0, firstColon);
		datanode_port = sub[1].substring(firstColon+1, sub[1].indexOf("/"));
		datanode_op = sub[1].substring(questionMark);
		// Remove '?op=OPEN', start string at first '&'
		datanode_op = datanode_op.substring(datanode_op.indexOf("&"));
		
		var full_path = filePath + userName + file + datanode_op + "&overwrite=true" + user_access_name;
		console.log("full_path: " + full_path);
		
		var options2 = {
			hostname: datanode_host,
			port: datanode_port,
			path: filePath + userName + file + "?op=CREATE" + datanode_op + "&overwrite=true" + user_access_name,
			method: 'PUT',
		};

		// SECOND REQUEST: Put file to HDFS
		var req2 = http.request(options2, function(res2) {
				console.log("STATUS: " + res2.statusCode);
				console.log("HEADERS: " + JSON.stringify(res2.headers));
				res2.on('data', function (chunk) {
					console.log('BODY: ' + chunk);
				});
		});

		req2.on('error', function(e) {
				console.log("Problem with request2: " + e.message);
		});
	
		req2.write(req.body.content);

        req2.end();
	});

	// If an errooccurs display problem
	req1.on('error', function(e) {
		console.log("Problem with request1: " + e.message);
	});

	req1.end();
};


/**************************/
/**  DELETING RAML FILE  **/
/**************************/
//Deletes from the database but not from the toolbar.. yet
//code to update might be in index.html script
exports.deleteFile = function (req, res) {
    console.log('deleting file from: ' + userName);
    var file = req.params.id;

    console.log('file: ' + file);
    //options for delete request
    var reqOps = {
        hostname: host,
        port: '50070',
        path: filePath + userName + '/' + file + '?op=DELETE&user.name=root',
        method: 'DELETE',
    };

    var deleteReq = http.request(reqOps, function (deleteRes) {

        console.log("STATUS: " + deleteRes.statusCode);
        console.log("HEADERS: " + JSON.stringify(deleteRes.headers));
        deleteRes.on('data', function(chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    deleteReq.on('error', function(e) {
        console.log('Problem with delete request: ' + e.message);
    });
    deleteReq.end();
};

