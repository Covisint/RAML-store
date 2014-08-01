/** HDFS SERVER CONFIGURATION **/
var host = 'http://localhost';
var port = ':50070';
// This is the directory that will store the userNames and RAML files in HDFS (e.g. /webhdfs/v1/tmp/users/jake/myRaml.raml)
var filePath = '/webhdfs/v1/raml';
// Change this if any administrative privileges are needed (e.g. '&user.name=root')
var user_access_name = '';
/*******************************/

// Options for Hadoop block and replication size
var blocksize ='&blocksize=1048576'; // 1MB
var replication ='&replication=3'

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

// Username set automatically by extracting header from Apache
var userName = '';


/**************************/
/**    FIND ALL FILES    **/
/**************************/
exports.findAll = function (req, res) {
	var functionName = "findAll";
	
    // Array to store all the file path names
    var paths = [];

	/** Getting username from Apache Authorization **/
	var headers = req.header("authorization");
	// Remove BASIC tag
	var sub = headers.substring(6, headers.length)
	// Decode header from base 64 to a string
	var buffer = new Buffer(sub, 'base64');
	var decoded = buffer.toString();
    	// Split and grab the Username
	var index = decoded.indexOf(':');
    	userName = decoded.substring(0, index);

	// Object to send back to index.html
	var fileList = new Object();

	full_uri = host + port + filePath + userName + '?op=LISTSTATUS';
	logger.log("info", "Full uri: " + full_uri, {function: functionName, username:userName});

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
        logger.log("info", "RESPONSE STATUS: " + response.statusCode, {function: functionName, username:userName});
        logger.log("info", "RESPONSE HEADERS: " + JSON.stringify(response.headers), {function: functionName, username:userName});

        /*** PARSE BODY FOR ALL PATH NAMES ***/
        var split1 = body.split("pathSuffix\":\"");

        //start at 1 to avoid grabbing "FileStatuses"
        for (var i = 1; i < split1.length; i++) {
            var split2 = split1[i].split("\",");
            logger.log("info", "File[" + i + "]: " + split2[0], {function: functionName, username:userName});
            paths.push(split2[0]);
        }//end for

        //add each of the path names to fileList object
        for (var i = 0; i < paths.length; i++) {
            fileList[paths[i]] = {};
            fileList[paths[i]]["path"] = "/" + paths[i];
        }//end for
        /*** END PARSING FOR PATH NAMES ***/

        if (response.statusCode === 200) {
            logger.log("info", "All files were retrieved successfully", {function: functionName, username:userName});
            //Send the fileList object
            res.send(JSON.stringify({ status: "ok", response: fileList }));
        }//end if
	// The directory has not been created yet - 404
        else if (response.statusCode === 404){
			logger.log("warn", "Creating new directory!", {function: functionName, username:userName});
			full_uri = host + port + filePath + userName + '?op=MKDIRS' + user_access_name;
			logger.log("info", "Full uri: " + full_uri, {function: functionName, username:userName});
			
			request.put({
					uri: full_uri, 
					followAllRedirects: true, 
					headers: {
						'Connection': 'close'
					}//end headers
				}//end request options
				, function (error, response, body) {
					logger.log("info", "RESPONSE STATUS for creating new directory: " + response.statusCode, {function: functionName, username:userName});
					logger.log("info", "RESPONSE HEADERS for creating new directory: " + JSON.stringify(response.headers), {function: functionName, username:userName});

					if (response.statusCode === 200) {
						logger.log("info", "Successfully created new directory!", {function: functionName, username:userName});
						//Send the fileList object
						res.send(JSON.stringify({ status: "ok", response: fileList }));
					}//end if
					else{
						logger.log("error", "Error creating directory: " + response.statusCode, {function: functionName, username:userName});
					}//end else
				}//end callback function
			);//end request
        }//end else if
	else{
		logger.log("error", "Error retrieving directory: " + response.statusCode, {function: functionName, username:userName});
        }//end else
    })//end callback function
}//end getAllFiles function


