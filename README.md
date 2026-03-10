# Zenference - Video Conferencing Platform
Zen meetings, simplified.. 🍃

A modern, feature-rich video conferencing application built with Node.js, Socket IO, WebRTC, and MongoDB. Features a clean, professional UI with comprehensive user authentication, email invitations, and real-time communication capabilities.

## 🌟 Features

### 🎥 Core Video Conferencing
- **Multi-participant Video Chat** - Connect with multiple users simultaneously
- **Audio/Video Controls** - Toggle video stream, mute/unmute audio with real-time status updates
- **Real-time Text Chat** - Instant messaging with username, date, and time display
- **Screen Sharing** - Share your screen with other participants
- **Meeting Management** - Create and join meeting rooms with custom topics
- **Picture-in-Picture Mode** - Enhanced viewing experience for local video
- **Zen Mode** - Zen meeting environment for focus
- **Low Light Mode** - Reduced brightness for comfortable viewing in dim environments, enhances video quality in low light conditions with 1080p HD quality
- **Proximity Detection** - Smart proximity sensor alerts users when they're too close to the screen (works on mobile devices).
- **Real-Time Translation** - Auto-translate spoken content in 12+ languages with live subtitles for international meetings
- **Be Right Back Mode** - meeting summarization with automatic summary file download when stepping away from meetings

## Challenge
#### _**WEB-TEAMS-CLONE**_ -
MICROSOFT ENGAGE 2021 CHALLENGE - Build a Microsoft Teams clone
Your solution should be a fully functional prototype with at least one mandatory functionality - a minimum of two participants should be able connect with each other using your product to have a video conversation. 

### 📧 Email & Meeting System
- **Email Invitations** - Send professional meeting invitations via email
- **Meeting Scheduling** - Schedule meetings with date, time, and duration
- **Zen ID System** - Unique meeting IDs and URLs for easy access.
- **Meeting Details** - Complete meeting information in invitations (host, topic, time, duration)
- **Join by Meeting ID** - Direct meeting access through Zen ID entry

### 🔐 Authentication & Security
- **User Registration** - Secure account creation with email verification
- **Email Confirmation** - Required email verification for account activation
- **JWT Authentication** - Token-based login system with session management
- **Password Security** - Bcrypt hashing for secure password storage
- **Password Reset** - Secure password recovery via email
- **User Profiles** - Persistent user data and online status tracking
- **Session Management** - Automatic session timeout and renewal

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn
- Gmail account for email services (or other SMTP provider)

### Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd video-conferencing
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/video-conferencing
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   NODE_ENV=development
   
   # Email Configuration (Gmail)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=Zenference Team <your-email@gmail.com>
   ```

4. **Start application**
   ```bash
   nodemon app.js
   ```

5. **Access application**
   Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
video-conferencing/
├── config/
│   ├── database.js          # MongoDB connection configuration
│   └── email.js            # Email service configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   └── User.js              # User schema and model
├── routes/
│   ├── auth.js              # Authentication routes
│   └── zen.js               # Meeting management routes
├── services/
│   └── emailService.js      # Email sending service
├── templates/
│   └── emailTemplates.js    # Email templates
├── server/
│   └── signaling.js         # WebRTC signaling server
├── css/
│   └── style.css            # Application styling
├── js/
│   ├── auth.js              # Frontend authentication logic
│   ├── events.js            # Event handlers
│   ├── functions.js         # Helper functions
│   ├── stream.js            # WebRTC streaming logic
│   └── webrtc.js            # WebRTC implementation
├── public/
│   ├── index.html           # Login/Registration page
│   ├── dashboard.html       # Meeting dashboard
│   ├── start-zen-new.html  # Create new meeting
│   ├── join-zen.html       # Join meeting by ID
│   ├── meeting.html         # Active meeting room
│   └── confirm-email.html  # Email confirmation page
├── .env                    # Environment variables
├── .gitignore             # Git ignore file
├── app.js                 # Main server file
├── package.json           # Dependencies and scripts
└── README.md              # This file
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **Bcryptjs** - Password hashing
- **Nodemailer** - Email sending service
- **Crypto** - Secure token generation

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with responsive design
- **JavaScript (ES6+)** - Core functionality
- **Bootstrap 4.4.1** - Responsive UI components
- **Font Awesome 5.7.2** - Icon library
- **WebRTC** - Peer-to-peer video/audio
- **Moment.js** - Date/time formatting
- **WebRTC Adapter** - Browser compatibility

## 🌐 Application Flow

### User Registration & Authentication
1. **Register** → User creates account with email
2. **Email Confirmation** → Verification email sent
3. **Confirm Email** → User clicks confirmation link
4. **Login** → User authenticated with JWT tokens
5. **Dashboard** → Access meeting management

### Meeting Creation & Invitation
1. **Create Meeting** → Schedule meeting with details
2. **Generate Zen ID** → Unique meeting identifier created
3. **Add Participants** → Add users or email addresses
4. **Send Invitations** → Professional emails with meeting details
5. **Meeting Ready** → Participants can join via link or Zen ID

### Joining Meetings
1. **Direct Link** → Click invitation email link
2. **Zen ID Entry** → Enter meeting ID manually
3. **Authentication** → Verify user session
4. **Join Meeting** → Enter video conference room
5. **Real-time Communication** → Video, audio, and chat

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/confirm-email/:token` - Confirm email address
- `POST /api/auth/resend-confirmation` - Resend confirmation email

