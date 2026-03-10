require('dotenv').config();

let express = require('express');

let app = express();

let server = require('http').Server(app);

let path = require('path');

let cookieParser = require('cookie-parser');

const SignalingManager = require('./server/signaling');

const signalingManager = new SignalingManager(server);

const connectDB = require('./config/database');

connectDB();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

const authRoutes = require('./routes/auth');
const { protect } = require('./middleware/auth');
const zenRoutes = require('./routes/zen');
const meetingRoutes = require('./routes/meeting');

app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/zen', zenRoutes);
app.use('/api/meeting', meetingRoutes);

app.get('/', (req, res)=> {
    res.sendFile(__dirname+'/views/index.html');
});

app.get('/dashboard.html', (req, res)=> {
    res.sendFile(__dirname+'/views/dashboard.html');
});

app.get('/start-zen.html', (req, res)=> {
    res.sendFile(__dirname+'/views/start-zen.html');
});

app.get('/join-zen.html', (req, res)=> {
    res.sendFile(__dirname+'/views/join-zen.html');
});

app.get('/meeting.html', (req, res)=> {
    res.sendFile(__dirname+'/views/meeting.html');
});

app.get('/start-zen-new.html', (req, res)=> {
    res.sendFile(__dirname+'/views/start-zen-new.html');
});

app.get('/confirm-email.html', (req, res)=> {
    res.sendFile(__dirname+'/public/html/confirm-email.html');
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/js/') || 
        req.path.startsWith('/css/') || 
        req.path.startsWith('/socket.io/') || 
        req.path.startsWith('/api/') || 
        req.path.startsWith('/confirm-email.html')) {
        return res.status(404).send('Not found');
    }
    
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

