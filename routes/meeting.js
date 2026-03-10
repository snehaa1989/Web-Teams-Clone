const express = require('express');
const router = express.Router();
const MeetingRoom = require('../models/MeetingRoom');
const User = require('../models/User');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
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
