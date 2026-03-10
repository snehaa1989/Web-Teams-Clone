const mongoose = require('mongoose');
const scheduledZenSchema = new mongoose.Schema({
    zenId: {
        type: String,
        required: true,
        unique: true,
        index: true  
    },
    topic: {
        type: String,
        required: true,
        trim: true
    },
    duration: {
        type: Number,
        default: 60,
        min: 15,
        max: 480  
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    host: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        }
    },
    participants: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    status: {
        type: String,
        enum: ['scheduled', 'active', 'ended', 'cancelled'],
        default: 'scheduled',
        index: true  
    },
    meetingLink: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true  
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        index: true
    }
}, {
    timestamps: true
});
scheduledZenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
scheduledZenSchema.index({ 'host.id': 1, status: 1 });
scheduledZenSchema.index({ participants: 1, status: 1 });
const ScheduledZen = mongoose.model('ScheduledZen', scheduledZenSchema);
module.exports = ScheduledZen;
