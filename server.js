'use strict';

const express = require('express');
const dgram = require('dgram');
const test = require('./js/testing_functions');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const path = require('path');

// Constants
const http_port = 8080;
const udp_port = 8082
const host = '0.0.0.0';

// database
const adapter = new FileSync('db.json')
const db = low(adapter)


db.defaults({ client: []}).write()

// App
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// UDP socket
const socket = dgram.createSocket('udp4');

let captured_hosts = {};


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/html/index.html'));
});

app.get('/js/:filename', (req, res) => {
  res.sendFile(path.join(__dirname + `/js/${req.params.filename}`));
});

app.get('/file/:filename', (req, res) => {
  res.sendFile(path.join(__dirname + `/${req.params.filename}`));
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

console.log(io);

socket.on('message', (message, rinfo) => {
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

  if(!user_exists) {
    db.get('client')
      .push({ client: client_id, messages: [] })
      .write();
  };

  db.get("client")
    .find({ client: client_id })
    .get("messages")
    .push(datagram_contents)
    .write();
});

app.listen(http_port, host);
socket.bind(udp_port);

const testing_socket = dgram.createSocket('udp4');
testing_socket.send(test.generateBuffer(), 0, 256, 8082, '0.0.0.0', () => {
  console.log('sent');
});

app.use(function (req, res, next) {
  console.log(res);
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.send('<p>404</p>');
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});