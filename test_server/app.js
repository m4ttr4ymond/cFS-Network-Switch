var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const dgram = require('dgram');
const test = require('./public/javascripts/testing_functions');
const FileSync = require('lowdb/adapters/FileSync')
var router = require('./routes/index');
var users = require('./routes/users');
const low = require('lowdb');

// database
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ client: [] }).write();


var app = express();

const rec_orig_state = 8081
const rec_new_state = 8082

var server = require('http').Server(app);
var io = require('socket.io')(server);

// UDP socket
const socket1 = dgram.createSocket('udp4');
const socket2 = dgram.createSocket('udp4');

socket1.on('message', (message, rinfo) => {
  console.log('received state');
  let data = test.extract_data(message);
  
  let datagram_contents = {
    ip: rinfo.address,
    source_port: rinfo.port,
    app_id: data.id,
    time_sent: data.date,
    contents: data.buffer.toString()
  };
  
  let client_id = `${rinfo.address}_${rinfo.port}`;
  
  let user_exists = db.get('client')
  .filter({ client: client_id }).value() == [];
  
  if (!user_exists) {
    db.get('client')
    .push({ client: client_id, messages: [] })
    .write();
  };
  
  db.get("client")
  .find({ client: client_id })
  .get("messages")
  .push(datagram_contents)
  .write();
  
  io.emit('update', {
    client: client_id,
    message: datagram_contents
  });
  
  console.log('saved state to local database');
});

socket2.on('message', (message, rinfo) => {
  console.log("received new state", message);
});

socket1.bind(rec_orig_state);
socket2.bind(rec_new_state);

const testing_socket = dgram.createSocket('udp4');
setTimeout(() => {
  testing_socket.send(test.generateBuffer(), 0, 256, rec_orig_state, '0.0.0.0', () => {
    console.log('sent simulated message');
  });
}, 3000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
  res.io = io;
  next();
});

app.use('/', router);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

io.on('connection', (socket) => {
  console.log('a user connected');
  io.emit('data_initialization', db.get('client').value());

  
  socket.on('send_state_init', data => {
    console.log('sending state to new client');

    // ToDo: not checking for the app id, but probably should
   let packet = db.get('client')
      .find({client: data.source_id})
      .get("messages")
      .find({time_sent: data.time_sent})
      .value();

    let buffer = Buffer.from(packet.contents, 'utf8');

    // todo: need to actually send the state here
      testing_socket.send(buffer, rec_new_state, packet.ip, (err, bytes) => {
        io.emit('state_sent', {result: err == null});
    });
  })
});


module.exports = { app: app, server: server };
