var http = require("http");
//adding request module to simplify http requests
var request = require("request");

// Global variables used in multiple functions
var host = 'http://localhost';
var port = ':50070';
var userName;
var filePath = '/webhdfs/v1/users/';
var user_access_name = '&user.name=root';

/**********************************/
/**   FINDING SINGLE RAML FILE  **/
/********************************/
//new find by id with single request using request module
exports.findById = function (req, res) {
    console.log("FINDING SINGLE RAML FILE");
    var file = "/" + req.params.id;
    console.log("file: " + file);

	full_uri = host + port + filePath + userName + file + '?op=OPEN' + user_access_name;
	console.log("Full URI: " + full_uri);

    if (file === '/undefined') {
        console.log("File is undefined");
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
                console.log("STATUS: " + response.statusCode);
                console.log("HEADERS: " + JSON.stringify(response.headers));
                if (response.statusCode == 200) {
                    console.log("Document was opened successfully");
                    //console.log("response: " + JSON.stringify(response));
                    console.log("body: " + body);
                    //send so that index.html knows the delete was successful
                    item = { "content": body, "path": file, "name": file.substr(1, file.length)};
					console.log("item: " + JSON.stringify(item));
                    res.send(item);
                   // res.send(body);
                }//end if
                else {
                    console.log("error: " + response.statusCode);
                    console.log("body: " + JSON.stringify(body));
                }//end else
            }//end function
            )//end request
    }//end else
}//end findbyId function


/**************************/
/**    FIND ALL FILES    **/
/**************************/
exports.findAll = function (req, res) {
    console.log("GETTING ALL FILES");
	var paths = [];

	/** Getting username from Nginx Authorization **/
	var headers = req.header("authorization");
	// Remove BASIC tag
	var sub = headers.substring(6, headers.length)
	// Decode header from base 64 to a string
	var buffer = new Buffer(sub, 'base64');
	var decoded = buffer.toString();
    // Split and grab the Username
    //findme: Hardcoding username and disabling nginx to debug
	var index = decoded.indexOf(':');
    userName = decoded.substring(0, index);

	var fileList = new Object();

	full_uri = host + port + filePath + userName + '?op=LISTSTATUS';
	console.log("Full uri: " + full_uri);

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
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));

        /*** PARSE BODY FOR ALL PATH NAMES ***/
        var split1 = body.split("pathSuffix\":\"");

        //start at 1 to avoid grabbing "FileStatuses"
        for (var i = 1; i < split1.length; i++) {
            var split2 = split1[i].split("\",");
            console.log(split2[0]);
            paths.push(split2[0]);
        }//end for

        //add each of the path names to fileList object
        for (var i = 0; i < paths.length; i++) {
            fileList[paths[i]] = {};
            fileList[paths[i]]["path"] = "/" + paths[i];
        }//end for
        /*** END PARSING FOR PATH NAMES ***/

        if (response.statusCode === 200) {
            console.log("All files were retrieved successfully");
            //Send the fileList object
            res.send(JSON.stringify({ status: "ok", response: fileList }));
        }//end if
		// The directory has not been created yet - 404
        else if (response.statusCode === 404){
			console.log("Creating new directory!");
			full_uri = host + port + filePath + userName + '?op=MKDIRS' + user_access_name;
			console.log("Full uri: " + full_uri);
			
			request.put(
				{
					uri: full_uri, 
					followAllRedirects: true, 
					headers: {
						'Connection': 'close'
					}//end headers
				}//end request options
				, function (error, response, body) {
					console.log("STATUS: " + response.statusCode);
					console.log("HEADERS: " + JSON.stringify(response.headers));

					if (response.statusCode === 200) {
						console.log("Successfully created new directory!");
						//Send the fileList object
						res.send(JSON.stringify({ status: "ok", response: fileList }));
					}//end if
					else{
						console.log("Error creating directory: " + response.statusCode);
					}
				}//end callback function
			);//end request
        }
		else{
            console.log("Error retrieving directory: " + response.statusCode);
        }//end else
    });//end callback function
}//end getAllFiles function


/**************************/
/** ADDING NEW RAML FILE **/
/**************************/
//New addFile method using request module
exports.addFile = function (req, res) {
    console.log("NEW ADD FILE METHOD");
    var file = req.body.path;
    console.log("file path: " + file);
    bodyContent = req.body.content;
    console.log("body content: " + bodyContent);

	full_uri = host + port + filePath + userName + file + '?op=CREATE' + user_access_name + '&overwrite=true';
	console.log("Full uri: " + full_uri);

    if (file === '/undefined') {
        console.log("file is undefined");
    }//end if
    
    else {
        request.put(
            {
                uri: full_uri, 
				followAllRedirects: true, 
				body: bodyContent, 
				headers: {
                    'Connection': 'Close'         
                }//end headers
            }//end post options
            //)//end request.post
        //callback function
			, function (error, response, body) {
				if (response.statusCode == 201) {
					//console.log("Document was created successfully!!!!");
					console.log("response body: " + body);
					item = { "content": bodyContent, "path": file};
					res.send(item);
				}//end if
				else {
					console.log("error: " + response.statusCode);
					console.log("body: " + JSON.stringify(body));
				}//end else
			}//end callback function
		);//end request
    }//end else
}//end addFile function


/**************************/
/**  UPDATING RAML FILE  **/
/**************************/
exports.updateFile = function (req, res) {
    console.log("new update function");
    //get file path name from request body
    var file = "/" + req.params.id;
    console.log("FILE_NAME: " + file);
    var bodyContent = req.body.content;
    console.log("BODY: " + bodyContent);

	if (file === '/undefined') {
        console.log("file is undefined");
    }//end if

	else {
		full_uri = host + port + filePath + userName + file + '?op=CREATE' + user_access_name + '&overwrite=true';
		console.log("Full uri: " + full_uri);

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
				console.log("STATUS: " + response.statusCode);
				console.log("HEADERS: " + JSON.stringify(response.headers));

				if (response.statusCode == 201) {
					console.log("Document was saved successfully!!!!");
					console.log("response body: " + body);
					//need to use main function req and res for this
					res.send('{"status":"success","id":"' + file + '","message":"The file was successfully updated."}');   
				}//end if
				else {
					console.log("error: " + response.statusCode);
					console.log(body);
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
    var file = "/" + req.params.id;
    console.log("Deleting file: " + file + " from user: " + userName);

	full_uri = host + port + filePath + userName + file + '?op=DELETE' + user_access_name;
	console.log("Full uri: " + full_uri);

    if (file == 'undefined') {
        console.log("The file is undefined and cannot be deleted");
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
            console.log("STATUS: " + response.statusCode);
            console.log("HEADERS: " + JSON.stringify(response.headers));

            if (response.statusCode == 200) {
                console.log("Document was deleted successfully");
                console.log("response body: " + body);
                //send so that index.html knows the delete was successful
                res.send(req.body);
            }//end if
            else {
                console.log("error: " + response.statusCode);
                console.log("body: " + JSON.stringify(body));
            }//end else
        }//end function
      )//end request.delete function
    }//end else
}//end exports delete function