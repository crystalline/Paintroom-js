## Collaborative paintboard in separate rooms
Draw something and invite others to your drawing room!

###Features:
* Brush, eraser, color picker, HSV color wheel and sliders
* Fast framework-free clientside UI, should work on any HTML5 enabled browser
* Touch friendly
* Node.js server

###Requirements:
* client: socket.io client library
* server: socket.io server library, node-canvas (on newer node version numbers there are possible problems with installing from sourc, but building from github repo works correctly)

###How to deploy:
1. Serve draw.html, and other static client files on your domain with any webserver youlike
2. Start `node server.js` to run node.js socket.io server on port 3000
