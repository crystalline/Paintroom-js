var io = require("socket.io").listen(3000);
var fs = require("fs");
var Canvas = require("node-canvas");

function makeid(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function genRoomName() {
    var name = makeid(6);
    while (Room.rooms[name]) {
        name = makeid(6);
    }
    return name;
}

var MaxCanvasWidth = 2000,
    MaxCanvasHeight = 1100;


//TODO: prune old rooms
var Room = function(width, height) {

    this.name = genRoomName();
    
    this.width = Math.min(MaxCanvasWidth, width);
    this.height = Math.min(MaxCanvasHeight, height);
    this.canvas = new Canvas(width, height);
    this.ctx = this.canvas.getContext("2d");
   
    Room.rooms[this.name] = this;
};

Room.rooms = {};

Room.prototype.replayEvent = function(ev) {
    ctx = this.ctx;

    //console.log(ev);
    
    if (ev.tool == "brush") {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = ev.col;
        ctx.strokeStyle = ev.col;
    }
    if (ev.tool == "erase") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,255)";
        ctx.strokeStyle = "rgba(0,0,0,255)";
    }
    
    if (ev.type == "point") {
        ctx.beginPath();
        ctx.arc(ev.x, ev.y, ev.radius, 0, 2 * Math.PI, false);
        ctx.fill();
    }
    if (ev.type == "line") {
        ctx.lineWidth = ev.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ev.px, ev.py);
        ctx.lineTo(ev.x, ev.y);
        ctx.stroke();
    }
};

io.sockets.on("connection", function (socket) {
    
    socket.on("check", function(roomName) {
        if(Room.rooms[roomName]) {
            socket.emit("check", roomName);
        } else {
            socket.emit("check", "");
        }
    });
    
    socket.on("subscribe", function(data) { socket.join(data); });
    
    socket.on("unsubscribe", function(data) { socket.leave(data); });
    
    socket.on("sync", function(data) {
        var room = Room.rooms[data.room];
        var requestWidth = data.width;
        var requestHeight = data.height;
        if (room) {
            //var imageData = room.ctx.getImageData(0, 0, Math.min(room.width, requestWidth), Math.min(room.height, requestHeight))
            //imageData.height = Math.min(room.height, requestHeight);
            //imageData.width = Math.min(room.width, requestWidth);
            
            var imageData = room.canvas.toDataURL();
            
            console.log("syncing room :"+room.name+"data : "+imageData.length);
            
            socket.emit("sync", {status:true, pixels:imageData});
        } else {
            socket.emit("sync", {status:false});
        }
    });
    
    socket.on("event", function(data) {
        Room.rooms[data.room].replayEvent(data);
        io.sockets.in(data.room).emit("event", data);
    });
    
    socket.on("create", function(data) {
        var room = new Room(data.width, data.height);
        
        console.log("creating room :"+room.name+"data : "+data.pixels.length);
        
        var img = new Canvas.Image;
        img.src = data.pixels;
        
        room.ctx.drawImage(img,0,0);
        
        socket.emit("create", room.name);
    });
    
});

