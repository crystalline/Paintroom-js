var fs = require("fs");
var Canvas = require("node-canvas");

var can = new Canvas(100,200);
var c = can.getContext("2d");

c.globalCompositeOperation = "source-over";
c.fillStyle = "#00FF00";
c.strokeStyle = "#00FF00";
c.lineWidth = 4;
c.lineCap = 'round';
c.beginPath();
c.moveTo(10, 10);
c.lineTo(50, 80);
c.stroke();

stream = can.pngStream();
out = fs.createWriteStream(__dirname + '/text.png');

stream.on('data', function(chunk){
  out.write(chunk);
});

stream.on('end', function(){
  console.log('saved png');
});
