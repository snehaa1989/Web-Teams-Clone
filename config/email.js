const nodemailer = require('nodemailer');
const emailConfig = {
    service: 'gmail',
    auth: {
        user: 'springbootauth35@gmail.com',
        pass: 'fdjgwewvxlpudcgr'
    }
};
const transporter = nodemailer.createTransport(emailConfig);
const verifyEmailConfig = async () => {
    try {
        await transporter.verify();
        console.log('Email server is ready to send messages');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
};
module.exports = {
    transporter,
    verifyEmailConfig,
    emailConfig
};
