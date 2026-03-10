const { transporter } = require('../config/email');
const emailTemplates = require('../templates/emailTemplates');
class EmailService {
    constructor() {
        this.transporter = transporter;
    }
    async sendWelcomeEmail(userEmail, username) {
        try {
            const template = emailTemplates.welcome(username, userEmail);
            const mailOptions = {
                from: '"Zenference Team" <springbootauth35@gmail.com>',
                to: userEmail,
                subject: template.subject,
                html: template.html
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Welcome email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }
    async sendConfirmationEmail(userEmail, username, confirmationLink) {
        try {
            const template = emailTemplates.confirmation(username, confirmationLink);
            const mailOptions = {
                from: '"Zenference Team" <springbootauth35@gmail.com>',
                to: userEmail,
                subject: template.subject,
                html: template.html
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Confirmation email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending confirmation email:', error);
            return { success: false, error: error.message };
        }
    }
    async sendPasswordResetEmail(userEmail, username, resetLink) {
        try {
            const mailOptions = {
                from: '"Zenference Team" <springbootauth35@gmail.com>',
                to: userEmail,
                subject: '🔒 Reset Your Password - Zenference',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #667eea;">Password Reset Request</h2>
                        <p>Hi ${username},</p>
                        <p>You requested to reset your password. Click the link below to reset it:</p>
                        <a href="${resetLink}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    </div>
                `
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return { success: false, error: error.message };
        }
    }
    async sendMeetingInvitationEmail(userEmail, username, meetingLink, meetingTitle, meetingDetails = null) {
        try {
            const mailOptions = {
                from: '"Zenference Team" <springbootauth35@gmail.com>',
                to: userEmail,
                subject: `📹 Meeting Invitation: ${meetingTitle}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px;">
                        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 24px; font-weight: bold;">
                                    📹
                                </div>
                                <h2 style="color: #667eea; margin: 20px 0 10px 0; font-size: 28px;">Meeting Invitation</h2>
                                <p style="color: #666; margin: 0 0 20px 0; font-size: 16px;">You've been invited to join a Zenference meeting!</p>
                            </div>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                                <h3 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">${meetingTitle}</h3>
                                <div style="color: #666; font-size: 14px; line-height: 1.6;">
                                    ${meetingDetails ? `
                                        <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${meetingDetails.date || 'TBD'}</p>
                                        <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${meetingDetails.time || 'TBD'}</p>
                                        <p style="margin: 5px 0;"><strong>⏱️ Duration:</strong> ${meetingDetails.duration || '60'} minutes</p>
                                        <p style="margin: 5px 0;"><strong>👤 Host:</strong> ${meetingDetails.host || username}</p>
                                    ` : ''}
                                    <p style="margin: 5px 0;"><strong>🆔 Meeting ID:</strong> <span style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${meetingDetails?.zenId || (meetingLink ? meetingLink.split('zen=')[1]?.split('&')[0] : 'N/A')}</span></p>
                                </div>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${meetingLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                                    Join Meeting Now
                                </a>
                            </div>
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <p style="margin: 0; color: #856404; font-size: 14px;">
                                    <strong>💡 Tip:</strong> You can also join by entering the Meeting ID on the join page.
                                </p>
                            </div>
                            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                                <p style="color: #999; margin: 0; font-size: 12px;">
                                    This invitation was sent by Zenference. If you didn't expect this invitation, you can safely ignore this email.
                                </p>
                            </div>
                        </div>
                    </div>
                `
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Meeting invitation email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending meeting invitation email:', error);
            return { success: false, error: error.message };
        }
    }
}
module.exports = EmailService;
