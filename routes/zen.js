const express = require('express');
const User = require('../models/User');
const MeetingRoom = require('../models/MeetingRoom');
const ScheduledZen = require('../models/ScheduledZen');
const { protect } = require('../middleware/auth');
const router = express.Router();
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
        console.log('Meeting room created:', room);
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
        console.error('Create meeting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating meeting'
        });
    }
});
router.post('/schedule', protect, async (req, res) => {
    try {
        const { topic, duration, date, time, description, participants } = req.body;
        if (!topic || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: topic, date, time'
            });
        }
        const zenId = 'zen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const zen = new ScheduledZen({
            zenId: zenId,
            topic: topic,                                     
            duration: parseInt(duration) || 60,              
            date: date,                                      
            time: time,                                       
            description: description,                         
            host: {                                          
                id: req.user._id,
                username: req.user.username,
                email: req.user.email
            },
            participants: participants || [],               
            status: 'scheduled',                        
            meetingLink: `${req.protocol}:
        });
        await zen.save();
        console.log('Zen scheduled in MongoDB:', zen);
        res.status(201).json({
            success: true,
            message: 'Zen scheduled successfully',
            zenId: zen.zenId,                          
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
router.post('/send-invites', protect, async (req, res) => {
    try {
        const { zenId, participants } = req.body;
        if (!participants || participants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No participants to invite'
            });
        }
        const zen = await ScheduledZen.findOne({ zenId });
        if (!zen) {
            return res.status(404).json({
                success: false,
                message: 'Zen not found'
            });
        }
        console.log('Sending invitations for zen:', zenId);
        console.log('Zen details from MongoDB:', zen);
        console.log('Participants:', participants);
        const invitations = participants.map(participant => {
            const isEmail = participant.includes('@');
            const inviteType = isEmail ? 'email' : 'username';
            return {
                recipient: participant,                         
                type: inviteType,                           
                zenId: zen.zenId,                              
                topic: zen.topic,                        
                date: zen.date,                           
                time: zen.time,                           
                duration: zen.duration,                       
                meetingLink: zen.meetingLink,               
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
                    invitation.meetingLink || `http:
                    invitation.topic,                           
                    {
                        date: invitation.date,               
                        time: invitation.time,               
                        duration: invitation.duration,           
                        host: zen.host.username,        
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
router.get('/my-scheduled', protect, async (req, res) => {
    try {
        const scheduledZens = await ScheduledZen.find({
            $or: [
                { 'host.id': req.user._id },                    
                { participants: req.user.email }                      
            ],
            status: { $ne: 'cancelled' }                       
        })
        .sort({ createdAt: -1 })                    
        .limit(50);                               
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
router.get('/:zenId', protect, async (req, res) => {
    try {
        const { zenId } = req.params;
        const zen = await ScheduledZen.findOne({ zenId });
        if (!zen) {
            return res.status(404).json({
                success: false,
                message: 'Zen not found'
            });
        }
        const isHost = zen.host.id.toString() === req.user._id.toString();
        const isInvited = zen.participants.includes(req.user.email);
        if (!isHost && !isInvited) {
            return res.status(403).json({
                success: false,
                message: 'Access denied - you are not the host or an invited participant'
            });
        }
        res.status(200).json({
            success: true,
            zen: zen                                   
        });
    } catch (error) {
        console.error('Get zen by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching zen'
        });
    }
});
module.exports = router;
