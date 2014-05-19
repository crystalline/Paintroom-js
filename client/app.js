//Canvas drawing application

var MaxCanvasWidth = 2000,
    MaxCanvasHeight = 1100,
    socketServer = "http://127.0.0.1:3000";

//Utility functions
function getbyid(id) {
    return document.getElementById(id);
}

function toggleVis(id) {
    var vis = getbyid(id).style;
    if (!vis.visibility) {
        vis.visibility = "hidden";
    }
    if (vis.visibility == "hidden") {
        vis.visibility = "visible";
    } else {
        vis.visibility = "hidden";
    }
}

function findOffset(obj) {
	var curleft = curtop = 0;
    if (obj.offsetParent) {
        do {
		    curleft += obj.offsetLeft;
		    curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
    }
	return [curleft,curtop];
}

//Helper class to manage tool highlighting, should be adaptable to any toolbar-like interface
function altToolbar(css_reset, css_set, ids) {
    this.ids = ids||[];
    this.active = false;
    this.css_reset = css_reset;
    this.css_set = css_set;
}

altToolbar.prototype.reset = function() {
    var toolbar = this;
    this.ids.forEach(function(id) {
        this.active = false;
        getbyid(id).className = toolbar.css_reset;
    });
};

altToolbar.prototype.addListeners = function() {
    var toolbar = this;
    this.ids.forEach(function(id) {
        getbyid(id).onclick = function () {
            if (toolbar.active == this) {
                //toolbar.active = false;
                //this.className = toolbar.css_reset;
            } else {
                if(toolbar.active) {
                  toolbar.active.className = toolbar.css_reset;
                }
                toolbar.active = this;
                toolbar.active.className = toolbar.css_set;  
            }
        };
    });
};

var penToolbar = new altToolbar("button unhighlight", "button-orange unhighlight", ["pen_brush", "pen_eraser", "pen_picker"]);
penToolbar.reset();
penToolbar.active = getbyid("pen_brush");
penToolbar.active.className = penToolbar.css_set; 
penToolbar.addListeners();

//Buttons and menus   
buttonActive = {"pen_b":false, "color_b":false, "action_b":false};
buttonMenus = {"pen_b":"pen_menu", "color_b":"color_menu", "action_b":"action_menu"};

function resetMenu() {
    buttonActive.pen_b = false;
    buttonActive.color_b = false;
    buttonActive.action_b = false;
}

function renderMenu() {
    Object.keys(buttonActive).forEach(
        function(key) {
            if (buttonActive[key]) {
                getbyid(buttonMenus[key]).style.visibility = "visible";
                getbyid(key).className = "button-selected";
            } else {
                getbyid(buttonMenus[key]).style.visibility = "hidden";
                getbyid(key).className = "button";
            }
        });
}

//Add event listeners
Object.keys(buttonActive).forEach(
    function(key) {
        getbyid(key).onclick = function () {
            if (buttonActive[key]) {
                resetMenu();
                renderMenu();
            } else {
                resetMenu();
                buttonActive[key] = true;
                renderMenu();
            }
        };
    }
);

//Global color
var toolColor = 'green';
var toolSize = 4;
var toolType = "brush";
var sizeInput = getbyid("sizeinp");

var prevColor = 'green'

var S = 95, V = 95;
var hue = 0;

sizeInput.value = toolSize;

function setTool(type) {
    if (type == "brush" && toolType != "brush") {
        ctx.globalCompositeOperation = "source-over";
    }
    if (type == "eraser") {
        ctx.globalCompositeOperation = "destination-out";
    }
    toolType = type;
}

function setSize(x) { 
  if (isNaN(x)) {
    toolSize = 4;
    sizeInput.value = toolSize;
    return;
  }
  if (x<1) {
    toolSize = 1;
  } else {
    if (x >= 64) {
        toolSize = 64;
    } else {
        toolSize = x;
    }
  }
  sizeInput.value = toolSize;
}

function incSize() { if (toolSize < 64) toolSize++; sizeInput.value = toolSize;}
function decSize() { if (toolSize > 1) toolSize--; sizeInput.value = toolSize;}

//Canvas utilities
function Rect(x,y,w,h) {
    this.x = x;
	this.y = y;
	this.x_end = x+w;
	this.y_end = y+h;
	this.w = w;
	this.h = h;
}

Rect.prototype.inside = function(x,y) {
	return (x >= this.x) && (x < this.x_end) &&
		   (y >= this.y) && (y < this.y_end);
};

function CanvasEventRouter(canvas, rects) {

    var router = this;
    
    this.canvas = canvas;
    this.rects = rects;

    var offset = findOffset(canvas);
    this.dy = offset[1];
    this.dx = offset[0];
    
    this.mouseDown = false;
    this.canvas.onmousedown = function() { 
        router.mouseDown = true;
        //console.log(router.mouseDown);
    };
    this.canvas.onmouseup = function() {
        router.mouseDown = false;
        //console.log(router.mouseDown);
    }
    
    this.canvas.addEventListener("click",
        function(event) {
            event = event || window.event;
            var x = event.pageX - router.dx,
                y = event.pageY - router.dy;
            router.rects.forEach(function(rect) {
                if(rect.inside(x,y)) {
                    if(rect.click) {
                        rect.click(x-rect.x, y-rect.y);
                    }
                }
            });    
        }, false);
    
    this.canvas.addEventListener("mousemove",
        function(event) {
            event = event || window.event;
            var x = event.pageX - router.dx,
                y = event.pageY - router.dy;
            router.rects.forEach(function(rect) {
                if(rect.inside(x,y)) {
                    if(rect.mmove) {
                        rect.mmove(x-rect.x, y-rect.y, router.mouseDown);
                    }
                }
            });    
        }, false);
}

//Color picker
var pickerCanvas = getbyid("color_picker");
var picker2d = pickerCanvas.getContext("2d");
var p2dh = pickerCanvas.height-52;
var p2dw = pickerCanvas.width-52;
var cx = p2dw/2, cy = p2dh/2;

                                         //   var x = event.pageX - pickerCanvas.offsetLeft - cx,
                                         //       y = (p2dh-(event.pageY - (pickerCanvas.offsetTop+mdy)))-cy;

var canvasRect = new Rect(0, 0, p2dw, p2dh);
canvasRect.click = function(x,y) {
                    var x = x - this.w/2,
                        y = (this.h-y)-this.h/2;
                        hue = ((Math.atan2(-y,-x)/Math.PI)+1)*0.5*360;
                        redrawPicker();
                    };
              
canvasRect.mmove = function(x,y, mouseButton) {
                    var x = x - this.w/2,
                        y = (this.h-y)-this.h/2;
                    if (mouseButton) {
                        hue = ((Math.atan2(-y,-x)/Math.PI)+1)*0.5*360;
                        redrawPicker();
                    }
                   };

//Color pallete
var tableRect = new Rect(p2dw+4, 4, pickerCanvas.width-(p2dw+8), (p2dh-8));
tableRect.click = function(x,y) {
    applyColorPickerTool(picker2d, x+this.x, y+this.y);
};
tableRect.mmove = function(x,y, mouseDown) {
    if (mouseDown) {
        applyColorPickerTool(picker2d, x+this.x, y+this.y);
    }
};

var colorTable = [[0,0,0],[0xFF,0xFF,0xFF]];
var nColors = 16;

for(i=2; i<nColors; i++) {
    colorTable.push([Math.floor(Math.random()*255),Math.floor(Math.random()*255),Math.floor(Math.random()*255)]);
}
var hexTable = [];
for(i=0; i<nColors; i++) {
    var r = colorTable[i][0],
        g = colorTable[i][1],
        b = colorTable[i][2];
    hexTable.push("#"+rgbToHex(r,g,b));
}

//S and V sliders

Rect.prototype.makeSliderHoriz = function(onchange, drawGauge) {
    this.border_low = Math.ceil(0.04*this.w);
    this.border_high = this.w-this.border_low;
    this.value = 0;
    this.onchange = onchange;
    this.drawGauge = drawGauge;
}

Rect.prototype.drawKnob = function() {
    var x = this.value*(this.w-2*this.border_low)+this.border_low;
    //alert(x);
    picker2d.beginPath();
    picker2d.arc(x+this.x, this.y+this.h/2, 8, 0, 2 * Math.PI, false);
    picker2d.fillStyle = "white";
    picker2d.fill();
}

Rect.prototype.redraw = function() {
    picker2d.fillStyle = "#ffbb8b";
    picker2d.fillRect(this.x, this.y, this.w, this.h);   
    this.drawGauge(this);
    this.drawKnob();
}
 
Rect.prototype.updateValue = function(v) {
    if(v<0) {
        v = 0;
    }
    if(v>1) {
        v = 1;
    }

    this.value = v;

    picker2d.fillStyle = "#ffbb8b";
    picker2d.fillRect(this.x, this.y, this.w, this.h);   
    this.drawGauge(this);
    this.drawKnob();
}

Rect.prototype.click = function(x, y) {
    //console.log([x,y]);
    //console.log(this);
    
    var value = (x-this.border_low)/(this.w-2*this.border_low);
    
    this.updateValue(value);
    this.onchange(value);
};

Rect.prototype.mmove = function(x, y, md) {
    if (md)
        this.click(x,y);
};

var gaugeDiv = 20;

function drawSatGauge(rect) {
    var y = rect.h/2-4+rect.y;
    var h = 8;
    var w = rect.w/gaugeDiv;
   
    for(i=0; i<gaugeDiv; i++) {
        var color = hsvToRgb(hue,i*100/gaugeDiv,V);
        picker2d.fillStyle = "rgb("+color[0]+","+color[1]+","+color[2]+")";
        picker2d.fillRect(Math.ceil(i*rect.w/gaugeDiv+rect.x), y, Math.ceil(w), h);
    }
}

function drawValGauge(rect) {
    var y = rect.h/2-4+rect.y;
    var h = 8;
    var w = rect.w/gaugeDiv;
   
    for(i=0; i<gaugeDiv; i++) {
        var color = hsvToRgb(hue,S,i*100/gaugeDiv);
        picker2d.fillStyle = "rgb("+color[0]+","+color[1]+","+color[2]+")";
        picker2d.fillRect(Math.ceil(i*rect.w/gaugeDiv+rect.x), y, Math.ceil(w), h);
    }
}

var satRect = new Rect(8, p2dh+4, pickerCanvas.width-16, 18);
var valRect = new Rect(8, p2dh+4+18+4, pickerCanvas.width-16, 18);

function redrawSliders() {
    satRect.redraw();
    valRect.redraw();
}

satRect.makeSliderHoriz(
    function(s) {
        S = Math.floor(s*100);
        valRect.redraw();
        updateColorSV();
    },
    drawSatGauge);

valRect.makeSliderHoriz(
    function(s) {
        V = Math.floor(s*100);
        satRect.redraw();
        updateColorSV();
    },
    drawValGauge);

var router = new CanvasEventRouter(pickerCanvas, [canvasRect, tableRect, satRect, valRect]);

//Color table
function drawColorTable(x, y, rows, cols, row_size, col_size) {
    for(i=0; i<rows; i++) {
        for(j=0; j<cols; j++) {
            var color = colorTable[i*cols+j];
            var hex = hexTable[i*cols+j];
            picker2d.fillStyle = hex;
            picker2d.fillRect(x+col_size*j, y+row_size*i, col_size, row_size);
        }
    }
}

drawColorTable(tableRect.x, tableRect.y, 8, 2, tableRect.h/8, tableRect.w/2);

picker2d.fillStyle = "rgba(255,255,255,0)";
picker2d.fillRect(0, 0, p2dw, p2dh);

var r1 = p2dw*0.6/2, r2 = p2dw*0.9/2;
var N = 256;
var pickerMouseButton = 0;

satRect.updateValue(0.5);
valRect.updateValue(0.5);

for(i=0; i<N; i+=1) {
    var phi = Math.PI*2*i/N,
        x1 = Math.cos(phi)*r1+cx,
        y1 = Math.sin(-phi)*r1+cy,
        x2 = Math.cos(phi)*r2+cx,
        y2 = Math.sin(-phi)*r2+cy;
    
    var color = hsvToRgb(i*360/N,S,V);
    
    picker2d.beginPath();
    picker2d.moveTo(x1,y1);
    picker2d.lineTo(x2, y2);
    picker2d.lineWidth = 3;
    picker2d.strokeStyle = "rgb("+color[0]+","+color[1]+","+color[2]+")";
    picker2d.stroke();
}

var wheelPixels = picker2d.getImageData(0, 0, p2dw, p2dh);

function drawHueSel(hue) {
    var phi = hue*2*Math.PI/360;
    var phi1 = phi+0.06,
        phi2 = phi-0.06;
    var x1 = Math.cos(phi1)*(r1-5)+cx,
        x2 = Math.cos(phi2)*(r1-5)+cx,
        y1 = Math.sin(-phi1)*(r1-5)+cy,
        y2 = Math.sin(-phi2)*(r1-5)+cy,
        x11 = Math.cos(phi1)*(r2+3)+cx,
        x21 = Math.cos(phi2)*(r2+3)+cx,
        y11 = Math.sin(-phi1)*(r2+3)+cy,
        y21 = Math.sin(-phi2)*(r2+3)+cy;
        
        picker2d.beginPath();
        picker2d.moveTo(x1, y1);
        picker2d.lineTo(x2, y2);
        picker2d.lineTo(x21, y21);
        picker2d.lineTo(x11, y11);
        picker2d.lineTo(x1, y1);
        picker2d.lineWidth = 2;
        picker2d.fillStyle = "rgba(230,230,230,100)";
        picker2d.fill();
}

function updateColorSV() {
    var color = hsvToRgb(hue,S,V);
    toolColor = "rgb("+color[0]+","+color[1]+","+color[2]+")";
    picker2d.fillStyle = toolColor;
    
    //draw central color circle
    picker2d.beginPath();
    picker2d.arc(cx, cy, p2dw*0.5*0.4, 0, 2 * Math.PI, false);
    picker2d.fillStyle = toolColor;
    picker2d.fill();
}

function redrawPicker() {
    picker2d.putImageData(wheelPixels,0,0);
    var color = hsvToRgb(hue,S,V);
    toolColor = "rgb("+color[0]+","+color[1]+","+color[2]+")";
    picker2d.fillStyle = toolColor;
    //picker2d.fillRect(cx-0.2*p2dw, cy-0.2*p2dh, 0.4*p2dw, 0.4*p2dh);
    //draw central color circle
    picker2d.beginPath();
    picker2d.arc(cx, cy, p2dw*0.5*0.4, 0, 2 * Math.PI, false);
    picker2d.fillStyle = toolColor;
    picker2d.fill();
    
    drawHueSel(hue);
    
    redrawSliders();
}

redrawPicker();

//Main canvas and drawing

//Chrome fix to disable cursor change on dragging
document.onselectstart = function(){ return false; };

var px=false,py=false;
var tools = getbyid("tools");
var mouseDown = 0;

var canvas = document.createElement("canvas");
canvas.id = "screen";
canvas.width = Math.min(MaxCanvasWidth, window.innerWidth);
canvas.style.position = "absolute";
canvas.style.top = tools.offsetHeight.toString()+"px";
canvas.style.left = "0px";
canvas.height = Math.min(MaxCanvasHeight, window.innerHeight - tools.offsetHeight);
document.body.appendChild(canvas);

var ctx = canvas.getContext("2d");
ctx.globalCompositeOperation = 'source-over';

//Network connection
var myRoom = window.location.hash.slice(1);
var socket;

function initSocketCallbacks() {
    socket.on("check", function(data) {
        if (data) {
            myRoom = data;
            socket.emit("subscribe", myRoom);
            syncCanvas(myRoom);
        } else {
            myRoom = ""
            window.location.hash = ""
            alert("Cannot join room, looks like th room link has expired");
        }
    });
    
    socket.on("sync", function(data) {
        if (data.status) {
            console.log("sync");
            
            var img = new Image;
            img.src = data.pixels;
            img.onload = function() {
                ctx.drawImage(img,0,0);
            }
        }
    });
    
    socket.on("create", function(name) {
        window.location.hash = name;
        myRoom = name;
        socket.emit("subscribe", myRoom);
        prompt("You have created a drawing room.\nUse this link to invite other people to collaborate with you!\n", window.location.href);
    });
    
    socket.on("event", replayEvent);
}

if (myRoom) {
    socket = io.connect(socketServer);
    
    initSocketCallbacks();
    
    //Check if room exists
    socket.on('connect', function () {
        socket.emit("check", myRoom);
    });
}
             
function sendEvent(desc) {
    if (myRoom) {
        desc.room = myRoom;
        socket.emit("event", desc);
    }
}

//If our link indicates that we should be in a room, then connect to it and sync data
function syncCanvas(room) {
    if (room)
        socket.emit("sync", {room:room, width:canvas.width, height:canvas.height});
}

function createRoom() {
    if (!socket) {
        socket = io.connect(socketServer);
        initSocketCallbacks();
        //socket.emit("create", {pixels:ctx.getImageData(0, 0, canvas.width, canvas.height), width:canvas.width, height:canvas.height});
        socket.emit("create", {pixels:canvas.toDataURL(), width:canvas.width, height:canvas.height});
    }
}

//Paint received drawing events to our canvas
function replayEvent(ev) {   
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

//Client-side painting utilities and event handlers

function saveScreen() {
    window.location.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
}

function clearScreen() {
    if (confirm('Caution: you are going to erase entire painting canvas.\n                                Are you sure?')) { 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function applyColorPickerTool(ctx,x,y) {
    var p = ctx.getImageData(x, y, 1, 1).data;
    var hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
    var hsv = rgb2hsv(p[0],p[1],p[2]);
    //Handle picking on empty pixels
    if (p[3] != 0) {
        hue = hsv.h;
        S = hsv.s;
        V = hsv.v;
        
        toolColor = hex;

        if (getbyid("color_menu").style.visibility == "visible") {
            redrawPicker();
        }
    }
    //console.log(p);
    return hex;
}

function resizeCanvas() {
    console.log("Resizing painting canvas");
	var oldWidth = canvas.width;
	var oldHeight = canvas.height;
	var newWidth = window.innerWidth;
	var newHeight = window.innerHeight - tools.offsetHeight;
	
	if((newHeight > oldHeight) || (newWidth > oldWidth)) {
	    var data = ctx.getImageData(0,0, oldWidth, oldHeight);
	    canvas.width = Math.min(MaxCanvasWidth, newWidth);
	    canvas.height = Math.min(MaxCanvasHeight, newHeight);
	    ctx = canvas.getContext("2d");
	    ctx.putImageData(data,0,0);
	}
}

function drawCanvasLine(x, y) {
    if (mouseDown) {
        if (px && py) {
            if (toolType == "brush" || toolType == "eraser") {
                ctx.beginPath();
                ctx.moveTo(px,py);
                ctx.lineTo(x, y);
                ctx.lineWidth = toolSize;
                if (toolType == "brush") {
                    ctx.globalCompositeOperation = "source-over";
                    ctx.strokeStyle = toolColor;
                    sendEvent({type:"line", tool:"brush", width:toolSize, col:toolColor, px:px, py:py, x:x, y:y});
                } else {
                    ctx.globalCompositeOperation = "destination-out";
                    ctx.strokeStyle = "rgba(0,0,0,255)";
                    sendEvent({type:"line", tool:"erase", width:toolSize, px:px, py:py, x:x, y:y});
                }
                ctx.lineCap = 'round';
                ctx.stroke();
                //alert(toolColor);
            }
            if (toolType == "picker") {
                applyColorPickerTool(ctx,x,y);
            }
        }
        px = x;
        py = y;
    }
}

function onMove(event) {
    event = event || window.event;
    var x = event.pageX - canvas.offsetLeft,
        y = event.pageY - canvas.offsetTop;
    drawCanvasLine(x, y);
}

function onTouchMove(event) {
    event = event || window.event;
    var x = event.touches[0].pageX - canvas.offsetLeft,
        y = event.touches[0].pageY - canvas.offsetTop;
    event.preventDefault();
    drawCanvasLine(x, y);
}

function onClick(event) {
    event = event || window.event;
    var x = event.pageX - canvas.offsetLeft,
        y = event.pageY - canvas.offsetTop;
    if (toolType == "brush" || toolType == "eraser") {
        ctx.beginPath();
        ctx.arc(x, y, toolSize/2, 0, 2 * Math.PI, false);
        if (toolType == "brush") {
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = toolColor;
            sendEvent({type:"point", tool:"brush", radius:(toolSize/2), col:toolColor, x:x, y:y});
        } else {
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0,255)";
            sendEvent({type:"point", tool:"erase", radius:(toolSize/2), x:x, y:y});
        }
        ctx.fill();
    }
    if (toolType == "picker") {
        applyColorPickerTool(ctx,x,y);
    }
}

window.addEventListener("resize", resizeCanvas, false);
canvas.addEventListener("mousemove", onMove, false);
canvas.addEventListener("click", onClick, false);

canvas.addEventListener("touchstart", function(e) {e.preventDefault(); mouseDown = 1; px = false; py = false;}, false);
canvas.addEventListener("touchmove", onTouchMove, false);
canvas.addEventListener("touchend", function(e) {e.preventDefault();mouseDown = 0; px = false; py = false;}, false);

canvas.onmousedown = function() { 
    mouseDown = 1;
}
canvas.onmouseup = function() {
    mouseDown = 0;
    px=false;
    py=false;
}

