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
        console.log('User created:', user);
        const emailService = new EmailService();
        const confirmationToken = user.generateEmailConfirmationToken();
        console.log('=== REGISTRATION EMAIL DEBUG ===');
        console.log('Generated token:', confirmationToken);
        console.log('Token length:', confirmationToken.length);
        console.log('Token expires at:', user.emailConfirmationExpires);
        console.log('Current time:', Date.now());
        console.log('User before save:', {
            id: user._id,
            email: user.email,
            hasToken: !!user.emailConfirmationToken,
            tokenLength: user.emailConfirmationToken ? user.emailConfirmationToken.length : 0
        });
        await user.save();
        console.log('User after save:', {
            id: user._id,
            email: user.email,
            hasToken: !!user.emailConfirmationToken,
            tokenLength: user.emailConfirmationToken ? user.emailConfirmationToken.length : 0,
            isEmailConfirmed: user.isEmailConfirmed
        });
        const confirmationLink = `http:
        console.log('Confirmation link:', confirmationLink);
        const emailResult = await emailService.sendConfirmationEmail(email, username, confirmationLink);
        console.log('Email send result:', emailResult);
        if (!emailResult.success) {
            console.error('Failed to send confirmation email:', emailResult.error);
        }
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email to confirm your account.',
            requiresEmailConfirmation: true
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            console.error('Database connection issue detected. User not saved.');
            res.status(500).json({
                success: false,
                message: 'Registration failed: Database connection error. User not saved.'
            });
        } else {
            console.error('Registration error:', error);
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
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});
router.get('/confirm-email/:token', async (req, res) => {
    try {
        const { token } = req.params;
        console.log('=== EMAIL CONFIRMATION DEBUG ===');
        console.log('Token received:', token);
        console.log('Token length:', token ? token.length : 'null');
        const userByToken = await User.findOne({ emailConfirmationToken: token });
        console.log('User found by token alone:', userByToken ? 'YES' : 'NO');
        if (userByToken) {
            console.log('Token expiration check:', {
                tokenExpires: userByToken.emailConfirmationExpires,
                tokenExpiresDate: new Date(userByToken.emailConfirmationExpires),
                currentTime: Date.now(),
                currentDate: new Date(Date.now()),
                isExpired: Date.now() > userByToken.emailConfirmationExpires,
                timeDifference: userByToken.emailConfirmationExpires - Date.now()
            });
        }
        const currentTime = Date.now();
        console.log('Current time (ms):', currentTime);
        console.log('Current time (date):', new Date(currentTime));
        const user = await User.findOne({
            emailConfirmationToken: token,
            emailConfirmationExpires: { $gt: currentTime }
        });
        console.log('Database query result with expiration check:', user);
        console.log('User found with expiration check:', user ? 'YES' : 'NO');
        if (userByToken && !user) {
            console.log('TOKEN EXPIRED - User found but token has expired');
            return res.status(400).json({
                success: false,
                message: 'Confirmation token has expired. Please request a new confirmation email.'
            });
        }
        if (!user) {
            console.log('Confirmation failed: User not found or token expired');
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired confirmation token'
            });
        }
        console.log('Before confirmation update:', {
            isEmailConfirmed: user.isEmailConfirmed,
            hasToken: !!user.emailConfirmationToken,
            hasExpiration: !!user.emailConfirmationExpires
        });
        user.isEmailConfirmed = true;
        user.emailConfirmationToken = null;
        user.emailConfirmationExpires = null;
        console.log('After confirmation update:', {
            isEmailConfirmed: user.isEmailConfirmed,
            hasToken: !!user.emailConfirmationToken,
            hasExpiration: !!user.emailConfirmationExpires
        });
        await user.save();
        console.log('After save:', {
            isEmailConfirmed: user.isEmailConfirmed,
            hasToken: !!user.emailConfirmationToken,
            hasExpiration: !!user.emailConfirmationExpires
        });
        console.log('Email confirmed successfully for user:', user.email);
        const emailService = new EmailService();
        const welcomeResult = await emailService.sendWelcomeEmail(user.email, user.username);
        console.log('Welcome email sent:', welcomeResult.success);
        res.status(200).json({
            success: true,
            message: 'Email confirmed successfully! Welcome to Zenference!'
        });
    } catch (error) {
        console.error('Email confirmation error:', error);
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
        console.error('Resend confirmation error:', error);
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
        console.error('Logout error:', error);
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
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching profile'
        });
    }
});
module.exports = router;
