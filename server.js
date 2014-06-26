
var express = require('express'),
files = require('./routes/files'),
routes = require('./routes/');
 
var util = require('./api-designer/scripts/sha1.js');

var app = express();

var mongo = require('mongodb');

var Server = mongo.Server,
  Db = mongo.Db,
  BSON = mongo.BSONPure;

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.logger('dev'));
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({secret: '1234567890QWERTY'}));  
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
  app.use(express.static(__dirname + '/api-designer'));
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

/**
 * ------
 * ROUTES
 * ------
 */
 
app.get('/files', checkAuth, files.findAll);
app.get('/files/:id', checkAuth, files.findById);
app.post('/files', checkAuth, files.addFile);
app.put('/files/:id', checkAuth, files.updateFile);
app.delete('/files/:id', checkAuth, files.deleteFile);
app.get('/', checkAuth, routes.index);

app.get('/logout', function (req, res) {
  delete req.session.user_id;
  res.statusCode = 401;
  res.send({message:"You have logged out!"});
  //res.redirect('/index.html');
});


app.listen(app.get("port"));
console.log('Listening on port 3000...');


require("./mongo-http.js")

function checkAuth(req, res, next) {
	
/** Getting username from Nginx Authorization **/
	var headers = req.header("authorization");
	// Remove BASIC tag
	var sub = headers.substring(6, headers.length)
	// Decode header from base 64 to a string
	var buffer = new Buffer(sub, 'base64');
	var decoded = buffer.toString();
	// Split and grab the Username
	var index = decoded.indexOf(':');
	var userName = decoded.substring(0, index);
	console.log("userName: " + userName);

/** CHECKING IF USER IS IN MONGODB **/
  db.collection('users', function (err, collection) {
        collection.findOne({'mail': userName}, function (err, item) {
			// Item not found or error has occured
			if(!item || err){
			  console.log("error: " + err);
            }
			else{
				req.session.user_id = item._id;
				console.log("user_id1: " + req.session.user_id);
				if (!req.session || !req.session.user_id) {
					res.statusCode = 401;
					res.send({status:"error", message:"You are not authorized to view this page"});
				} 
				else {
					next();
				}
			}
        });
	});

}


