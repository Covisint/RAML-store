RAML API Designer with HDFS
==========
This version of RAML's API designer uses the Hadoop Distributed File System (HDFS) as the persistence layer of storing RAML files.
User authentication will be done through Nginx, and the application will grab the username from the request header.

The module 'request' is being used to send HTTP requests to HDFS.

The module 'winston' is being used for logging.

Installation steps
=======
You need to have access to a Hadoop server to use the application.

To install the node modules, run **npm install** in the main directory (where package.json is).

To start the application, run **node server.js** in the same directory.

Configurations
=======
By default, the application will run on port 3000. To change the port, edit this line in server.js: 

```
app.set('port', process.env.PORT || 3000);
```

To configure the HDFS server that the applicaiton will use edit this block in 'routes/files.js':
```
/** SERVER CONFIGURATION **/
var host = 'http://localhost';
var port = ':50070';
// This is the directory that will store the userNames and RAML files in HDFS (e.g. /webhdfs/v1/users/jake/myRaml.raml)
var filePath = '/webhdfs/v1/users/';
// Change this if any administrative privileges are needed (e.g. '&user.name=root')
var user_access_name = '';
/*************************/
```

To change the name of the log file edit this line in 'files.js': 
```
var log_file = "RAML_Store.log";
```

The username is extracted from Nginx in the findAll function in files.js: 
```
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
```







