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
const { info } = require('console');
const { debugPort } = require('process');
const fs = require('fs');
const { promisify } = require('util');
const { resolve } = require('path');
const { PreconditionFailed } = require('http-errors');


const MAX_PACKAGES = 30;


// state database
const state_adapter = new FileSync('./database/state_db.json')
const state_db = low(state_adapter)
state_db.defaults({}).write();

// app database
const app_adapter = new FileSync('./database/app_db.json')
const app_db = low(app_adapter)
app_db.defaults({apps: []}).write();


var app = express();

const rec_orig_state = 8081
const rec_new_state = 8082

var server = require('http').Server(app);
var io = require('socket.io')(server);

// UDP socket
const socket1 = dgram.createSocket('udp4');

socket1.on('message', (message, rinfo) => {
  console.log(`received state from ${rinfo.address}:${rinfo.port}`);

  let data = test.extract_data(message);

  console.log(data);
  
  ip = rinfo.address.replace(/\./g, "․");

  // data.buffer.foreach(console.log);
  console.log(new Uint8Array(data.buffer))

  let datagram_contents = {
    ip: ip,
    source_port: rinfo.port,
    app_id: data.id,
    time_sent: data.date,
    contents: Array.from(new Uint8Array(data.buffer))
  };

  console.log(datagram_contents.app_id.toString(16));
  console.log(datagram_contents.time_sent.toString(16));
  
  let client_id = `${ip}_${rinfo.port}`;
  
  let user_exists = state_db.get(client_id).value() != undefined;

  if (!user_exists) {
    state_db.set(client_id, [])
    .write();
  };

  let messages = state_db.get(client_id)
    .value()

  messages.push(datagram_contents);
  newest = messages.slice(Math.max(messages.length - MAX_PACKAGES, 0));
  oldest = messages.slice(0,Math.max(messages.length - MAX_PACKAGES, 0));

  state_db.set(client_id, newest)
    .write();
  
  io.emit('update', {
    client_id: client_id,
    newMessage: datagram_contents,
    oldMessages: oldest
  });
  
  console.log('saved state to local database');
});

socket1.bind(rec_orig_state);

const testing_socket = dgram.createSocket('udp4');

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
  console.log("404 Error");
  // next(createError(404));
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

  let apps = app_db.get('apps').value();
  apps.sort((a, b) => {
    return a.id > b.id ? 1 : (a.id < b.id ? -1 : 0);
  });

  io.emit('load_apps', apps);

  // Send state data

  let data = state_db.cloneDeep().value();

  for (let k in data) {
    data[k].reverse();
  }

  io.emit('data_initialization', data);
  
  socket.on('send_state_init', data => {
    console.log('sending state to new client');

    schedule_table = test.readFile("schedule_table.tbl", 2);
    cfs_app = test.readFile("cfs_app.so", 3);
    message_table = test.readFile("message_table.tbl", 4);

    // ToDo: not checking for the app id, but probably should
    let packet = state_db.get(data.source_id)
        .find({time_sent: data.time_sent})
        .value();

    var prepended = test.prepend_data(new Uint8Array(packet.contents));

    let buffer = test.addIdentifier(prepended, 1);

    ip = data.dest_id.split("_")[0].replace(/․/g, ".");

    // todo: need to actually send the state here
    testing_socket.send(buffer, rec_new_state, ip, (err, bytes) => {
      if(err == null) {
        testing_socket.send(schedule_table, rec_new_state, ip, (err, bytes) => {
          if (err == null) {
            testing_socket.send(cfs_app, rec_new_state, ip, (err, bytes) => {
              if (err == null) {
                testing_socket.send(message_table, rec_new_state, ip, (err, bytes) => {
                  if (err == null) {
                    io.emit('state_sent', { result: err == null });
                  }
                  else {
                    io.emit('state_sent', { result: true });
                  }
                });
              }
              else {
                io.emit('state_sent', { result: true });
              }
            });
          }
          else {
            io.emit('state_sent', { result: true });
          }
        });
      }
      else {
        io.emit('state_sent', { result: true });
      }
    });
  });

  socket.on('delete', data => {
    let vars = data.split("_");
    console.log(`deleting states for ${vars[0]}:${vars[1]}`);

    try {
      state_db.unset(data).write();
      socket.emit('deleted', {
        target: data,
        success: true
      });
    } catch (error) {
      socket.emit('deleted', {
        target: data,
        success: false
      });

      console.trace(error);
    }
  })
});


module.exports = { app: app, server: server };
