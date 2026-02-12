const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MeetingRoom = require('../models/MeetingRoom');
const { protect } = require('../middleware/auth');
router.post('/create', protect, async (req, res) => {
    try {
        const { title, description, settings } = req.body;
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Meeting title is required'
            });
        }
        const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const room = new MeetingRoom({
            roomId: roomId,
            title: title,
            description: description || '',
            host: req.user._id,
            settings: {
                allowScreenShare: settings?.allowScreenShare !== false,
                allowRecording: settings?.allowRecording || false,
                requirePassword: false,
                password: '',
                maxParticipants: 50,
                enableChat: settings?.enableChat !== false,
                enableFileShare: settings?.enableFileShare !== false,
                waitingRoom: settings?.waitingRoom || false,
                muteOnEntry: settings?.muteOnEntry || false,
                videoOnEntry: settings?.videoOnEntry !== false
            },
            status: 'active'
        });
        await room.save();
        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            room: {
                roomId: room.roomId,
                title: room.title,
                description: room.description,
                settings: room.settings,
                status: room.status,
                createdAt: room.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while creating meeting'
        });
    }
});
router.post('/schedule', async (req, res) => {
    try {
        const { topic, duration, date, time, description, host, participants } = req.body;
        if (!topic || !date || !time || !host) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: topic, date, time, host'
            });
        }
        const zen = {
            id: 'zen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            topic,
            duration: parseInt(duration) || 60,
            date,
            time,
            description,
            host: {
                id: host.id || host._id,
                username: host.username,
                email: host.email
            },
            participants: participants || [],
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            meetingLink: `${req.protocol}://${req.get('host')}/meeting.html`
        };
        if (!global.scheduledZens) {
            global.scheduledZens = [];
        }
        global.scheduledZens.push(zen);
        console.log('Zen scheduled:', zen);
        res.status(201).json({
            success: true,
            message: 'Zen scheduled successfully',
            zenId: zen.id,
            zen: zen
        });
    } catch (error) {
        console.error('Schedule zen error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while scheduling zen'
        });
    }
});
router.post('/send-invites', async (req, res) => {
    try {
        const { zenId, zenData, participants } = req.body;
        if (!participants || participants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No participants to invite'
            });
        }
        console.log('Sending invitations for zen:', zenId);
        console.log('Zen details:', zenData);
        console.log('Participants:', participants);
        const invitations = participants.map(participant => {
            const isEmail = participant.includes('@');
            const inviteType = isEmail ? 'email' : 'username';
            return {
                recipient: participant,
                type: inviteType,
                zenId: zenId,
                topic: zenData.topic,
                date: zenData.date,
                time: zenData.time,
                duration: zenData.duration,
                meetingLink: zenData.meetingLink,
                sentAt: new Date().toISOString()
            };
        });
        console.log('Invitations prepared:', invitations);
        const EmailService = require('../services/emailService');
        const emailService = new EmailService();
        const emailResults = [];
        for (const invitation of invitations) {
            if (invitation.type === 'email') {
                const result = await emailService.sendMeetingInvitationEmail(
                    invitation.recipient,
                    invitation.recipient.split('@')[0], 
                    invitation.meetingLink || `http://localhost:3000/meeting.html`,
                    invitation.topic,
                    {
                        date: invitation.date,
                        time: invitation.time,
                        duration: invitation.duration,
                        host: zenData.host.username,
                        zenId: invitation.zenId
                    }
                );
                emailResults.push({
                    recipient: invitation.recipient,
                    result: result
                });
                console.log(`Email sent to ${invitation.recipient}:`, result);
            }
        }
        console.log('All email results:', emailResults);
        res.status(200).json({
            success: true,
            message: 'Invitations sent successfully',
            invitations: invitations,
            emailResults: emailResults
        });
    } catch (error) {
        console.error('Send invites error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending invitations'
        });
    }
});
router.get('/my-scheduled', async (req, res) => {
    try {
        const scheduledZens = global.scheduledZens || [];
        res.status(200).json({
            success: true,
            zens: scheduledZens
        });
    } catch (error) {
        console.error('Get scheduled zens error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching scheduled zens'
        });
    }
});
router.get('/:zenId', async (req, res) => {
    try {
        const { zenId } = req.params;
        const scheduledZens = global.scheduledZens || [];
        const zen = scheduledZens.find(z => z.id === zenId);
        if (!zen) {
            return res.status(404).json({
                success: false,
                message: 'Zen not found'
            });
        }
        res.status(200).json({
            success: true,
            zen: zen
        });
    } catch (error) {
        console.error('Get zen details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching zen details'
        });
    }
});
module.exports = router;
