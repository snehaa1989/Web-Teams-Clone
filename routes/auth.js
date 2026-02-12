const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const EmailService = require('../services/emailService');
const router = express.Router();
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });
};
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });
        const emailService = new EmailService();
        const confirmationToken = user.generateEmailConfirmationToken();
        await user.save();
        const confirmationLink = `http://localhost:3000/confirm-email/${confirmationToken}`;
        const emailResult = await emailService.sendConfirmationEmail(email, username, confirmationLink);
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email to confirm your account.',
            requiresEmailConfirmation: true
        });
    } catch (error) {
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            res.status(500).json({
                success: false,
                message: 'Registration failed: Database connection error. User not saved.'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Registration failed: ' + error.message
            });
        }
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        if (!user.isEmailConfirmed) {
            return res.status(401).json({
                success: false,
                message: 'Please confirm your email before logging in. Check your inbox for the confirmation email.',
                requiresEmailConfirmation: true
            });
        }
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();
        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: user.getProfile()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});
router.get('/test-confirm/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        user.isEmailConfirmed = true;
        user.emailConfirmationToken = null;
        user.emailConfirmationExpires = null;
        await user.save();
        res.json({
            success: true,
            message: 'Email confirmed manually',
            user: {
                email: user.email,
                isEmailConfirmed: user.isEmailConfirmed
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/debug-users', async (req, res) => {
    try {
        const users = await User.find({});
        const userStates = users.map(user => ({
            email: user.email,
            isEmailConfirmed: user.isEmailConfirmed,
            hasToken: !!user.emailConfirmationToken,
            tokenLength: user.emailConfirmationToken ? user.emailConfirmationToken.length : 0,
            tokenExpires: user.emailConfirmationExpires,
            tokenExpiresDate: user.emailConfirmationExpires ? new Date(user.emailConfirmationExpires) : null
        }));
        res.json({
            success: true,
            users: userStates
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
router.get('/confirm-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const userByToken = await User.findOne({ emailConfirmationToken: token });
        const currentTime = Date.now();
        const user = await User.findOne({
            emailConfirmationToken: token,
            emailConfirmationExpires: { $gt: currentTime }
        });
        if (userByToken && !user) {
            return res.status(400).json({
                success: false,
                message: 'Confirmation token has expired. Please request a new confirmation email.'
            });
        }
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired confirmation token'
            });
        }
        user.isEmailConfirmed = true;
        user.emailConfirmationToken = null;
        user.emailConfirmationExpires = null;
        await user.save();
        const emailService = new EmailService();
        const welcomeResult = await emailService.sendWelcomeEmail(user.email, user.username);
        res.status(200).json({
            success: true,
            message: 'Email confirmed successfully! Welcome to Zenference!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error during email confirmation'
        });
    }
});
router.post('/resend-confirmation', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.isEmailConfirmed) {
            return res.status(400).json({
                success: false,
                message: 'Email is already confirmed'
            });
        }
        const confirmationToken = user.generateEmailConfirmationToken();
        await user.save();
        const emailService = new EmailService();
        
        const emailResult = await emailService.sendConfirmationEmail(email, user.username, confirmationLink);
        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send confirmation email'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Confirmation email sent successfully. Please check your inbox.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while resending confirmation email'
        });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await User.findByIdAndUpdate(userId, {
                isOnline: false,
                lastSeen: new Date()
            });
        }
        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
});
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            user: user.getProfile()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});
module.exports = router;
