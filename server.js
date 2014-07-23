
var express = require('express'),
files = require('./routes/files'),
routes = require('./routes/');
 

var app = express();

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
  app.use(express.static(__dirname + '/dist'));
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
 
app.get('/files', files.findAll);
app.get('/files/:id', files.findById);
app.post('/files', files.addFile);
app.put('/files/:id', files.updateFile);
app.delete('/files/:id', files.deleteFile);
app.get('/', routes.index);

app.get('/logout', function (req, res) {
  delete req.session.user_id;
  res.statusCode = 401;
  res.send({message:"You have logged out!"});
  //res.redirect('/index.html');
});


app.listen(app.get("port"));
console.log('Listening on port 3000...');
