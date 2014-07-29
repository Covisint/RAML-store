/** HDFS SERVER CONFIGURATION **/
var host = 'http://localhost';
var port = ':50070';
// This is the directory that will store the userNames and RAML files in HDFS (e.g. /webhdfs/v1/tmp/users/jake/myRaml.raml)
var filePath = '/webhdfs/v1/raml';
// Change this if any administrative privileges are needed (e.g. '&user.name=root')
var user_access_name = '';
/*******************************/

// Filename for logs
var log_file = "/var/log/apidoc/RAML_Store.log";

// Logger module
var winston = require('winston');

// Instantiate logger
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: log_file })
    ]
 });

//adding request module to simplify http requests
var request = require("request");

// Username set automatically by extracting header from Nginx
var userName = '';

// Options for Hadoop block and replication size
var blocksize ='&blocksize=1048576'; // 1MB
var replication ='&replication=3'


/**************************/
/**    FIND ALL FILES    **/
/**************************/
exports.findAll = function (req, res) {
	logger.log("info", "IN FUNCTION findAll");
	
    	// Array to store all the file path names
    	var paths = [];

	/** Getting username from Apache Authorization **/
	/*var headers = req.header("authorization");
	// Remove BASIC tag
	var sub = headers.substring(6, headers.length)
	// Decode header from base 64 to a string
	var buffer = new Buffer(sub, 'base64');
	var decoded = buffer.toString();
    	// Split and grab the Username
	var index = decoded.indexOf(':');
    	userName = decoded.substring(0, index);*/

	// Object to send back to index.html
	var fileList = new Object();

	full_uri = host + port + filePath + userName + '?op=LISTSTATUS';
	logger.log("info", "Full uri: " + full_uri);

	request(
        {
            uri: full_uri, 
			followAllRedirects: true, 
			headers: {
				'Connection': 'close'
            		}//end headers
        }//end request options
        //end request
    , function (error, response, body) {
    	logger.log("info", "Response for findAll request");
        logger.log("info", "STATUS: " + response.statusCode);
        logger.log("info", "HEADERS: " + JSON.stringify(response.headers));

        /*** PARSE BODY FOR ALL PATH NAMES ***/
        var split1 = body.split("pathSuffix\":\"");

        //start at 1 to avoid grabbing "FileStatuses"
        for (var i = 1; i < split1.length; i++) {
            var split2 = split1[i].split("\",");
            logger.log("info", "File[" + i + "]: " + split2[0]);
            paths.push(split2[0]);
        }//end for

        //add each of the path names to fileList object
        for (var i = 0; i < paths.length; i++) {
            fileList[paths[i]] = {};
            fileList[paths[i]]["path"] = "/" + paths[i];
        }//end for
        /*** END PARSING FOR PATH NAMES ***/

        if (response.statusCode === 200) {
            logger.log("info", "All files were retrieved successfully");
            //Send the fileList object
            res.send(JSON.stringify({ status: "ok", response: fileList }));
        }//end if
	// The directory has not been created yet - 404
        else if (response.statusCode === 404){
			logger.log("warn", "Creating new directory!");
			full_uri = host + port + filePath + userName + '?op=MKDIRS' + user_access_name;
			logger.log("info", "Full uri: " + full_uri);
			
			request.put({
					uri: full_uri, 
					followAllRedirects: true, 
					headers: {
						'Connection': 'close'
					}//end headers
				}//end request options
				, function (error, response, body) {
					logger.log("info", "Response for creating new directory");
					logger.log("info", "STATUS: " + response.statusCode);
					logger.log("info", "HEADERS: " + JSON.stringify(response.headers));

					if (response.statusCode === 200) {
						logger.log("info", "Successfully created new directory!");
						//Send the fileList object
						res.send(JSON.stringify({ status: "ok", response: fileList }));
					}//end if
					else{
						logger.log("error", "Error creating directory: " + response.statusCode);
					}//end else
				}//end callback function
			);//end request
        }//end else if
	else{
		logger.log("error", "Error retrieving directory: " + response.statusCode);
        }//end else
    })//end callback function
}//end getAllFiles function


/**********************************/
/**   FINDING SINGLE RAML FILE  **/
/********************************/
exports.findById = function (req, res) {
	logger.log("info", "IN FUNCTION findById");
   	var file = "/" + req.params.id;
    	logger.log("info", "File: " + file);

	full_uri = host + port + filePath + userName + file + '?op=OPEN' + user_access_name;
	logger.log("info", "Full URI: " + full_uri);

    	if (file === '/undefined') {
        	logger.log("error", "File is undefined");
    	}//end if

    	else {
    		request({
	    			uri: full_uri, 
				followAllRedirects: true, 
				headers:{
					'Connection': 'close',
					'Content-type': 'application/json'
				}//end headers
            		}//end request options
            		//callback function for request
            		, function (error, response, body) {
            			logger.log("info", "Response for findById request");
                		logger.log("info", "STATUS: " + response.statusCode);
                		logger.log("info", "HEADERS: " + JSON.stringify(response.headers));
                		if (response.statusCode == 200) {
                			logger.log("info", "Document was opened successfully");
                    			//send necessary information to index.html 
                    			item = { "content": body, "path": file};
                    			res.send(item);
                		}//end if
                		else {
                			logger.log("error", "error in findById: " + response.statusCode);
                		}//end else
            		}//end function
            	)//end request
    	}//end else
}//end findbyId function


