var io = require('socket.io').listen(app)
  , fs = require('fs')
  , Canvas = require('node-canvas');

/*
var canvas = new Canvas(200,200);
var ctx = canvas.getContext('2d');

ctx.font = '30px Impact';
ctx.rotate(.1);
ctx.fillText("Awesome!", 50, 100);

var te = ctx.measureText('Awesome!');
ctx.strokeStyle = 'rgba(0,0,0,0.5)';
ctx.beginPath();
ctx.lineTo(50, 102);
ctx.lineTo(50 + te.width, 102);
ctx.stroke();

console.log('<img src="' + canvas.toDataURL() + '" />');
*/

function Session() {
    
}

io.sockets.on('connection', function (socket) {
  socket.emit('chat', { count: 0, text: '[Connected to chat server]' });
  socket.on('chat', function (data) {
    data.count = msgcount;
    msgcount++;
    console.log("chat msg: " + data);
    io.sockets.emit('chat', data);
  });
});

