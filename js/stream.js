//for communication between server and client
const stream = (socket)=>{
    socket.on('subscribe', (data)=>{
        //join a room, call join to subscribe the socket to a given channel
        socket.join(data.room);
        socket.join(data.socketId);

        //new user joins
        if(socket.adapter.rooms[data.room].length > 1){
            socket.to(data.room).emit('new user', {socketId:data.socketId});
        }

        console.log(socket.rooms);
    });

   //define custom events/messages to be sent through web sockets.
    socket.on('newUserStart', (data)=>{
        socket.to(data.to).emit('newUserStart', {sender:data.sender});
    });

   //creates an offer using the Session Description Protocol (SDP) and sends it to the other peer (callee)
    socket.on('sdp', (data)=>{
        socket.to(data.to).emit('sdp', {description: data.description, sender:data.sender});
    });

  //now sdp's of caller and callee only have metadata, they exchange this through ICE which is recieved by STUN servers
    socket.on('ice candidates', (data)=>{
        socket.to(data.to).emit('ice candidates', {candidate:data.candidate, sender:data.sender});
    });


    socket.on('chat', (data)=>{
        socket.to(data.room).emit('chat', {sender: data.sender, msg: data.msg});
    });
}

module.exports = stream;