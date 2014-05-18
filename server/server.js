//Drawing app server

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
    
    this.clientcount = 0;
    
    this.width = Math.min(MaxCanvasWidth, width);
    this.height = Math.min(MaxCanvasHeight, height);
    this.canvas = new Canvas(width, height);
    this.ctx = this.canvas.getContext("2d");
    
    this.sizeMaxed = false;
    
    Room.rooms[this.name] = this;
};

Room.rooms = {};
Room.sockRoom = {};

Room.prototype.resize = function(neww, newh) {
    var w = this.width;
    var h = this.height;
    
    if (w >= neww && h >= newh) {
        return;
    }
    
    var setw = Math.min(MaxCanvasWidth, Math.max(neww + 200, w));
    var seth = Math.min(MaxCanvasHeight, Math.max(newh + 200, h));
    
    if( setw == MaxCanvasWidth && seth == MaxCanvasHeight ) {
        this.sizeMaxed = true;
    }
    
    console.log("resizing room canvas to w:"+setw+" h:"+seth);
    
    var data = this.ctx.getImageData(0, 0, w, h);
    this.canvas.width = setw;
    this.canvas.height = seth;
    this.width = setw;
    this.height = seth;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.putImageData(data,0,0);
};

Room.prototype.replayEvent = function(ev) {
    ctx = this.ctx;
    
    //Resize canvas if it's too small
    
    if (!this.sizeMaxed) {
      
        var wmax = 0, hmax = 0;
        
        if (ev.px && ev.py) {
            wmax = Math.max(ev.px, ev.x);
            hmax = Math.max(ev.py, ev.y);
        } else {
            wmax = ev.x;
            hmax = ev.y;
        }
        
        if ((wmax >= this.width) || (hmax >= this.height)) {
            console.log("RESIZE");
            this.resize(wmax, hmax);
        }
    }
    
    
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
    
    socket.on("subscribe", function(data) {
        if(Room.rooms[data]) {
            Room.rooms[data].clientcount++;
        }
        socket.join(data);
        socket.myRoom = Room.rooms[data];
    });
    
    socket.on("unsubscribe", function(data) {
        if(Room.rooms[data]) {
            if (Room.rooms[data].clientcount > 0) {
                Room.rooms[data].clientcount--;
            }
        }
        socket.leave(data);
        delete socket.myRoom;
    });
    
    socket.on("sync", function(data) {
        var room = Room.rooms[data.room];
        var requestWidth = data.width;
        var requestHeight = data.height;
        if (room) {
     
            var imageData = room.canvas.toDataURL();
            
            console.log("syncing room :"+room.name+"data : "+imageData.length);
            
            socket.emit("sync", {status:true, pixels:imageData});
        } else {
            socket.emit("sync", {status:false});
        }
    });
    
    socket.on("event", function(data) {
        var room = Room.rooms[data.room];
        if(room) {
            room.replayEvent(data);
        }
        io.sockets.in(data.room).emit("event", data);
    });
    
    socket.on("create", function(data) {
        var room = new Room(data.width, data.height);
        
        console.log("creating room:"+room.name+" width:"+room.width+" height:"+room.height+" data:"+data.pixels.length);
        
        var img = new Canvas.Image;
        img.src = data.pixels;
        
        room.ctx.drawImage(img,0,0);
        
        socket.emit("create", room.name);
     
    });
    
});

io.sockets.on("disconnect", function (socket) {
    if(socket.myRoom) {
        if (myRoom[data].clientcount > 0) {
            myRoom[data].clientcount--;
        }
        socket.leave(myRoom.name);
        delete socket.myRoom;
    }
});

