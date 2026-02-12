const { transporter } = require('../config/email');
const emailTemplates = {
    welcome: (username, userEmail) => ({
        subject: '🎉 Welcome to Zenference - Your Video Conferencing Journey Begins!',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Zenference</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 2px;
        }
        .tagline {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        .welcome-illustration {
            width: 120px;
            height: 120px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-title {
            font-size: 28px;
            color: #667eea;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
        }
        .welcome-message {
            font-size: 16px;
            line-height: 1.6;
            color: #666;
            margin-bottom: 30px;
            text-align: center;
        }
        .features {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
        }
        .feature-title {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        .feature-item {
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        .feature-icon {
            font-size: 32px;
            margin-bottom: 10px;
            color: #667eea;
        }
        .feature-name {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .feature-desc {
            font-size: 12px;
            color: #666;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            margin: 20px auto;
            text-align: center;
            transition: transform 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer-text {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .social-links {
            margin-top: 20px;
        }
        .social-link {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: #667eea;
            color: white;
            text-align: center;
            line-height: 40px;
            border-radius: 50%;
            margin: 0 10px;
            text-decoration: none;
            transition: background 0.3s ease;
        }
        .social-link:hover {
            background: #764ba2;
        }
        @media (max-width: 600px) {
            .feature-grid {
                grid-template-columns: 1fr;
            }
            .content {
                padding: 30px 20px;
            }
            .header {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🎥 ZENFERENCE</div>
            <div class="tagline">Connect, Collaborate, Create</div>
            <div class="welcome-illustration">🎉</div>
        </div>
        <div class="content">
            <h1 class="welcome-title">Welcome aboard, ${username}!</h1>
            <p class="welcome-message">
                We're absolutely thrilled to have you join the Zenference community! 
                Your journey towards seamless video conferencing and collaboration starts now.
            </p>
            <div class="features">
                <h2 class="feature-title">✨ What Awaits You</h2>
                <div class="feature-grid">
                    <div class="feature-item">
                        <div class="feature-icon">🎥</div>
                        <div class="feature-name">HD Video Calls</div>
                        <div class="feature-desc">Crystal clear video quality</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">🎙️</div>
                        <div class="feature-name">Clear Audio</div>
                        <div class="feature-desc">Noise-free conversations</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">📱</div>
                        <div class="feature-name">Screen Sharing</div>
                        <div class="feature-desc">Share your screen instantly</div>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">💬</div>
                        <div class="feature-name">Real-time Chat</div>
                        <div class="feature-desc">Stay connected always</div>
                    </div>
                </div>
            </div>
            <div style="text-align: center;">
                <a href="http:
                    🚀 Start Your First Meeting
                </a>
            </div>
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
                Need help? Check out our <a href="#" style="color: #667eea;">Help Center</a> or 
                contact our <a href="#" style="color: #667eea;">support team</a>.
            </p>
        </div>
        <div class="footer">
            <p class="footer-text">
                This email was sent to ${userEmail} because you recently registered for Zenference.
            </p>
            <p class="footer-text">
                © 2024 Zenference. All rights reserved. | 
                <a href="#" style="color: #667eea;">Privacy Policy</a> | 
                <a href="#" style="color: #667eea;">Terms of Service</a>
            </p>
            <div class="social-links">
                <a href="#" class="social-link">📧</a>
                <a href="#" class="social-link">💼</a>
                <a href="#" class="social-link">🐦</a>
            </div>
        </div>
    </div>
</body>
</html>
        `
    }),
    confirmation: (username, confirmationLink) => ({
        subject: '✅ Confirm Your Email Address - Zenference',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email - Zenference</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 2px;
        }
        .confirmation-icon {
            width: 100px;
            height: 100px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }
        .content {
            padding: 40px 30px;
        }
        .title {
            font-size: 28px;
            color: #667eea;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
        }
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #666;
            margin-bottom: 30px;
            text-align: center;
        }
        .confirmation-box {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        }
        .confirmation-button {
            display: inline-block;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 18px;
            margin: 20px auto;
            transition: transform 0.3s ease;
        }
        .confirmation-button:hover {
            transform: translateY(-2px);
        }
        .security-note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .security-title {
            color: #856404;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .security-text {
            color: #856404;
            font-size: 14px;
            line-height: 1.5;
        }
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer-text {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        @media (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            .header {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🎥 ZENFERENCE</div>
            <div class="confirmation-icon">✅</div>
        </div>
        <div class="content">
            <h1 class="title">Hi ${username}, confirm your email!</h1>
            <p class="message">
                Thank you for registering with Zenference! To complete your registration 
                and start using our video conferencing platform, please confirm your email address.
            </p>
            <div class="confirmation-box">
                <h3 style="color: #333; margin-bottom: 15px;">📧 Click Below to Confirm</h3>
                <a href="${confirmationLink}" class="confirmation-button">
                    ✅ Confirm Email Address
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 15px;">
                    This link will expire in 24 hours for security reasons.
                </p>
            </div>
            <div class="security-note">
                <div class="security-title">🔒 Security Notice</div>
                <div class="security-text">
                    If you didn't create an account with Zenference, please ignore this email 
                    or contact our support team immediately. We take security seriously and 
                    want to ensure your account is protected.
                </div>
            </div>
            <p style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
                Having trouble? <a href="#" style="color: #667eea;">Contact Support</a>
            </p>
        </div>
        <div class="footer">
            <p class="footer-text">
                © 2024 Zenference. All rights reserved. | 
                <a href="#" style="color: #667eea;">Privacy Policy</a> | 
                <a href="#" style="color: #667eea;">Terms of Service</a>
            </p>
        </div>
    </div>
</body>
</html>
        `
    })
};
module.exports = emailTemplates;