/**************************/
/** ADDING NEW RAML FILE **/
/**************************/
//New addFile method using request module
exports.addFile = function (req, res) {
	logger.log("info", "IN FUNCTION addFile");
    	var file = req.body.path;
    	logger.log("info", "File path: " + file);

    	bodyContent = req.body.content;

	full_uri = host + port + filePath + userName + file + '?op=CREATE' + user_access_name + '&overwrite=true' + blocksize + replication;
	logger.log("info", "Full uri: " + full_uri);

	if (file === '/undefined') {
		logger.log("error", "File is undefined!");
    	}//end if
    
    	else {
    		request.put({
	        		uri: full_uri, 
				followAllRedirects: true, 
				body: bodyContent, 
				headers: {
					'Connection': 'Close'         
	                	}//end headers
	                    }//end put options
        		//callback function for request
			, function (error, response, body) {
				logger.log("info", "Response for addFile");
				logger.log("info", "STATUS: " + response.statusCode);
				logger.log("info", "HEADERS: " + JSON.stringify(response.headers));

				if (response.statusCode == 201) {
					logger.log("info", "Document was created successfully!");
					item = { "content": bodyContent, "path": file};
					res.send(item);
				}//end if
				else {
					logger.log("error", "Error adding new file: " + response.statusCode);
				}//end else
			}//end callback function
		);//end request
    }//end else
}//end addFile function


/**************************/
/**  UPDATING RAML FILE  **/
/**************************/
exports.updateFile = function (req, res) {
	logger.log("info", "IN FUNCTION updateFile");
    	//get file path name from request body
    	var file = "/" + req.params.id;
    	logger.log("info", "File: " + file);
    	var bodyContent = req.body.content;

	if (file === '/undefined') {
		logger.log("error", "File is undefined!");
    	}//end if

	else {
		full_uri = host + port + filePath + userName + file + '?op=CREATE' + user_access_name + '&overwrite=true' + replication + blocksize;
		logger.log("info", "Full uri: " + full_uri);

		request.put(
			{
				uri: full_uri,
				followAllRedirects: true, 
				body: bodyContent,
				headers: {
					'Connection': 'Close'
				}
			}//end request.post parameters
		  	//callback function for the Request  
			, function (error, response, body) {
				logger.log("info", "Response for updateFile");
				logger.log("info", "STATUS: " + response.statusCode);
				logger.log("info", "HEADERS: " + JSON.stringify(response.headers));

				if (response.statusCode == 201) {
					logger.log("info", "Document was saved successfully!!!!");
					//need to use main function req and res for this
					res.send('{"status":"success","id":"' + file + '","message":"The file was successfully updated."}');   
				}//end if
				else {
					logger.log("error", "Error with updateFile: " + response.statusCode);
				}//end else
			}//end callback function
		)//end request.put
	}
}//end update file method


/**************************/
/**  DELETING RAML FILE  **/
/**************************/
//new Delete function using Request module
exports.deleteFile = function (req, res) {
	logger.log("info", "IN FUNCTION deleteFile");
    var file = "/" + req.params.id;
    logger.log("info", "Deleting file: " + file + " from user: " + userName);

	full_uri = host + port + filePath + userName + file + '?op=DELETE' + user_access_name;
	logger.log("info", "Full uri: " + full_uri);

    if (file == 'undefined') {
        logger.log("error", "The file is undefined and cannot be deleted");
    }//end if
    
    else {
        request.del(
            {
                uri: full_uri, 
				followAllRedirects: true, 
				headers: {
                    'Connection': 'close'
                }//end headers
            }//end request options
            //callback function for the Request  
        , function (error, response, body) {
        	logger.log("info", "Response for deleteFile");
		logger.log("info", "STATUS: " + response.statusCode);
		logger.log("info", "HEADERS: " + JSON.stringify(response.headers));

            	if (response.statusCode == 200) {
            		logger.log("info", "Document was deleted successfully");
               		//send so that index.html knows the delete was successful
                	res.send(req.body);
            	}//end if
            	else {
                	logger.log("error", "Error with deleteFile: " + response.statusCode);
            	}//end else
        }//end function
      )//end request.delete function
    }//end else
}//end exports delete function

/**********************************/
/**   RAML FILE FOR CONSOLE.HTML **/
/**********************************/
exports.consoleHDFS = function (req, res) {
	logger.log("info", "IN FUNCTION consoleHDFS");
    var file = "/" + req.params.id;
    logger.log("info", "File: " + file);

	full_uri = host + port + filePath + userName + file + '?op=OPEN' + user_access_name;
	logger.log("info", "Full URI: " + full_uri);

    if (file === '/undefined') {
        logger.log("error", "File is undefined");
    }//end if

    else {
        request(
            {
                uri: full_uri, 
				followAllRedirects: true, 
				headers: {
                    'Connection': 'close',
					'Content-type': 'application/json'
                }//end headers
            }//end request options
            , function (error, response, body) {
				logger.log("info", "Response for findById request");
                logger.log("info", "STATUS: " + response.statusCode);
                logger.log("info", "HEADERS: " + JSON.stringify(response.headers));
                if (response.statusCode == 200) {
                    logger.log("info", "Document was opened successfully");
                    //send decoded body to console.html 
					res.send(decodeURI(body));
                }//end if
                else {
                    logger.log("error", "error in findById: " + response.statusCode);
                }//end else
            }//end function
            )//end request
    }//end else
}//end findbyId function
