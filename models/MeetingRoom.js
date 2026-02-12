const mongoose = require('mongoose');
const meetingRoomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        role: {
            type: String,
            enum: ['host', 'participant', 'moderator'],
            default: 'participant'
        },
        permissions: {
            canShareScreen: { type: Boolean, default: true },
            canRecord: { type: Boolean, default: false },
            canMuteOthers: { type: Boolean, default: false },
            canKickParticipants: { type: Boolean, default: false }
        },
        status: {
            type: String,
            enum: ['joined', 'left', 'kicked'],
            default: 'joined'
        }
    }],
    scheduledFor: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, 
        default: 60
    },
    status: {
        type: String,
        enum: ['scheduled', 'active', 'ended', 'cancelled'],
        default: 'scheduled'
    },
    settings: {
        allowScreenShare: { type: Boolean, default: true },
        allowRecording: { type: Boolean, default: false },
        requirePassword: { type: Boolean, default: false },
        password: { type: String, default: '' },
        maxParticipants: { type: Number, default: 50 },
        enableChat: { type: Boolean, default: true },
        enableFileShare: { type: Boolean, default: true },
        waitingRoom: { type: Boolean, default: false },
        muteOnEntry: { type: Boolean, default: false },
        videoOnEntry: { type: Boolean, default: true }
    },
    recording: {
        isRecording: { type: Boolean, default: false },
        startTime: { type: Date, default: null },
        duration: { type: Number, default: 0 }, 
        fileUrl: { type: String, default: '' }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    startedAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    }
});
meetingRoomSchema.index({ host: 1 });
meetingRoomSchema.index({ 'participants.user': 1 });
meetingRoomSchema.index({ status: 1 });
meetingRoomSchema.index({ scheduledFor: 1 });
module.exports = mongoose.model('MeetingRoom', meetingRoomSchema);
