let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);
let stream = require('./js/stream');
let path = require('path');
//use our js files
app.use('/js', express.static(path.join(__dirname, 'js')));
//use our css files
app.use('/css', express.static(path.join(__dirname, 'css')));
app.get('/', (req, res)=>{
    //render an ejs file
    res.sendFile(__dirname+'/index.html');
});

//io.of('/stream') returns namespace (on this node /stream), our Main namespace is '/'
// this helps in splitting code logic for multiple connections
io.of('/stream').on('connection', stream);
server.listen(3000);  