## Collaborative paintboard in separate rooms
Draw something and invite others to your drawing room!

###Features:
* Brush, eraser, color picker, HSV color wheel
* fast framework-free clientside UI, should work on any HTML5 enabled browser
* Node.js server

###Requirements:
client: socket.io client library
server: socket.io server library, node-canvas

###How to deploy:
1. Serve draw.html, and other static client files on your domain with any webserver youlike
2. Start `node server.js` to run node.js socket.io server on port 3000