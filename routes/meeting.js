const express = require('express');
const router = express.Router();
const MeetingRoom = require('../models/MeetingRoom');
const User = require('../models/User');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
router.post('/create', async (req, res) => {
    try {
        const { title, description, scheduledFor, duration, settings } = req.body;
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }
        const roomId = generateRoomId();
        const meetingRoom = new MeetingRoom({
            roomId,
            title,
            description: description || '',
            host: req.user._id,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
            duration: duration || 60,
            settings: {
                allowScreenShare: true,
                allowRecording: false,
                requirePassword: false,
                maxParticipants: 50,
                enableChat: true,
                enableFileShare: true,
                waitingRoom: false,
                muteOnEntry: false,
                videoOnEntry: true,
                ...settings
            },
            status: scheduledFor ? 'scheduled' : 'active'
        });
        await meetingRoom.save();
        await meetingRoom.populate('host', 'username email');
        res.status(201).json({
            success: true,
            message: 'Meeting room created successfully',
            room: meetingRoom
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while creating room'
        });
    }
});
router.get('/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const meetingRoom = await MeetingRoom.findOne({ roomId })
            .populate('host', 'username email')
            .populate('participants.user', 'username email');
        if (!meetingRoom) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        const isHost = meetingRoom.host._id.toString() === req.user._id.toString();
        const isParticipant = meetingRoom.participants.some(p => 
            p.user._id.toString() === req.user._id.toString()
        );
        if (!isHost && !isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        res.status(200).json({
            success: true,
            room: meetingRoom
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching room'
        });
    }
});
router.post('/:roomId/join', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { password } = req.body;
        const meetingRoom = await MeetingRoom.findOne({ roomId });
        if (!meetingRoom) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        if (meetingRoom.status === 'ended') {
            return res.status(400).json({
                success: false,
                message: 'Room has ended'
            });
        }
        if (meetingRoom.settings.requirePassword && meetingRoom.settings.password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }
        if (meetingRoom.participants.length >= meetingRoom.settings.maxParticipants) {
            return res.status(400).json({
                success: false,
                message: 'Room is full'
            });
        }
        const existingParticipant = meetingRoom.participants.find(p => 
            p.user.toString() === req.user._id.toString()
        );
        if (existingParticipant) {
            if (existingParticipant.status === 'left') {
                existingParticipant.status = 'joined';
                existingParticipant.joinedAt = new Date();
                await meetingRoom.save();
            }
        } else {
            meetingRoom.participants.push({
                user: req.user._id,
                joinedAt: new Date(),
                role: meetingRoom.host._id.toString() === req.user._id.toString() ? 'host' : 'participant',
                permissions: {
                    canShareScreen: true,
                    canRecord: meetingRoom.settings.allowRecording,
                    canMuteOthers: false,
                    canKickParticipants: false
                }
            });
            await meetingRoom.save();
        }
        if (meetingRoom.status === 'scheduled') {
            meetingRoom.status = 'active';
            meetingRoom.startedAt = new Date();
            await meetingRoom.save();
        }
        res.status(200).json({
            success: true,
            message: 'Joined room successfully',
            room: meetingRoom
        });
    } catch (error) {
        console.error('Join room error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while joining room'
        });
    }
});
router.post('/:roomId/leave', async (req, res) => {
    try {
        const { roomId } = req.params;
        const meetingRoom = await MeetingRoom.findOne({ roomId });
        if (!meetingRoom) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        const participant = meetingRoom.participants.find(p => 
            p.user.toString() === req.user._id.toString()
        );
        if (participant) {
            participant.status = 'left';
            await meetingRoom.save();
        }
        res.status(200).json({
            success: true,
            message: 'Left room successfully'
        });
    } catch (error) {
        console.error('Leave room error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while leaving room'
        });
    }
});
router.get('/my/rooms', async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const query = {
            $or: [
                { host: req.user._id },
                { 'participants.user': req.user._id }
            ]
        };
        if (status) {
            query.status = status;
        }
        const rooms = await MeetingRoom.find(query)
            .populate('host', 'username email')
            .populate('participants.user', 'username email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        const total = await MeetingRoom.countDocuments(query);
        res.status(200).json({
            success: true,
            rooms,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get my rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching rooms'
        });
    }
});
router.put('/:roomId/settings', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { settings } = req.body;
        const meetingRoom = await MeetingRoom.findOne({ roomId });
        if (!meetingRoom) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        if (meetingRoom.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only host can update settings'
            });
        }
        meetingRoom.settings = { ...meetingRoom.settings, ...settings };
        await meetingRoom.save();
        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            settings: meetingRoom.settings
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating settings'
        });
    }
});
router.post('/:roomId/kick/:userId', async (req, res) => {
    try {
        const { roomId, userId } = req.params;
        const meetingRoom = await MeetingRoom.findOne({ roomId });
        if (!meetingRoom) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        if (meetingRoom.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only host can kick participants'
            });
        }
        const participant = meetingRoom.participants.find(p => 
            p.user.toString() === userId
        );
        if (participant) {
            participant.status = 'kicked';
            await meetingRoom.save();
        }
        res.status(200).json({
            success: true,
            message: 'Participant kicked successfully'
        });
    } catch (error) {
        console.error('Kick participant error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while kicking participant'
        });
    }
});
router.get('/:roomId/stats', async (req, res) => {
    try {
        const { roomId } = req.params;
        const meetingRoom = await MeetingRoom.findOne({ roomId });
        if (!meetingRoom) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }
        const isHost = meetingRoom.host.toString() === req.user._id.toString();
        const isParticipant = meetingRoom.participants.some(p => 
            p.user.toString() === req.user._id.toString()
        );
        if (!isHost && !isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        const stats = {
            roomId: meetingRoom.roomId,
            title: meetingRoom.title,
            status: meetingRoom.status,
            participantCount: meetingRoom.participants.filter(p => p.status === 'joined').length,
            totalParticipants: meetingRoom.participants.length,
            duration: meetingRoom.duration,
            startedAt: meetingRoom.startedAt,
            recording: meetingRoom.recording,
            createdAt: meetingRoom.createdAt
        };
        res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get room stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching room stats'
        });
    }
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/meeting-media';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg',
        'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip', 'application/x-zip-compressed'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'), false);
    }
};
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 
    },
    fileFilter: fileFilter
});
router.post('/upload-media', protect, upload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        const { roomId } = req.body;
        const userId = req.user._id; 
        if (!roomId) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Room ID is required'
            });
        }
        const meetingRoom = await MeetingRoom.findOne({ roomId });
        if (!meetingRoom) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }
        const isHost = meetingRoom.host.toString() === userId;
        const isParticipant = meetingRoom.participants.some(p => 
            p.user.toString() === userId && p.status === 'joined'
        );
        if (!isHost && !isParticipant) {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }
        const mediaUrl = `/uploads/meeting-media/${req.file.filename}`;
        res.status(200).json({
            success: true,
            mediaUrl: mediaUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('Upload media error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: 'Server error while uploading media'
        });
    }
});
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 3; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
module.exports = router;
