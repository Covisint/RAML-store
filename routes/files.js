var http = require("http");

var mongo = require('mongodb');

var Server = mongo.Server,
  Db = mongo.Db,
  BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {auto_reconnect: true, journal: true, safe:false});
db = new Db('ramldb', server);

db.open(function (err, db) {
  if (!err) {
    console.log("Connected to 'ramldb' database");
    db.collection('files', {strict: true}, function (err, collection) {
      if (err) {
        console.log("The 'files' collection doesn't exist. Use POST to add RAML files...");
        populateDB();
      }
    });
  }
});


/**************************/
/**   FINDING RAML FILE  **/
/**************************/
exports.findById = function (req, res) {
	//var file = req.body.path;
	console.log("id for file: " + req.params.id);
	//console.log('Retrieving file: ' + file);
	//console.log('req.params.path: ' + req.params.path);

  console.log("Sending request...");
  // Options for request
  var options1 = {
		hostname: 'localhost',
		port: '50070',
		path: '/webhdfs/v1/users/' + userName + '/' + req.params.id + '?op=OPEN',
		method: 'GET'
		};

	// FIRST REQUEST: Get specific file form HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));

		/*res1.on('data', function (chunk) {
				console.log('BODY: ' + chunk);
			});*/

		var options2 = {
			hostname: 'localhost',
			port: '50075',
			path: '/webhdfs/v1/users/' + userName + '/' + req.params.id + '?op=OPEN&namenoderpcaddress=localhost:9000&user.name=root',
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

	/*if (req.params.id == "test2.raml")
	{
	
item = {
						"content":"#%25RAML%200.8%0Atitle:%20test!!!!!!"
};
	}*/
	
/*
if(req.params.id == 'undefined' || req.params.id  === null){
  	res.httpStatus = 404;
    res.send(JSON.stringify({status: "error", response: "invalid id"}));
  }
  else{
	  console.log("found id!");
 	  var id = req.params.id;
 	  db.collection('files', function (err, collection) {
 	    collection.findOne({'_id': new BSON.ObjectID(id)}, function (err, item) {
 	      delete item._id;
 	      res.header("Access-Control-Allow-Origin", "*");
		  console.log("ITEM: " + JSON.stringify(item));
 	      res.send(item);
 	    });
 	  });
  }*/

};

// Global variables used in multiple functions
var userName;

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
			hostname: 'localhost',
			port: '50070',
			path: '/webhdfs/v1/users/' + userName + '?op=LISTSTATUS',
			method: 'GET'
	};

	// FIRST REQUEST: Get all files form HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));

		res1.setEncoding('utf8');
		res1.on('data', function (chunk) {
				//console.log("ALL FILES");
				//console.log('BODY: ' + chunk);

				var split1 = chunk.split("pathSuffix\":\"");
				// Start at 1 to avoid grabbing "FileStatuses"
				for(var i = 1; i < split1.length; i++)
				{
					//console.log("path: " + res[i]);
					var split2 = split1[i].split("\",");
					
					console.log(split2[0]);
					paths.push(split2[0]);
					
					// for (var j = 0; j < res2.length; j++)
					//{ console.log("path[" + i + ", " + j + "]: " + res2[j]); }
				}

				for (var i = 0; i < paths.length; i++)
				{
					console.log("path[" + i + "]:" + paths[i]);
					fileList[paths[i]] = {};
					fileList[paths[i]]["path"] = "/" + paths[i];
				}

				console.log("FILELIST: " + JSON.stringify(fileList));
				
				res.send(JSON.stringify({status: "ok", response: fileList}));

			});
	});

	// If an error occurs display problem
	req1.on('error', function(e) {
		console.log("Problem with request1: " + e.message);
	});

	req1.end();	

	/*fileList1 = 
		{
			"Untitled-1.raml":
				{	
					"path":"/Untitled-1.raml",
					//"content":"#%25RAML%200.8%0Atitle:%20test",
					//"name":"Untitled-1.raml",
					//"type":"file",
					//"lastUpdated":"2014-06-30T16:32:10.771Z",
					//"owner":"53b182233ede15d708dad618"
				},
			"test2.raml":
				{
					"path":"/test2.raml",
						//"name":"test2.raml",
						//"content":"#%25RAML%200.8%0Atitle:%20test2",
						//"type":"file",
						//"lastUpdated":"2014-06-30T18:10:06.542Z",
						//"owner":"53b182233ede15d708dad618"
				}
		};

		console.log("FILELIST1: " + JSON.stringify(fileList1));*/

  /*db.collection('files', function (err, collection) {
    collection.find({'owner': req.session.user_id}, function (err, resultCursor) {
      resultCursor.each(function (err, item) {
        if (item != null) {
			console.log("ITEM: " + JSON.stringify(item));
          console.log('Item : ' + item._id + ' : ' + item.path);
          fileList[item._id] = item;
          delete fileList[item._id]._id;
         // console.log(JSON.stringify(fileList));
                  }
                          else {
							  console.log("FILELIST: " + JSON.stringify(fileList));
                                    res.header("Access-Control-Allow-Origin", "*");
                                    res.send(JSON.stringify({status: "ok", response: fileList}));
                          }
                   });
             });
    });*/
	//res.send(JSON.stringify({status: "ok", response: fileList}));
          
};


