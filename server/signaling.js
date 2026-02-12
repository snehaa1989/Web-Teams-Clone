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
                                const authHeader = socket.handshake?.headers?.authorization;
                const authToken = authHeader ? authHeader.replace('Bearer ', '') : 
                                 socket.handshake?.auth?.token || 
                                 socket.handshake?.query?.token || '';
                const token = authToken;
                if (!token) {
                    return next(new Error('Authentication error'));
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.userId);
                if (!user) {
                    return next(new Error('User not found'));
                }
                socket.user = user;
                socket.userId = user._id.toString();
                next();
            } catch (error) {
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
        this.io.of('/stream').on('connection', (socket) => {
            socket.on('authenticate', async (data) => {
            try {
                const token = data.token;
                if (!token) {
                    socket.emit('authentication_error', { message: 'No token provided' });
                    return;
                }
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.userId);
                if (!user) {
                    socket.emit('authentication_error', { message: 'User not found' });
                    return;
                }
                socket.user = user;
                socket.userId = user._id.toString();
                socket.emit('authenticated', { success: true, user: { username: user.username, _id: user._id } });
            } catch (error) {
                socket.emit('authentication_error', { message: 'Authentication error' });
            }
        });
        socket.on('join-room', async (data) => {
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
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }
    async handleJoinRoom(socket, data) {
        try {
            const { roomId } = data;
            const meetingRoom = await MeetingRoom.findOne({ roomId });
            if (!meetingRoom) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }
            const isHost = true; 
            const isParticipant = true; 
            if (!isHost && !isParticipant) {
                socket.emit('error', { message: 'Access denied' });
                return;
            }
            socket.join(roomId);
            socket.roomId = roomId;
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
                    }
                );
            } catch (dbError) {
            }
            const existingParticipants = Array.from(roomParticipants.keys()).filter(id => id !== socket.userId);
            if (existingParticipants.length > 0) {
                socket.to(roomId).emit('user-joined', {
                    userId: socket.userId,
                    username: socket.user.username,
                    isHost: isHost
                });
            } else {
            }
            const currentParticipants = Array.from(roomParticipants.values()).map(p => ({
                userId: p.user._id.toString(),
                username: p.user.username,
                isHost: p.isHost
            }));
            socket.emit('room-participants', {
                participants: currentParticipants,
                roomSettings: meetingRoom.settings
            });
        } catch (error) {
            socket.emit('error', { message: 'Failed to join room' });
        }
    }
    handleOffer(socket, data) {
        const targetSocket = this.getSocketByUserId(data.target);
        if (targetSocket) {
            targetSocket.emit('offer', {
                from: socket.userId,
                offer: data.offer
            });
        } else {
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
        socket.to(socket.roomId).emit('screen-share-started', {
            userId: socket.userId,
            username: socket.user.username
        });
    }
    handleScreenShareStopped(socket, data) {
        socket.to(socket.roomId).emit('screen-share-stopped', {
            userId: socket.userId
        });
    }
    async handleMuteParticipant(socket, data) {
        try {
            const { targetUserId } = data;
            const participant = this.participants.get(socket.userId);
            if (!participant || !participant.isHost) {
                socket.emit('error', { message: 'Permission denied' });
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
            }
        } catch (error) {
        }
    }
    async handleKickParticipant(socket, data) {
        try {
            const { targetUserId } = data;
            const participant = this.participants.get(socket.userId);
            if (!participant || !participant.isHost) {
                socket.emit('error', { message: 'Permission denied' });
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
            }
        } catch (error) {
        }
    }
    handleChatMessage(socket, data) {
        if (!socket.userId || !socket.roomId || !socket.user) {
            socket.emit('error', { message: 'Authentication required to send messages' });
            return;
        }
        const roomParticipants = this.rooms.get(socket.roomId);
        if (!roomParticipants || !roomParticipants.has(socket.userId)) {
            socket.emit('error', { message: 'You must join the room to send messages' });
            return;
        }
        if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
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
    }
    handleMediaToggle(socket, data) {
        if (!socket.userId || !socket.roomId) {
            socket.emit('error', { message: 'Authentication required to toggle media' });
            return;
        }
        if (!data.type || !data.hasOwnProperty('enabled')) {
            socket.emit('error', { message: 'Invalid media toggle data' });
            return;
        }
        const roomParticipants = this.rooms.get(socket.roomId);
        if (!roomParticipants || !roomParticipants.has(socket.userId)) {
            socket.emit('error', { message: 'You must join the room to toggle media' });
            return;
        }
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
        } catch (error) {
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
            }
            socket.to(socket.roomId).emit('recording-stopped', {
                stoppedBy: socket.userId,
                stoppedByUsername: socket.user.username,
                duration: meetingRoom.recording.duration
            });
        } catch (error) {
        }
    }
    async handleDisconnect(socket) {
        if (socket.roomId) {
            const roomParticipants = this.rooms.get(socket.roomId);
            if (roomParticipants) {
                roomParticipants.delete(socket.userId);
                try {
                    await MeetingRoom.updateOne(
                        { roomId: socket.roomId },
                        { $pull: { participants: { user: new ObjectId(socket.user._id) } } }
                    );
                } catch (dbError) {
                }
                const remainingParticipants = Array.from(roomParticipants.keys());
                if (remainingParticipants.length > 0) {
                    socket.to(socket.roomId).emit('user-left', {
                        userId: socket.userId,
                        username: socket.user.username
                    });
                } else {
                }
                if (roomParticipants.size === 0) {
                    this.rooms.delete(socket.roomId);
                    this.updateRoomStatus(socket.roomId, 'ended');
                }
            }
        } else {
        }
        const wasInGlobalParticipants = this.participants.has(socket.userId);
        this.participants.delete(socket.userId);
    }
    getSocketByUserId(userId) {
        const participant = this.participants.get(userId);
        if (participant) {
            return participant.socket; 
        }
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
