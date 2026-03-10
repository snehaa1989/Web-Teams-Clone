const constraints = {
    video: {
        width: 1280,
        height: 720,
        frameRate: 30
    },
    audio: true
}
const stream = (socket)=>{
    navigator.mediaDevices.getUserMedia(constraints).then((stream)=>{
        socket.emit('stream', stream);
    });
    navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream)=>{
        socket.emit('stream', stream);
    });
    socket.on('subscribe', (data)=>{
        socket.join(data.room);
        socket.join(data.socketId);
        if(socket.adapter.rooms[data.room].length > 1){
            socket.to(data.room).emit('new user', {socketId:data.socketId});
        }
        console.log(socket.rooms);
    });
    socket.on('newUserStart', (data)=>{
        socket.to(data.to).emit('newUserStart', {sender:data.sender});
    });
    socket.on('sdp', (data)=>{
        socket.to(data.to).emit('sdp', {description: data.description, sender:data.sender});
    });
    socket.on('ice candidates', (data)=>{
        socket.to(data.to).emit('ice candidates', {candidate:data.candidate, sender:data.sender});
    });
    socket.on('chat', (data)=>{
        socket.to(data.room).emit('chat', {sender: data.sender, msg: data.msg});
    });
}
module.exports = stream;