/**************************/
/** ADDING NEW RAML FILE **/
/**************************/
exports.addFile = function (req, res) {
	console.log("Adding file to user: " + userName);


/*var file = req.body;
  console.log('Adding file : ' + JSON.stringify(file));
  file.owner = req.session.user_id;
  db.collection('files', function (err, collection) {
    collection.insert(file, {safe: true}, function (err, result) {
      if (err) {
        res.send({'error': 'An error has occurred'});
      } else {
        console.log('Success: ' + JSON.stringify(result[0]));
        res.header("Access-Control-Allow-Origin", "*");
        res.send(result[0]);
      }
    });
  });*/
	// Getting the file path name from the request body
	var file = req.body.path;

	console.log("file name: " + file);
	console.log("body: " + req.body.content);

	// Options for first request
	options1 = {
		hostname: 'localhost',
		port: '50070',
		path: '/webhdfs/v1/users/' + userName + file + '?op=CREATE',
		method: 'PUT'
    	};

	var datanode;
	// FIRST REQUEST: Send intial request to redirect HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));
		datanode = res1.headers['location'];
		console.log("Location: " + datanode);
		
		var options2 = {
			hostname: 'localhost',
			port: '50075',
			path: '/webhdfs/v1/users/' + userName + file + '?op=CREATE&namenoderpcaddress=localhost:9000&overwrite=false&user.name=root',
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

exports.updateFile = function (req, res) {
	console.log("Updating file for user: " + userName);


	// Getting the file path name from the request body
	var file = req.body.path;

	console.log("File name: " + file);
	console.log("Body: " + req.body.content);

	var datanode;

	var options1 = {
			hostname: 'localhost',
			port: '50070',
			path: '/webhdfs/v1/users/' + userName + file + '?op=OPEN',
			method: 'GET'
			};

	// FIRST REQUEST: Send initial request to redirect HDFS
	var req1 = http.request(options1, function(res1) {
		console.log("STATUS: " + res1.statusCode);
		console.log("HEADERS: " + JSON.stringify(res1.headers));
		datanode = res1.headers['location'];
		console.log("Location: " + datanode);
		
			var options2 = {
                hostname: 'localhost',
                port: '50075',
                path: '/webhdfs/v1/users/' + userName + file + '?op=CREATE&namenoderpcaddress=localhost:9000&overwrite=true&user.name=root',
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


//Deleting an Existing RAML File
//Deletes from the database but not from the toolbar.. yet
//code to update might be in index.html script
exports.deleteFile = function (req, res) {
    console.log('deleting file from: ' + userName);
    var file = req.params.id;

    console.log('file: ' + file);
    //options for delete request
    var reqOps = {
        hostname: 'localhost',
        port: '50070',
        path: '/webhdfs/v1/users/' + userName + '/' + file + '?op=DELETE&user.name=root',
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