### Meeting Management
- `POST /api/zen/create` - Create new meeting
- `POST /api/zen/schedule` - Schedule meeting
- `POST /api/zen/send-invites` - Send meeting invitations
- `GET /api/zen/my-scheduled` - Get user's scheduled meetings
- `GET /api/zen/meeting/:zenId` - Get meeting details
- `POST /api/meeting/upload-media` - Upload meeting media

## 📧 Email Features


### Email Configuration
- **Gmail SMTP** - Default email provider
- **Secure Tokens** - Time-limited confirmation links
- **Meeting Details** - Complete information in invitations

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- Email verification required
- Secure token generation with expiration
- CORS protection
- Input validation and sanitization
- Secure session management
- Password reset functionality

## 📱 Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 🎯 Key Features

### Real-time Communication
- Live video and audio streaming between participants
- Instant text messaging with timestamps
- Screen sharing capabilities
- Meeting recording and management

### Email Integration
- **Automated Meeting Invitations** - Send meeting invitations via email
- **Meeting Details** - Complete information in invitations (host, topic, time, duration)
- **Multiple Invitation Methods** - Direct links and meeting ID access

### Meeting Management
- Unique meeting IDs for easy access
- Scheduled meetings with date/time
- Participant management

### User Experience Features
- **Multiple Display Modes** - Dark mode, zen mode, and low light options
- **Zen Mode** - Minimalist interface for distraction-free meetings
- **Low Light Mode** - Optimized brightness for dark environments with 1080p HD video enhancement
- **Proximity Detection** - Intelligent proximity monitoring with visual and audio alerts for better posture and eye comfort
- **Real-Time Translation** - Live speech translation with dual-language display for international collaboration
- **Be Right Back Mode** - Gen-Z style meeting summarization with cool animated bubbles, automatic text file download, and smart meeting capture when stepping away
- **Adaptive Interface** - Automatic adjustments based on ambient conditions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 Resources & References

- [Socket.IO Documentation](https://socket.io/docs/v4)
- [WebRTC Getting Started](https://webrtc.org/getting-started)
- [Nodemailer Guide](https://nodemailer.com/about/)
- [Bootstrap Grid System](https://www.w3schools.com/bootstrap/bootstrap_grid_examples.asp)
- [Moment.js Documentation](https://momentjs.com/)
- [MongoDB Node.js Driver](https://docs.mongodb.com/drivers/node)

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env` file
   - Verify network connectivity

2. **Email Service Issues**
   - Verify Gmail app password (not regular password)
   - Check email configuration in `.env`
   - Ensure SMTP settings are correct

3. **Authentication Issues**
   - Clear browser localStorage
   - Check JWT secret in `.env`
   - Verify email confirmation status

4. **Video/Audio Not Working**
   - Check browser permissions
   - Ensure HTTPS in production
   - Verify WebRTC compatibility
   - Check firewall settings

5. **Meeting Invitation Not Sending**
   - Verify email service configuration
   - Ensure meeting data is complete

### Support

For issues and questions, please open an issue in the repository or contact the development team.

---
**Built with ❤️ for seamless video communication**