/**********************************/
/**   FINDING SINGLE RAML FILE  **/
/********************************/
exports.findById = function (req, res) {
	var functionName = 'findById';

   	var file = "/" + req.params.id;
    	logger.log("info", "File: " + file, {function: functionName, username:userName});

	full_uri = host + port + filePath + userName + file + '?op=OPEN' + user_access_name;
	logger.log("info", "Full URI: " + full_uri, {function: functionName, username:userName});

    	if (file === '/undefined') {
        	logger.log("error", "File is undefined", {function: functionName, username:userName});
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
                		logger.log("info", "RESPONSE STATUS: " + response.statusCode, {function: functionName, username:userName});
                		logger.log("info", "RESPONSE HEADERS: " + JSON.stringify(response.headers), {function: functionName, username:userName});
                		if (response.statusCode == 200) {
                			logger.log("info", "Document was opened successfully", {function: functionName, username:userName});
                    			//send necessary information to index.html 
                    			item = { "content": body, "path": file};
                    			res.send(item);
                		}//end if
                		else {
                			logger.log("error", "error in request: " + response.statusCode, {function: functionName, username:userName});
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
	var functionName = 'addFile';

    var file = req.body.path;
    logger.log("info", "File path: " + file, {function: functionName, username:userName});

    bodyContent = req.body.content;

	full_uri = host + port + filePath + userName + file + '?op=CREATE' + user_access_name + '&overwrite=true' + blocksize + replication;
	logger.log("info", "Full uri: " + full_uri, {function: functionName, username:userName});

	if (file === '/undefined') {
		logger.log("error", "File is undefined!", {function: functionName, username:userName});
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
				logger.log("info", "RESPONSE STATUS: " + response.statusCode, {function: functionName, username:userName});
				logger.log("info", "RESPONSE HEADERS: " + JSON.stringify(response.headers), {function: functionName, username:userName});

				if (response.statusCode == 201) {
					logger.log("info", "Document was created successfully!", {function: functionName, username:userName});
					item = { "content": bodyContent, "path": file};
					res.send(item);
				}//end if
				else {
					logger.log("error", "Error adding new file: " + response.statusCode, {function: functionName, username:userName});
				}//end else
			}//end callback function
		);//end request
    }//end else
}//end addFile function


/**************************/
/**  UPDATING RAML FILE  **/
/**************************/
exports.updateFile = function (req, res) {
	var functionName = 'updateFile';

	//get file path name from request body
	var file = "/" + req.params.id;
	logger.log("info", "File: " + file, {function: functionName, username:userName});
	var bodyContent = req.body.content;

	if (file === '/undefined') {
		logger.log("error", "File is undefined!");
    	}//end if

	else {
		full_uri = host + port + filePath + userName + file + '?op=CREATE' + user_access_name + '&overwrite=true' + replication + blocksize;
		logger.log("info", "Full uri: " + full_uri, {function: functionName, username:userName});

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
				logger.log("info", "RESPONSE STATUS: " + response.statusCode, {function: functionName, username:userName});
				logger.log("info", "RESPONSE HEADERS: " + JSON.stringify(response.headers), {function: functionName, username:userName});

				if (response.statusCode == 201) {
					logger.log("info", "Document was updated successfully!", {function: functionName, username:userName});
					//need to use main function req and res for this
					res.send('{"status":"success","id":"' + file + '","message":"The file was successfully updated."}');   
				}//end if
				else {
					logger.log("error", "Error with updateFile: " + response.statusCode, {function: functionName, username:userName});
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
	var functionName= 'deleteFile';

    var file = "/" + req.params.id;
    logger.log("info", "Deleting file: " + file, {function: functionName, username:userName});

	full_uri = host + port + filePath + userName + file + '?op=DELETE' + user_access_name;
	logger.log("info", "Full uri: " + full_uri, {function: functionName, username:userName});

    if (file == 'undefined') {
        logger.log("error", "The file is undefined and cannot be deleted", {function: functionName, username:userName});
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
			logger.log("info", "RESPONSE STATUS: " + response.statusCode, {function: functionName, username:userName});
			logger.log("info", "RESPONSE HEADERS: " + JSON.stringify(response.headers), {function: functionName, username:userName});

            if (response.statusCode == 200) {
            	logger.log("info", "Document was deleted successfully!", {function: functionName, username:userName});
               	//send so that index.html knows the delete was successful
                res.send(req.body);
            }//end if
            else {
                logger.log("error", "Error with deleteFile: " + response.statusCode, {function: functionName, username:userName});
            }//end else
        }//end function
      )//end request.delete function
    }//end else
}//end exports delete function

/**********************************/
/**   RAML FILE FOR CONSOLE.HTML **/
/**********************************/
exports.consoleHDFS = function (req, res) {
	var functionName = 'consoleHDFS';

    var file = "/" + req.params.id;
    logger.log("info", "File: " + file, {function: functionName, username:userName});

	full_uri = host + port + filePath + userName + file + '?op=OPEN' + user_access_name;
	logger.log("info", "Full URI: " + full_uri, {function: functionName, username:userName});

    if (file === '/undefined') {
        logger.log("error", "File is undefined", {function: functionName, username:userName});
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
                logger.log("info", "RESPONSE STATUS: " + response.statusCode, {function: functionName, username:userName});
                logger.log("info", "RESPONSE HEADERS: " + JSON.stringify(response.headers), {function: functionName, username:userName});
                if (response.statusCode == 200) {
                    logger.log("info", "Document was opened successfully!", {function: functionName, username:userName});
                    //send decoded body to console.html 
					res.send(decodeURI(body));
                }//end if
                else {
                    logger.log("error", "error in request: " + response.statusCode, {function: functionName, username:userName});
                }//end else
            }//end function
            )//end request
    }//end else
}//end findbyId function
