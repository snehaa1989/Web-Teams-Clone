const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    avatar: {
        type: String,
        default: ''
    },
    isEmailConfirmed: {
        type: Boolean,
        default: false
    },
    emailConfirmationToken: {
        type: String,
        default: null
    },
    emailConfirmationExpires: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    meetings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting'
    }]
}, {
    timestamps: true
});
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};
userSchema.methods.getProfile = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.emailConfirmationToken;
    delete userObject.passwordResetToken;
    return userObject;
};
userSchema.methods.generateEmailConfirmationToken = function() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.emailConfirmationToken = token;
    this.emailConfirmationExpires = Date.now() + 24 * 60 * 60 * 1000; 
    return token;
};
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = token;
    this.passwordResetExpires = Date.now() + 60 * 60 * 1000; 
    return token;
};
module.exports = mongoose.model('User', userSchema);
