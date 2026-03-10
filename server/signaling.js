const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const User = require('../models/User');
const MeetingRoom = require('../models/MeetingRoom');
class SignalingManager {
    constructor(server) {
        this.io = socketIo(server, {
            cors: {
                origin: "*",  
                methods: ["GET", "POST"]  
            }
        });
        this.rooms = new Map(); 
        this.participants = new Map(); 
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        this.io.of('/stream').use(async (socket, next) => {
            try {
                console.log('=== SOCKET AUTHENTICATION MIDDLEWARE (/STREAM) ===');
                console.log('Socket handshake auth:', socket.handshake?.auth);
                console.log('Socket handshake query:', socket.handshake?.query);
                console.log('Socket handshake headers:', socket.handshake?.headers);
                console.log('JWT_SECRET available:', process.env.JWT_SECRET ? 'YES' : 'NO');
                const authHeader = socket.handshake?.headers?.authorization;
                const authToken = authHeader ? authHeader.replace('Bearer ', '') : 
                                 socket.handshake?.auth?.token || 
                                 socket.handshake?.query?.token || '';
                console.log('Token extracted from Authorization header:', authHeader ? 'PRESENT' : 'MISSING');
                console.log('Token extracted from auth object:', socket.handshake?.auth?.token ? 'PRESENT' : 'MISSING');
                console.log('Token extracted from query params:', socket.handshake?.query?.token ? 'PRESENT' : 'MISSING');
                console.log('Token length:', authToken ? authToken.length : 0);
                const token = authToken;
                console.log('Final token to use:', token ? 'PRESENT' : 'MISSING');
                if (!token) {
                    console.log('Authentication error: No token provided');
                    return next(new Error('Authentication error'));
                }
                console.log('Attempting to verify token...');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log('Token decoded successfully, user ID:', decoded.userId);
                const user = await User.findById(decoded.userId);
                console.log('User found in database:', user ? 'YES' : 'NO');
                if (!user) {
                    console.log('Authentication error: User not found');
                    return next(new Error('User not found'));
                }
                socket.user = user;
                socket.userId = user._id.toString();
                console.log('Authentication successful, socket userId set to:', socket.userId);
                next();
            } catch (error) {
                console.error('Authentication middleware error:', error.message);
                console.error('Full error:', error);
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
        this.io.of('/stream').on('connection', (socket) => {
            console.log('=== NEW SOCKET CONNECTION ===');
            console.log(`User connected: ${socket.userId}`);
            console.log('Socket ID:', socket.id);
            console.log('Total connected users:', this.participants.size);
            socket.on('authenticate', async (data) => {
            console.log('=== CUSTOM AUTHENTICATION EVENT ===');
            console.log('Authentication data received:', data);
            try {
                const token = data.token;
                if (!token) {
                    console.log('No token provided in custom auth event');
                    socket.emit('authentication_error', { message: 'No token provided' });
                    return;
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.userId);
                console.log('Custom auth - Token decoded successfully, user ID:', decoded.userId);
                console.log('Custom auth - User found in database:', user ? 'YES' : 'NO');
                if (!user) {
                    console.log('Custom auth - User not found');
                    socket.emit('authentication_error', { message: 'User not found' });
                    return;
                }
                socket.user = user;
                socket.userId = user._id.toString();
                console.log('Custom auth - Authentication successful, socket userId set to:', socket.userId);
                socket.emit('authenticated', { success: true, user: { username: user.username, _id: user._id } });
            } catch (error) {
                console.error('Custom authentication error:', error);
                socket.emit('authentication_error', { message: 'Authentication error' });
            }
        });
            socket.on('join-room', async (data) => {
                console.log('=== JOIN-ROOM EVENT RECEIVED ===');
                await this.handleJoinRoom(socket, data);
            });
            socket.on('offer', (data) => {
                this.handleOffer(socket, data);
            });
            socket.on('answer', (data) => {
                this.handleAnswer(socket, data);
            });
            socket.on('ice-candidate', (data) => {
                this.handleIceCandidate(socket, data);
            });
            socket.on('screen-share-started', (data) => {
                this.handleScreenShareStarted(socket, data);
            });
            socket.on('screen-share-stopped', (data) => {
                this.handleScreenShareStopped(socket, data);
            });
            socket.on('mute-participant', (data) => {
                this.handleMuteParticipant(socket, data);
            });
            socket.on('kick-participant', (data) => {
                this.handleKickParticipant(socket, data);
            });
            socket.on('chat-message', (data) => {
                this.handleChatMessage(socket, data);
            });
            socket.on('file-share', (data) => {
                this.handleFileShare(socket, data);
            });
            socket.on('media-toggle', (data) => {
                this.handleMediaToggle(socket, data);
            });
            socket.on('start-recording', (data) => {
                this.handleStartRecording(socket, data);
            });
            socket.on('stop-recording', (data) => {
                this.handleStopRecording(socket, data);
            });
            socket.on('connection-quality', (data) => {
                this.handleConnectionQuality(socket, data);
            });
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }
    async handleJoinRoom(socket, data) {
        try {
            console.log('=== HANDLE JOIN ROOM ===');
            console.log('Data received:', data);
            console.log('Socket userId:', socket.userId);
            console.log('Socket user:', socket.user);
            const { roomId } = data;
            const meetingRoom = await MeetingRoom.findOne({ roomId });
            if (!meetingRoom) {
                console.log('Room not found:', roomId);
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            console.log('Meeting room found:', meetingRoom.roomId);
            console.log('Current participants:', meetingRoom.participants);
            const isHost = true; 
            const isParticipant = true; 
            console.log('Is host:', isHost);
            console.log('Is participant:', isParticipant);
            if (!isHost && !isParticipant) {
                console.log('Access denied for user:', socket.userId);
                socket.emit('error', { message: 'Access denied' });
                return;
            }
            socket.join(roomId);
            socket.roomId = roomId;
            console.log('Socket joined room:', roomId);
            if (meetingRoom.status === 'scheduled') {
                meetingRoom.status = 'active';
                meetingRoom.startedAt = new Date();
                await meetingRoom.save();
            }
            if (!this.rooms.has(roomId)) {
                this.rooms.set(roomId, new Map());
            }
            const roomParticipants = this.rooms.get(roomId);
            roomParticipants.set(socket.userId, {
                socketId: socket.id,
                user: socket.user,
                joinedAt: new Date(),
                isHost: isHost
            });
            this.participants.set(socket.userId, {
                socketId: socket.id,
                roomId: roomId,
                user: socket.user,
                isHost: isHost,
                socket: socket 
            });
            try {
                await MeetingRoom.updateOne(
                    { roomId: roomId },
                    { 
                        $addToSet: { 
                            participants: {
                                user: new ObjectId(socket.user._id),
                                username: socket.user.username,
                                joinedAt: new Date(),
                                role: isHost ? 'host' : 'participant',
                                status: 'joined'
                            }
                        }
                    });
                }
                catch (error) {
                    console.error('Error updating database:', error);
                }
            const existingParticipants = Array.from(roomParticipants.keys()).filter(id => id !== socket.userId);
            console.log('Existing participants to notify:', existingParticipants);
            console.log('Room participants before notification:', Array.from(roomParticipants.keys()));
            if (existingParticipants.length > 0) {
                socket.to(roomId).emit('user-joined', {
                    userId: socket.userId,
                    username: socket.user.username,
                    isHost: isHost
                });
                console.log('Emitted user-joined event to existing participants');
            } else {
                console.log('No existing participants to notify (first user in room)');
            }
            console.log('Emitted user-joined event for:', socket.userId);
            const currentParticipants = Array.from(roomParticipants.values()).map(p => ({
                userId: p.user._id.toString(),
                username: p.user.username,
                isHost: p.isHost
            }));
            socket.emit('room-participants', {
                participants: currentParticipants,
                roomSettings: meetingRoom.settings
            });
            console.log('=== ROOM JOIN SUCCESSFUL ===');
            console.log(`User ${socket.user.username} (${socket.userId}) successfully joined room ${roomId}`);
            console.log('Total participants in room after join:', roomParticipants.size);
            console.log('Room participants list:', Array.from(roomParticipants.keys()));
            console.log('=== END ROOM JOIN PROCESS ===');
        } catch (error) {
            console.error('Error handling join room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    }
    handleOffer(socket, data) {
        console.log('=== HANDLE OFFER ===');
        console.log('From user:', socket.userId);
        console.log('Target user:', data.target);
        console.log('All participants:', Array.from(this.participants.keys()));
        const targetSocket = this.getSocketByUserId(data.target);
        if (targetSocket) {
            console.log('Target socket found, emitting offer');
            targetSocket.emit('offer', {
                from: socket.userId,
                offer: data.offer
            });
        } else {
            console.log('Target socket not found for user:', data.target);
        }
    }
    handleAnswer(socket, data) {
        const targetSocket = this.getSocketByUserId(data.target);
        if (targetSocket) {
            targetSocket.emit('answer', {
                from: socket.userId,
                answer: data.answer
            });
        }
    }
    handleIceCandidate(socket, data) {
        const targetSocket = this.getSocketByUserId(data.target);
        if (targetSocket) {
            targetSocket.emit('ice-candidate', {
                from: socket.userId,
                candidate: data.candidate
            });
        }
    }
    handleScreenShareStarted(socket, data) {
        console.log('=== SCREEN SHARE STARTED ===');
        console.log('User:', socket.user?.username, 'with audio:', data.withAudio);
        
        socket.to(socket.roomId).emit('screen-share-started', {
            userId: socket.userId,
            username: socket.user.username,
            withAudio: data.withAudio || false
        });
    }
    handleScreenShareStopped(socket, data) {
        console.log('=== SCREEN SHARE STOPPED ===');
        console.log('User:', socket.user?.username);
        
        socket.to(socket.roomId).emit('screen-share-stopped', {
            userId: socket.userId,
            username: socket.user.username
        });
    }
    async handleMuteParticipant(socket, data) {
        try {
            const { targetUserId } = data;
            const participant = this.participants.get(socket.userId);
            if (!participant || !participant.isHost) {
                socket.emit('error', { message: 'Permission denied. Only hosts can mute participants.' });
                return;
            }
            const targetSocket = this.getSocketByUserId(targetUserId);
            if (targetSocket) {
                targetSocket.emit('mute-request', {
                    from: socket.userId,
                    fromUsername: socket.user.username
                });
                socket.to(socket.roomId).emit('participant-muted', {
                    mutedUserId: targetUserId,
                    mutedBy: socket.userId,
                    mutedByUsername: socket.user.username
                });
                console.log(`Host ${socket.user.username} muted user ${targetUserId}`);
            } else {
                console.log('Target user not found for mute:', targetUserId);
            }
        } catch (error) {
            console.error('Error handling mute participant:', error);
            socket.emit('error', { message: 'Failed to mute participant' });
        }
    }
    async handleKickParticipant(socket, data) {
        try {
            const { targetUserId } = data;
            const participant = this.participants.get(socket.userId);
            if (!participant || !participant.isHost) {
                socket.emit('error', { message: 'Permission denied. Only hosts can kick participants.' });
                return;
            }
            const targetSocket = this.getSocketByUserId(targetUserId);
            if (targetSocket) {
                targetSocket.leave(socket.roomId);
                targetSocket.emit('kicked-from-room', {
                    kickedBy: socket.userId,
                    kickedByUsername: socket.user.username
                });
                this.removeParticipant(targetUserId);
                socket.to(socket.roomId).emit('participant-kicked', {
                    kickedUserId: targetUserId,
                    kickedBy: socket.userId,
                    kickedByUsername: socket.user.username
                });
                console.log(`Host ${socket.user.username} kicked user ${targetUserId}`);
            } else {
                console.log('Target user not found for kick:', targetUserId);
            }
        } catch (error) {
            console.error('Error handling kick participant:', error);
            socket.emit('error', { message: 'Failed to kick participant' });
        }
    }
    handleChatMessage(socket, data) {
        if (!socket.userId || !socket.roomId || !socket.user) {
            console.error('Unauthorized chat message attempt - missing auth data');
            socket.emit('error', { message: 'Authentication required to send messages' });
            return;
        }
        const roomParticipants = this.rooms.get(socket.roomId);
        if (!roomParticipants || !roomParticipants.has(socket.userId)) {
            console.error('Unauthorized chat message attempt - user not in room');
            socket.emit('error', { message: 'You must join the room to send messages' });
            return;
        }
        if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
            console.error('Invalid chat message content');
            socket.emit('error', { message: 'Message content is required' });
            return;
        }
        const cleanMessage = data.message.trim().substring(0, 500); 
        const message = {
            id: Date.now().toString(),                    
            userId: socket.userId,                        
            username: socket.user.username || 'User ' + socket.userId,  
            message: cleanMessage,                         
            timestamp: new Date(),                        
            type: data.type || 'text',                     
            mediaUrl: data.mediaUrl || null,              
            mediaType: data.mediaType || null,             
            fileName: data.fileName || null,               
            fileSize: data.fileSize || null                
        };
        console.log(`Chat message from ${socket.user.username} (${socket.userId}): ${cleanMessage}`);
        this.io.to(socket.roomId).emit('chat-message', message);
    }
    handleFileShare(socket, data) {
        const fileData = {
            id: Date.now().toString(),              
            userId: socket.userId,                  
            username: socket.user.username,         
            fileName: data.fileName,                
            fileSize: data.fileSize,                
            fileType: data.fileType,                
            fileUrl: data.fileUrl,                  
            timestamp: new Date()                   
        };
        socket.to(socket.roomId).emit('file-shared', fileData);
        socket.emit('file-shared', fileData);
        console.log(`File shared by ${socket.user.username}: ${data.fileName} (${data.fileSize} bytes)`);
    }
    handleMediaToggle(socket, data) {
        if (!socket.userId || !socket.roomId) {
            console.error('Unauthorized media toggle attempt - missing auth data');
            socket.emit('error', { message: 'Authentication required to toggle media' });
            return;
        }
        if (!data.type || !data.hasOwnProperty('enabled')) {
            console.error('Invalid media toggle data:', data);
            socket.emit('error', { message: 'Invalid media toggle data' });
            return;
        }
        const roomParticipants = this.rooms.get(socket.roomId);
        if (!roomParticipants || !roomParticipants.has(socket.userId)) {
            console.error('Unauthorized media toggle attempt - user not in room');
            socket.emit('error', { message: 'You must join the room to toggle media' });
            return;
        }
        console.log(`Media toggle from ${socket.user.username} (${socket.userId}): ${data.type} = ${data.enabled}`);
        this.io.to(socket.roomId).emit('media-toggle', {
            userId: socket.userId,                    
            type: data.type,                         
            enabled: data.enabled,                    
            username: socket.user.username           
        });
    }
    async handleStartRecording(socket, data) {
        try {
            const meetingRoom = await MeetingRoom.findOne({ roomId: socket.roomId });
            if (!meetingRoom.settings.allowRecording) {
                socket.emit('error', { message: 'Recording not allowed in this room' });
                return;
            }
            meetingRoom.recording.isRecording = true;
            meetingRoom.recording.startTime = new Date();
            await meetingRoom.save();
            socket.to(socket.roomId).emit('recording-started', {
                startedBy: socket.userId,
                startedByUsername: socket.user.username
            });
            console.log(`Recording started by ${socket.user.username} in room ${socket.roomId}`);
        } catch (error) {
            console.error('Error starting recording:', error);
            socket.emit('error', { message: 'Failed to start recording' });
        }
    }
    async handleStopRecording(socket, data) {
        try {
            const meetingRoom = await MeetingRoom.findOne({ roomId: socket.roomId });
            if (meetingRoom.recording.isRecording) {
                meetingRoom.recording.isRecording = false;
                meetingRoom.recording.duration = Math.floor(
                    (new Date() - meetingRoom.recording.startTime) / 1000
                );
                await meetingRoom.save();
                console.log(`Recording stopped. Duration: ${meetingRoom.recording.duration} seconds`);
            }
            socket.to(socket.roomId).emit('recording-stopped', {
                stoppedBy: socket.userId,
                stoppedByUsername: socket.user.username,
                duration: meetingRoom.recording.duration  
            });
        } catch (error) {
            console.error('Error stopping recording:', error);
            socket.emit('error', { message: 'Failed to stop recording' });
        }
    }
    async handleDisconnect(socket) {
        console.log('=== USER DISCONNECTING ===');
        console.log(`User disconnected: ${socket.userId}`);
        console.log('Socket username:', socket.user?.username);
        console.log('Socket room ID:', socket.roomId);
        if (socket.roomId) {
            const roomParticipants = this.rooms.get(socket.roomId);
            if (roomParticipants) {
                console.log('Participants in room before disconnect:', Array.from(roomParticipants.keys()));
                console.log('Room participant count before disconnect:', roomParticipants.size);
                roomParticipants.delete(socket.userId);
                console.log('Removed user from room participants');
                console.log('Participants in room after disconnect:', Array.from(roomParticipants.keys()));
                console.log('Room participant count after disconnect:', roomParticipants.size);
                try {
                    await MeetingRoom.updateOne(
                        { roomId: socket.roomId },
                        { $pull: { participants: { user: new ObjectId(socket.user._id) } } }
                    );
                    console.log('Removed participant from database:', socket.user?.username);
                } catch (dbError) {
                    console.error('Error removing participant from database:', dbError);
                }
                const remainingParticipants = Array.from(roomParticipants.keys());
                if (remainingParticipants.length > 0) {
                    socket.to(socket.roomId).emit('user-left', {
                        userId: socket.userId,
                        username: socket.user.username
                    });
                    console.log('Notified remaining participants about user leaving');
                } else {
                    console.log('No remaining participants to notify (last user left)');
                }
                if (roomParticipants.size === 0) {
                    this.rooms.delete(socket.roomId);
                    this.updateRoomStatus(socket.roomId, 'ended');
                    console.log('Room emptied and marked as ended');
                }
            }
        } else {
            console.log('User was not in any room');
        }
        const wasInGlobalParticipants = this.participants.has(socket.userId);
        this.participants.delete(socket.userId);
        console.log('Removed from global participants:', wasInGlobalParticipants ? 'YES' : 'NO');
        console.log('Total global participants after disconnect:', this.participants.size);
        console.log('=== END USER DISCONNECT PROCESS ===');
    }
    handleConnectionQuality(socket, data) {
        console.log('=== CONNECTION QUALITY UPDATE ===');
        console.log('User ID:', socket.userId);
        console.log('Quality data:', data);
        
        const participant = this.participants.get(socket.userId);
        if (participant && participant.roomId) {
            const roomParticipants = this.rooms.get(participant.roomId);
            if (roomParticipants) {
                roomParticipants.forEach((roomParticipant, userId) => {
                    if (userId !== socket.userId) {
                        const participantSocket = this.getSocketByUserId(userId);
                        if (participantSocket) {
                            participantSocket.emit('participant-connection-quality', {
                                userId: socket.userId,
                                quality: data.quality,
                                timestamp: new Date()
                            });
                        }
                    }
                });
            }
        }
    }
    getSocketByUserId(userId) {
        console.log('=== GET SOCKET BY USER ID ===');
        console.log('Looking for user ID:', userId);
        console.log('Available participants:', Array.from(this.participants.keys()));
        const participant = this.participants.get(userId);
        if (participant) {
            console.log('Participant found:', participant);
            console.log('Socket reference found:', participant.socket ? 'YES' : 'NO');
            return participant.socket; 
        }
        console.log('Participant not found for user ID:', userId);
        return null;
    }
    removeParticipant(userId) {
        const participant = this.participants.get(userId);
        if (participant) {
            const socket = participant.socket; 
            if (socket) {
                socket.leave(participant.roomId);
            }
            const roomParticipants = this.rooms.get(participant.roomId);
            if (roomParticipants) {
                roomParticipants.delete(userId);
            }
            this.participants.delete(userId);
        }
    }
    async updateRoomStatus(roomId, status) {
        try {
            await MeetingRoom.findOneAndUpdate(
                { roomId },
                { 
                    status: status,
                    endedAt: status === 'ended' ? new Date() : undefined
                }
            );
        } catch (error) {
            console.error('Error updating room status:', error);
        }
    }
    getRoomStats(roomId) {
        const roomParticipants = this.rooms.get(roomId);
        if (!roomParticipants) return null;
        return {
            participantCount: roomParticipants.size,
            participants: Array.from(roomParticipants.values()).map(p => ({
                userId: p.user._id,
                username: p.user.username,
                joinedAt: p.joinedAt,
                isHost: p.isHost
            }))
        };
    }
}
module.exports = SignalingManager;
