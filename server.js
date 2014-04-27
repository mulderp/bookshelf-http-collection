var express = require('express');
var app = express();
var http = require('http');
var logger = require('morgan');

var delayed = require('./delay');

app.use(logger());
app.use(delayed);

app.use(function(req, res, next) {
  res.send(200, '[{"result": "' + req.delay + '"}]');
});

http.createServer(app).listen(3000);
