class VideoConferenceManager {
    constructor() {
        this.localStream = null;
        this.screenShareStream = null;
        this.peers = new Map();
        this.socket = null;
        this.roomId = null;
        this.userId = null;
        this.isScreenSharing = false;
        this.screenShareAudioEnabled = true;
        this.originalAudioTrack = null;
        this.screenShareAudioTrack = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordingStartTime = null;
        this.recordingTimer = null;
        this.recordingDuration = 0;
        this.participants = new Map();
        this.audioContext = null;
        this.virtualBackgroundProcessor = null;
        this.hasJoinedRoom = false;
        this.virtualBackgroundEnabled = false;
        this.selectedBackground = 'none';
        this.originalVideoTrack = null;
        this.processedVideoTrack = null;
        this.virtualBackgroundCanvas = null;
        this.virtualBackgroundContext = null;
        this.proximityDetector = null;
        this.isProximityDetectionEnabled = false;
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:turn.relay.metered.ca:80',
                    username: 'test',
                    credential: 'test'
                }
            ],
            mediaConstraints: {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    facingMode: 'user',
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                }
            }
        };
    }
    async initialize(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;
        console.log('=== VIDEO CONFERENCE INITIALIZATION START ===');
        console.log('Room ID:', roomId);
        console.log('User ID:', userId);
        try {
            let token = null;
            let userData = null;
            const sessionData = localStorage.getItem('authSession');
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    token = parsed.token;
                    userData = parsed.user;
                    console.log('=== AUTH SESSION FOUND IN VIDEO CONFERENCE ===');
                    console.log('User data:', userData);
                } catch (e) {
                    console.error('Error parsing authSession:', e);
                }
            }
            if (!token) {
                token = localStorage.getItem('token');
                if (token) {
                    console.log('=== DIRECT TOKEN FOUND IN VIDEO CONFERENCE ===');
                    try {
                        const base64Url = token.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(atob(base).split('').map(function(c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        const parsed = JSON.parse(jsonPayload);
                        userData = {
                            _id: parsed.userId,
                            username: `User ${parsed.userId}`
                        };
                    } catch (e) {
                        console.error('Error parsing token:', e);
                    }
                }
            }
            if (!token) {
                throw new Error('No authentication token found in localStorage');
            }
            this.userId = userData?._id || userId;
            console.log('=== CLIENT SIDE AUTH DEBUG (VIDEO CONFERENCE) ===');
            console.log('Token found:', token ? 'YES' : 'NO');
            console.log('Token length:', token ? token.length : 0);
            console.log('User data:', userData);
            console.log('User ID assigned:', this.userId);
            if (userData && userData.username) {
                const localNameElement = document.getElementById('local-name');
                if (localNameElement) {
                    localNameElement.textContent = `${userData.username} (You)`;
                }
            }
            const socketUrl = window.location.origin;
            console.log('=== SOCKET CONNECTION DEBUG (VIDEO CONFERENCE) ===');
            console.log('Connecting to socket at:', socketUrl);
            console.log('Token available:', token ? 'YES' : 'NO');
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('Creating socket connection...');
            console.log('=== ATTEMPTING /STREAM NAMESPACE CONNECTION (VIDEO CONFERENCE) ===');
            console.log('Token being sent for /stream auth:', token ? 'PRESENT' : 'MISSING');
            this.socket = io(socketUrl + '/stream', {
                auth: {
                    token: token
                },
                query: {
                    token: token
                },
                transports: ['websocket'],
                forceNew: true,
                timeout: 5000,
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000
            });
            console.log('/stream socket object created:', this.socket ? 'YES' : 'NO');
            console.log('Setting up socket event handlers...');
            this.setupSocketEventHandlers();
            console.log('Setting up audio context...');
            this.setupAudioContext();
            console.log('Setting up virtual background...');
            this.initializeVirtualBackground();
            console.log('Setting up screen share audio toggle...');
            this.setupScreenShareAudioToggle();
            console.log('Video conference initialized successfully');
            console.log('=== VIDEO CONFERENCE INITIALIZATION COMPLETE ===');
            return true;
        } catch (error) {
            console.error('=== VIDEO CONFERENCE INITIALIZATION ERROR ===');
            console.error('Error type:', typeof error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Full error object:', error);
            console.error('Failed to initialize video conference:', error);
            throw error;
        }
    }
    setupSocketEventHandlers() {
        this.socket.on('connecting', () => {
            console.log('=== SOCKET CONNECTING ===');
        });
        this.socket.on('connect_failed', (error) => {
            console.error('=== SOCKET CONNECT FAILED ===');
            console.error('Connection failed:', error);
        });
        this.socket.on('disconnect', (reason) => {
            console.log('=== SOCKET DISCONNECTED ===');
            console.log('Reason:', reason);
        });
        this.socket.on('reconnecting', (attemptNumber) => {
            console.log('=== SOCKET RECONNECTING ===');
            console.log('Attempt:', attemptNumber);
        });
        this.socket.on('reconnect_failed', () => {
            console.error('=== SOCKET RECONNECT FAILED ===');
        });
        this.socket.on('connect', () => {
            console.log('=== SOCKET CONNECTED AND AUTHENTICATED ===');
            console.log('Socket ID:', this.socket.id);
            console.log('User ID:', this.userId);
            this.getUserMedia().then(() => {
                this.setupSocketHandlers();
                this.joinRoom();
            }).catch(error => {
                console.error('Failed to get user media:', error);
                this.setupSocketHandlers();
                this.joinRoom();
            });
        });
        this.socket.on('connect_error', (error) => {
            console.error('=== SOCKET CONNECTION ERROR ===');
            console.error('Connection failed:', error.message);
            console.error('Error details:', error);
        });
    }
    async getUserMedia(constraints = null) {
        try {
            const mediaConstraints = constraints || this.config.mediaConstraints;
            console.log('=== GETTING USER MEDIA ===');
            console.log('Media constraints:', JSON.stringify(mediaConstraints, null, 2));
            this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
            console.log('Local stream obtained:', {
                hasVideo: this.localStream.getVideoTracks().length > 0,
                hasAudio: this.localStream.getAudioTracks().length > 0,
                videoTracks: this.localStream.getVideoTracks().length,
                audioTracks: this.localStream.getAudioTracks().length,
                streamActive: this.localStream.active
            });
            this.localStream.getTracks().forEach((track, index) => {
                console.log(`Track ${index}:`, {
                    kind: track.kind,
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                });
            });
            const localVideo = document.getElementById('local');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
                this.initializeProximityDetector(localVideo);
            }
            return this.localStream;
        } catch (error) {
            console.error('Error getting user media:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                constraint: error.constraint
            });
            throw error;
        }
    }
    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('=== CLIENT SOCKET CONNECTED ===');
            console.log('Connected to signaling server');
            console.log('Socket ID:', this.socket.id);
            console.log('User ID:', this.userId);
        });
        this.socket.on('connect_error', (error) => {
            console.error('=== CLIENT SOCKET CONNECTION ERROR ===');
            console.error('Socket connection error:', error);
            alert('Failed to connect to meeting server: ' + error.message);
        });
        this.socket.on('disconnect', (reason) => {
            console.log('=== CLIENT SOCKET DISCONNECTED ===');
            console.log('Disconnected from signaling server:', reason);
            alert('Disconnected from meeting server: ' + reason);
        });
        this.socket.on('user-joined', (data) => {
            this.handleUserJoined(data);
        });
        this.socket.on('user-left', (data) => {
            console.log('=== CLIENT: USER LEFT EVENT ===');
            console.log('User left data:', data);
            console.log('User ID who left:', data.userId);
            console.log('Username who left:', data.username);
            console.log('Current peers before removal:', Array.from(this.peers.keys()));
            this.handleUserLeft(data);
        });
        this.socket.on('offer', async (data) => {
            await this.handleOffer(data);
        });
        this.socket.on('answer', async (data) => {
            await this.handleAnswer(data);
        });
        this.socket.on('ice-candidate', async (data) => {
            await this.handleIceCandidate(data);
        });
        this.socket.on('screen-share-started', (data) => {
            this.handleRemoteScreenShare(data);
        });
        this.socket.on('screen-share-stopped', (data) => {
            this.handleRemoteScreenShareStopped(data);
        });
        this.socket.on('participant-muted', (data) => {
            this.handleParticipantMuted(data);
        });
        this.socket.on('participant-kicked', (data) => {
            this.handleParticipantKicked(data);
        });
        this.socket.on('chat-message', (data) => {
            this.handleChatMessage(data);
        });
        this.socket.on('media-toggle', (data) => {
            this.handleMediaToggle(data);
        });
        this.socket.on('room-participants', (data) => {
            this.handleRoomParticipants(data);
        });
        this.socket.on('participant-connection-quality', (data) => {
            this.handleParticipantConnectionQuality(data);
        });
        this.socket.on('recording-started', (data) => {
            this.handleRecordingStarted(data);
        });
        this.socket.on('recording-stopped', (data) => {
            this.handleRecordingStopped(data);
        });
    }
    joinRoom() {
        console.log('=== CLIENT JOINING ROOM ===');
        console.log('Room ID:', this.roomId);
        console.log('User ID:', this.userId);
        console.log('Socket connected:', this.socket ? 'YES' : 'NO');
        console.log('Socket ID:', this.socket?.id);
        console.log('Already joined:', this.hasJoinedRoom ? 'YES' : 'NO');
        if (!this.socket) {
            console.error('Cannot join room: Socket not connected');
            return;
        }
        if (this.hasJoinedRoom) {
            console.log('Already joined room, skipping duplicate join');
            return;
        }
        const sessionData = localStorage.getItem('authSession');
        const parsed = JSON.parse(sessionData);
        console.log('User info from session:', parsed.user);
        this.socket.emit('join-room', {
            roomId: this.roomId,
            userId: this.userId,
            username: parsed.user?.username || 'Unknown User'
        });
        this.hasJoinedRoom = true;
        console.log('Sent join-room event');
    }
    addParticipantToList(userId, username) {
        const participantsList = document.getElementById('participants-list');
        if (!participantsList) {
            console.error('Participants list not found');
            return;
        }
        if (document.getElementById(`participant-${userId}`)) {
            console.log('Participant already in list:', userId);
            return;
        }
        const participantItem = document.createElement('div');
        participantItem.id = `participant-${userId}`;
        participantItem.className = 'participant-item';
        participantItem.innerHTML = `
            <div class="participant-info">
                <span class="participant-name">${username || 'User ' + userId}</span>
                <div class="connection-status">
                    <span class="status-dot" id="status-${userId}"></span>
                    <span class="status-text" id="status-text-${userId}">Connecting...</span>
                </div>
                <div class="participant-status-icons">
                    <i class="fas video-icon fa-video-slash" style="color: #ff4444; margin-right: 5px;"></i>
                    <i class="fas audio-icon fa-microphone-slash" style="color: #ff4444;"></i>
                </div>
            </div>
            <div class="participant-actions">
                <button class="pin-video-btn" onclick="videoConference.togglePin('${userId}')">
                    <i class="fas fa-thumbtack"></i>
                </button>
            </div>
        `;
        participantsList.appendChild(participantItem);
        console.log('Added participant to list:', username);
        this.updateParticipantConnectionStatus(userId, 'connecting');
    }

updateParticipantConnectionStatus(userId, status) {
        const statusDot = document.getElementById(`status-${userId}`);
        const statusText = document.getElementById(`status-text-${userId}`);
        
        if (!statusDot || !statusText) {
            console.log('Status elements not found for user:', userId);
            return;
        }

        statusDot.className = 'status-dot';
        
        switch(status) {
            case 'excellent':
                statusDot.classList.add('excellent');
                statusText.textContent = 'Excellent';
                break;
            case 'good':
                statusDot.classList.add('good');
                statusText.textContent = 'Good';
                break;
            case 'poor':
                statusDot.classList.add('poor');
                statusText.textContent = 'Poor';
                break;
            case 'disconnected':
                statusDot.classList.add('disconnected');
                statusText.textContent = 'Disconnected';
                break;
            case 'connecting':
                statusDot.classList.add('disconnected');
                statusText.textContent = 'Connecting...';
                break;
            default:
                statusDot.classList.add('good');
                statusText.textContent = 'Good';
        }
    }

    calculateConnectionQuality(peerConnection) {
        try {
            const stats = peerConnection.getStats();
            let totalPacketsLost = 0;
            let totalPacketsReceived = 0;
            let totalRoundTripTime = 0;
            let measurements = 0;

            stats.forEach(report => {
                if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                    totalPacketsLost += report.packetsLost || 0;
                    totalPacketsReceived += report.packetsReceived || 0;
                }
                if (report.type === 'remote-candidate') {
                    totalRoundTripTime += report.roundTripTime || 0;
                    measurements++;
                }
            });

            const packetLossRate = totalPacketsReceived > 0 ? 
                (totalPacketsLost / (totalPacketsReceived + totalPacketsLost)) * 100 : 0;
            
            const avgRoundTripTime = measurements > 0 ? totalRoundTripTime / measurements : 0;

            if (packetLossRate < 1 && avgRoundTripTime < 100) {
                return 'excellent';
            } else if (packetLossRate < 3 && avgRoundTripTime < 200) {
                return 'good';
            } else if (packetLossRate < 10 && avgRoundTripTime < 500) {
                return 'poor';
            } else {
                return 'disconnected';
            }
        } catch (error) {
            console.error('Error calculating connection quality:', error);
            return 'good';
        }
    }

    startConnectionQualityMonitoring(userId, peerConnection) {
        const qualityInterval = setInterval(async () => {
            if (!peerConnection || peerConnection.connectionState === 'closed' || 
                peerConnection.connectionState === 'disconnected' || 
                peerConnection.connectionState === 'failed') {
                clearInterval(qualityInterval);
                this.updateParticipantConnectionStatus(userId, 'disconnected');
                return;
            }

            if (peerConnection.connectionState === 'connected') {
                const quality = this.calculateConnectionQuality(peerConnection);
                this.updateParticipantConnectionStatus(userId, quality);
                
                if (this.socket && this.socket.connected) {
                    this.socket.emit('connection-quality', {
                        userId: userId,
                        quality: quality,
                        timestamp: new Date()
                    });
                }
            }
        }, 5000);

        return qualityInterval;
    }

    handleParticipantConnectionQuality(data) {
        console.log('Received connection quality update:', data);
        this.updateParticipantConnectionStatus(data.userId, data.quality);
    }

    handleRecordingStarted(data) {
        console.log('Recording started:', data);
        this.showRecordingIndicator(true);
        this.startRecordingTimer();
        
        if (data.startedByUsername) {
            this.showRecordingNotification(`Recording started by ${data.startedByUsername}`);
        }
    }

    handleRecordingStopped(data) {
        console.log('Recording stopped:', data);
        this.showRecordingIndicator(false);
        this.stopRecordingTimer();
        
        if (data.stoppedByUsername) {
            this.showRecordingNotification(`Recording stopped by ${data.stoppedByUsername}`);
        }
    }

    showRecordingIndicator(show) {
        const indicator = document.getElementById('recording-indicator');
        if (indicator) {
            indicator.style.display = show ? 'flex' : 'none';
        }
    }

    startRecordingTimer() {
        this.recordingStartTime = Date.now();
        this.recordingDuration = 0;
        
        this.recordingTimer = setInterval(() => {
            this.recordingDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            this.updateRecordingTimerDisplay();
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    updateRecordingTimerDisplay() {
        const timerElement = document.getElementById('recording-timer');
        if (timerElement) {
            const hours = Math.floor(this.recordingDuration / 3600);
            const minutes = Math.floor((this.recordingDuration % 3600) / 60);
            const seconds = this.recordingDuration % 60;
            
            const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerElement.textContent = display;
        }
    }

    showRecordingNotification(message) {
        console.log('Recording notification:', message);
    }

    initializeVirtualBackground() {
        const virtualBgBtn = document.getElementById('virtual-bg-btn');
        const virtualBgModal = document.getElementById('virtual-bg-modal');
        const closeVirtualBg = document.getElementById('close-virtual-bg');
        const applyVirtualBg = document.getElementById('apply-virtual-bg');

        if (virtualBgBtn) {
            virtualBgBtn.addEventListener('click', () => {
                this.showVirtualBackgroundModal();
            });
        }

        if (closeVirtualBg) {
            closeVirtualBg.addEventListener('click', () => {
                this.hideVirtualBackgroundModal();
            });
        }

        if (applyVirtualBg) {
            applyVirtualBg.addEventListener('click', () => {
                this.applyVirtualBackground();
            });
        }

        this.setupBackgroundOptionListeners();
    }

    setupScreenShareAudioToggle() {
        const screenBtn = document.getElementById('screen-btn');
        if (screenBtn) {
            screenBtn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.toggleScreenShareAudio();
            });
        }
    }

    showVirtualBackgroundModal() {
        const modal = document.getElementById('virtual-bg-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideVirtualBackgroundModal() {
        const modal = document.getElementById('virtual-bg-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    setupBackgroundOptionListeners() {
        const bgOptions = document.querySelectorAll('.bg-option');
        bgOptions.forEach(option => {
            option.addEventListener('click', () => {
                bgOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBackground = option.dataset.bg;
            });
        });
    }

    async applyVirtualBackground() {
        console.log('Applying virtual background:', this.selectedBackground);
        
        if (this.selectedBackground === 'none') {
            await this.disableVirtualBackground();
        } else {
            await this.enableVirtualBackground(this.selectedBackground);
        }
        
        this.hideVirtualBackgroundModal();
    }

    async enableVirtualBackground(backgroundType) {
        try {
            if (!this.localStream) {
                console.error('No local stream available');
                return;
            }

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) {
                console.error('No video track available');
                return;
            }

            if (!this.originalVideoTrack) {
                this.originalVideoTrack = videoTrack.clone();
            }

            if (!this.virtualBackgroundCanvas) {
                this.virtualBackgroundCanvas = document.createElement('canvas');
                this.virtualBackgroundCanvas.width = 640;
                this.virtualBackgroundCanvas.height = 480;
                this.virtualBackgroundContext = this.virtualBackgroundCanvas.getContext('2d');
            }

            this.virtualBackgroundEnabled = true;
            this.startVirtualBackgroundProcessing(videoTrack, backgroundType);
            
            console.log('Virtual background enabled:', backgroundType);
        } catch (error) {
            console.error('Error enabling virtual background:', error);
        }
    }

    async disableVirtualBackground() {
        try {
            if (!this.virtualBackgroundEnabled) {
                return;
            }

            this.virtualBackgroundEnabled = false;

            if (this.processedVideoTrack) {
                this.processedVideoTrack.stop();
                this.processedVideoTrack = null;
            }

            if (this.originalVideoTrack && this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                if (videoTrack) {
                    this.localStream.removeTrack(videoTrack);
                    videoTrack.stop();
                }
                
                this.localStream.addTrack(this.originalVideoTrack);
                
                this.peers.forEach((peerConnection, userId) => {
                    const sender = peerConnection.getSenders().find(
                        s => s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        sender.replaceTrack(this.originalVideoTrack);
                    }
                });
            }

            const localVideo = document.getElementById('local');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }

            console.log('Virtual background disabled');
        } catch (error) {
            console.error('Error disabling virtual background:', error);
        }
    }

    startVirtualBackgroundProcessing(videoTrack, backgroundType) {
        const videoElement = document.createElement('video');
        videoElement.srcObject = new MediaStream([videoTrack]);
        videoElement.play();

        const processFrame = () => {
            if (!this.virtualBackgroundEnabled) {
                return;
            }

            this.virtualBackgroundContext.drawImage(videoElement, 0, 0, 640, 480);
            
            if (backgroundType === 'blur') {
                this.applyBlurBackground();
            } else if (backgroundType !== 'none') {
                this.applyCustomBackground(backgroundType);
            }

            requestAnimationFrame(processFrame);
        };

        this.createProcessedVideoStream();
        processFrame();
    }

    applyBlurBackground() {
        const imageData = this.virtualBackgroundContext.getImageData(0, 0, 640, 480);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            
            if (brightness > 100) {
                data[i] = data[i] * 0.9;
                data[i + 1] = data[i + 1] * 0.9;
                data[i + 2] = data[i + 2] * 0.9;
            } else {
                data[i] = data[i] * 0.3;
                data[i + 1] = data[i + 1] * 0.3;
                data[i + 2] = data[i + 2] * 0.3;
            }
        }
        
        this.virtualBackgroundContext.putImageData(imageData, 0, 0);
    }

    applyCustomBackground(backgroundType) {
        const gradients = {
            gradient1: ['#667eea', '#764ba2'],
            gradient2: ['#f093fb', '#f5576c'],
            gradient3: ['#4facfe', '#00f2fe']
        };

        if (gradients[backgroundType]) {
            const gradient = this.virtualBackgroundContext.createLinearGradient(0, 0, 640, 480);
            gradient.addColorStop(0, gradients[backgroundType][0]);
            gradient.addColorStop(1, gradients[backgroundType][1]);
            this.virtualBackgroundContext.fillStyle = gradient;
            this.virtualBackgroundContext.fillRect(0, 0, 640, 480);
        }

        this.virtualBackgroundContext.globalCompositeOperation = 'screen';
        this.virtualBackgroundContext.drawImage(this.virtualBackgroundCanvas, 0, 0, 640, 480);
        this.virtualBackgroundContext.globalCompositeOperation = 'source-over';
    }

    createProcessedVideoStream() {
        const processedStream = this.virtualBackgroundCanvas.captureStream(30);
        this.processedVideoTrack = processedStream.getVideoTracks()[0];
        
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.localStream.removeTrack(videoTrack);
                this.localStream.addTrack(this.processedVideoTrack);
                
                this.peers.forEach((peerConnection, userId) => {
                    const sender = peerConnection.getSenders().find(
                        s => s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        sender.replaceTrack(this.processedVideoTrack);
                    }
                });
            }
        }

        const localVideo = document.getElementById('local');
        if (localVideo) {
            localVideo.srcObject = this.localStream;
        }
    }

pinVideo(userId) {
    const participantVideo = document.querySelector(`[data-user-id="${userId}"] .participant-video`);
    if (!participantVideo) return;
    let pinnedContainer = document.getElementById('pinned-videos');
    if (!pinnedContainer) {
        pinnedContainer = document.createElement('div');
        pinnedContainer.id = 'pinned-videos';
        pinnedContainer.className = 'pinned-videos-container';
        pinnedContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            max-width: 300px;
        `;
        document.body.appendChild(pinnedContainer);
    }
    const clonedVideo = participantVideo.cloneNode(true);
    clonedVideo.className = 'pinned-video';
    clonedVideo.style.cssText = `
        width: 150px;
        height: 100px;
        border-radius: 8px;
        object-fit: cover;
        border: 2px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
        margin-bottom: 5px;
    `;
    pinnedContainer.appendChild(clonedVideo);
    participantVideo.style.display = 'none';
}
unpinVideo(userId) {
    const pinnedContainer = document.getElementById('pinned-videos');
    if (!pinnedContainer) return;
    const pinnedVideo = pinnedContainer.querySelector(`[data-pinned-user-id="${userId}"]`);
    if (pinnedVideo) {
        pinnedVideo.remove();
    }
    const participantVideo = document.querySelector(`[data-user-id="${userId}"] .participant-video`);
    if (participantVideo) {
        participantVideo.style.display = 'block';
    }
    if (pinnedContainer.children.length === 0) {
        pinnedContainer.remove();
    }
}
async handleUserJoined(data) {
    console.log('=== CLIENT: USER JOINED EVENT ===');
    console.log('User joined data:', data);
    console.log('New user ID:', data.userId);
    console.log('New user username:', data.username);
    console.log('Is host:', data.isHost);
    console.log('Current peers count:', this.peers.size);
    console.log('Local stream available:', this.localStream ? 'YES' : 'NO');
    if (data.userId === this.userId) {
        console.log('Ignoring join event for ourselves:', data.userId);
        return;
    }
    if (this.peers.has(data.userId)) {
        console.log('Peer connection already exists for user:', data.userId, '- skipping');
        return;
    }
    this.participants.set(data.userId, data.username);
    this.addParticipantGrid(data.userId, data.username);
    const peerConnection = this.createPeerConnection(data.userId);
    this.peers.set(data.userId, peerConnection);
    console.log('Created peer connection for user:', data.userId);
    if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, this.localStream);
        });
        console.log('Added local tracks to peer connection');
    } else {
        console.error('No local stream available to share with new user');
    }
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        this.socket.emit('offer', {
            target: data.userId,
            offer: offer
        });
        console.log('Created and sent offer to user:', data.userId);
    } catch (error) {
        console.error('Error creating offer:', error);
    }
    this.addParticipantToUI(data.userId, data.username);
    console.log('Added participant to UI:', data.username);
}
    async handleOffer(data) {
        console.log('=== CLIENT: RECEIVED OFFER ===');
        console.log('Offer from:', data.from);
        console.log('Offer data:', data.offer);
        console.log('Current peers:', Array.from(this.peers.keys()));
        if (data.from === this.userId) {
            console.log('Ignoring offer from ourselves:', data.from);
            return;
        }
        let peerConnection = this.peers.get(data.from);
        if (!peerConnection) {
            console.log('Creating new peer connection for offer from:', data.from);
            peerConnection = this.createPeerConnection(data.from);
            this.peers.set(data.from, peerConnection);
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.localStream);
                });
                console.log('Added local tracks to new peer connection');
            }
        } else {
            console.log('Using existing peer connection for offer from:', data.from);
        }
        try {
            const state = peerConnection.signalingState;
            console.log('Peer connection state before setting offer for', data.from, ':', state);
            if (state === 'stable') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                this.socket.emit('answer', {
                    target: data.from,
                    answer: answer
                });
                console.log('Created and sent answer to user:', data.from);
            } else if (state === 'have-remote-offer') {
                console.log('Already have remote offer for', data.from, '- handling collision');
            } else {
                console.warn('Cannot set remote description in state:', state, 'for offer from:', data.from);
            }
        } catch (error) {
            console.error('Error handling offer from:', data.from, error);
        }
    }
    async handleAnswer(data) {
        console.log('Received answer from:', data.from);
        if (data.from === this.userId) {
            console.log('Ignoring answer from ourselves:', data.from);
            return;
        }
        const peerConnection = this.peers.get(data.from);
        if (peerConnection) {
            try {
                const state = peerConnection.signalingState;
                console.log('Peer connection state for', data.from, ':', state);
                if (state === 'have-local-offer') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                    console.log('Set remote description for peer:', data.from);
                } else if (state === 'stable') {
                    console.log('Peer connection already stable for', data.from, '- ignoring answer');
                } else {
                    console.warn('Cannot set remote description in state:', state, 'for peer:', data.from);
                }
            } catch (error) {
                console.error('Error setting remote description for peer:', data.from, error);
            }
        } else {
            console.error('No peer connection found for answer from:', data.from);
        }
    }
    async handleIceCandidate(data) {
        console.log('Received ICE candidate from:', data.from);
        if (data.from === this.userId) {
            console.log('Ignoring ICE candidate from ourselves:', data.from);
            return;
        }
        const peerConnection = this.peers.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('Added ICE candidate from:', data.from);
            } catch (error) {
                console.error('Error adding ICE candidate from:', data.from, error);
            }
        } else {
            console.warn('No peer connection found for ICE candidate from:', data.from);
        }
    }
    removePeer(userId) {
        console.log('Removing peer:', userId);
        this.peers.delete(userId);
        this.participants.delete(userId);
        const videoWrapper = document.getElementById(`wrapper-${userId}`);
        if (videoWrapper) {
            videoWrapper.remove();
            console.log('Removed video wrapper for user:', userId);
        }
        const participantItem = document.getElementById(`participant-${userId}`);
        if (participantItem) {
            participantItem.remove();
        }
    }
    createPeerConnection(userId) {
        const peerConnection = new RTCPeerConnection(this.config);
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    target: userId,
                    candidate: event.candidate
                });
            }
        };
        peerConnection.ontrack = (event) => {
            console.log('Received remote stream from:', userId);
            console.log('Stream tracks:', event.streams[0]?.getTracks());
            console.log('Stream active:', event.streams[0]?.active);
            if (event.streams && event.streams[0]) {
                this.addRemoteVideo(userId, event.streams[0]);
            } else {
                console.error('No remote stream received from:', userId);
            }
        };
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state with', userId, ':', peerConnection.connectionState);
            if (peerConnection.connectionState === 'connected') {
                this.updateParticipantConnectionStatus(userId, 'good');
                this.startConnectionQualityMonitoring(userId, peerConnection);
            } else if (peerConnection.connectionState === 'disconnected' || 
                       peerConnection.connectionState === 'failed' || 
                       peerConnection.connectionState === 'closed') {
                this.updateParticipantConnectionStatus(userId, 'disconnected');
                this.removePeer(userId);
            }
        };
        return peerConnection;
    }
    addParticipantGrid(userId, username) {
    console.log('=== ADDING PARTICIPANT GRID ===');
    console.log('User ID:', userId);
    console.log('Username:', username);
    const videoContainer = document.getElementById('remote-videos');
    if (!videoContainer) {
        console.error('Remote videos container not found');
        return;
    }
    let videoElement = document.getElementById(`video-${userId}`);
    if (!videoElement) {
        console.log('Creating new video grid for user:', userId);
        const videoWrapper = document.createElement('div');
        videoWrapper.className = 'video-wrapper';
        videoWrapper.id = `wrapper-${userId}`;
        videoWrapper.setAttribute('data-user-id', userId);
        videoElement = document.createElement('video');
        videoElement.id = `video-${userId}`;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.className = 'video-element';
        videoElement.style.display = 'block';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.backgroundColor = '#1a1a1a'; 
        const participantInfo = document.createElement('div');
        participantInfo.className = 'participant-info';
        participantInfo.innerHTML = `
            <span class="participant-name">${username || 'User ' + userId}</span>
            <div class="participant-status">
                <i class="fas fa-microphone-slash" style="color: #ff4444; margin-right: 5px;"></i>
                <i class="fas fa-video-slash" style="color: #ff4444;"></i>
            </div>
        `;
        videoWrapper.appendChild(videoElement);
        videoWrapper.appendChild(participantInfo);
        videoContainer.appendChild(videoWrapper);
        console.log('Created participant grid for user:', userId);
    } else {
        console.log('Video grid already exists for user:', userId);
    }
}
addRemoteVideo(userId, stream) {
        console.log('=== ADDING REMOTE VIDEO ===');
        console.log('User ID:', userId);
        console.log('Stream:', stream);
        console.log('Stream tracks:', stream?.getTracks());
        console.log('Stream active:', stream?.active);
        let videoElement = document.getElementById(`video-${userId}`);
        let videoWrapper = document.getElementById(`wrapper-${userId}`);
        if (!videoElement || !videoWrapper) {
            console.log('Video element not found, creating participant grid first');
            this.addParticipantGrid(userId, this.participants.get(userId) || 'User ' + userId);
            videoElement = document.getElementById(`video-${userId}`);
            videoWrapper = document.getElementById(`wrapper-${userId}`);
        }
        if (videoElement) {
            if (videoElement.srcObject === stream) {
                console.log('Stream already set for user:', userId, '- skipping duplicate');
                return;
            }
            videoElement.srcObject = stream;
            console.log('Set remote video stream for user:', userId);
            const participantInfo = videoWrapper.querySelector('.participant-info');
            if (participantInfo) {
                const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
                const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;
                const videoIcon = participantInfo.querySelector('.fa-video, .fa-video-slash');
                const audioIcon = participantInfo.querySelector('.fa-microphone, .fa-microphone-slash');
                if (videoIcon && !videoIcon.dataset.toggled) {
                    videoIcon.className = `fas fa-video${hasVideo ? '' : '-slash'}`;
                    videoIcon.style.color = hasVideo ? '#4CAF50' : '#ff4444';
                }
                if (audioIcon && !audioIcon.dataset.toggled) {
                    audioIcon.className = `fas fa-microphone${hasAudio ? '' : '-slash'}`;
                    audioIcon.style.color = hasAudio ? '#4CAF50' : '#ff4444';
                }
            }
            const playVideo = async () => {
                try {
                    await videoElement.play();
                    console.log('Video playing successfully for user:', userId);
                } catch (error) {
                    console.error('Error playing video:', error);
                    if (error.name === 'AbortError') {
                        console.log('Video play was aborted, retrying...');
                        setTimeout(() => playVideo(), 100);
                    } else {
                        videoElement.muted = true;
                        try {
                            await videoElement.play();
                            console.log('Video playing muted for user:', userId);
                        } catch (e) {
                            console.error('Still cannot play video:', e);
                        }
                    }
                }
            };
            playVideo();
        } else {
            console.error('Could not find or create video element for user:', userId);
        }
        console.log('Remote video addition complete for user:', userId);
    }
    handleRemoteScreenShare(data) {
        console.log('=== REMOTE SCREEN SHARE STARTED ===');
        console.log('User:', data.username, 'with audio:', data.withAudio);
        
        const participantInfo = document.querySelector(`#wrapper-${data.userId} .participant-info`);
        if (participantInfo) {
            const screenShareIndicator = participantInfo.querySelector('.screen-share-indicator');
            if (!screenShareIndicator) {
                const indicator = document.createElement('div');
                indicator.className = 'screen-share-indicator';
                indicator.innerHTML = `<i class="fas fa-desktop"></i>`;
                if (data.withAudio) {
                    indicator.innerHTML += `<i class="fas fa-volume-up"></i>`;
                }
                participantInfo.appendChild(indicator);
            }
        }
    }
    
    handleRemoteScreenShareStopped(data) {
        console.log('=== REMOTE SCREEN SHARE STOPPED ===');
        console.log('User:', data.username);
        
        const participantInfo = document.querySelector(`#wrapper-${data.userId} .participant-info`);
        if (participantInfo) {
            const screenShareIndicator = participantInfo.querySelector('.screen-share-indicator');
            if (screenShareIndicator) {
                screenShareIndicator.remove();
            }
        }
    }
    async toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.updateVideoButton(videoTrack.enabled);
                if (this.socket && this.roomId) {
                    this.socket.emit('media-toggle', {
                        userId: this.userId,
                        type: 'video',
                        enabled: videoTrack.enabled
                    });
                    console.log('Sent video toggle notification:', videoTrack.enabled);
                }
            }
        }
    }
    async toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.updateAudioButton(audioTrack.enabled);
                if (this.socket && this.roomId) {
                    this.socket.emit('media-toggle', {
                        userId: this.userId,
                        type: 'audio',
                        enabled: audioTrack.enabled
                    });
                    console.log('Sent audio toggle notification:', audioTrack.enabled);
                }
            }
        }
    }
    async startScreenShare() {
        try {
            console.log('=== STARTING SCREEN SHARE WITH AUDIO ===');
            console.log('Screen share audio enabled:', this.screenShareAudioEnabled);
            
            let constraints = {
                video: {
                    cursor: 'always'
                }
            };

            if (this.screenShareAudioEnabled) {
                constraints.audio = true;
            }

            this.screenShareStream = await navigator.mediaDevices.getDisplayMedia(constraints);
            
            console.log('Screen share stream obtained:', {
                hasVideo: this.screenShareStream.getVideoTracks().length > 0,
                hasAudio: this.screenShareStream.getAudioTracks().length > 0,
                videoTracks: this.screenShareStream.getVideoTracks().length,
                audioTracks: this.screenShareStream.getAudioTracks().length
            });

            const videoTrack = this.screenShareStream.getVideoTracks()[0];
            const audioTrack = this.screenShareStream.getAudioTracks()[0];

            if (audioTrack && this.screenShareAudioEnabled) {
                this.screenShareAudioTrack = audioTrack;
                this.originalAudioTrack = this.localStream.getAudioTracks()[0];
                
                console.log('Screen share audio track found:', {
                    enabled: audioTrack.enabled,
                    muted: audioTrack.muted,
                    label: audioTrack.label
                });
            }

            this.peers.forEach((peerConnection, userId) => {
                const videoSender = peerConnection.getSenders().find(
                    s => s.track && s.track.kind === 'video'
                );
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                    console.log('Replaced video track for peer:', userId);
                }

                if (audioTrack && this.screenShareAudioEnabled) {
                    const audioSender = peerConnection.getSenders().find(
                        s => s.track && s.track.kind === 'audio'
                    );
                    if (audioSender) {
                        audioSender.replaceTrack(audioTrack);
                        console.log('Replaced audio track for peer:', userId);
                    }
                }
            });

            const localVideo = document.getElementById('local');
            if (localVideo) {
                localVideo.srcObject = this.screenShareStream;
            }

            this.isScreenSharing = true;
            this.updateScreenShareButton(true);
            
            this.socket.emit('screen-share-started', {
                userId: this.userId,
                withAudio: this.screenShareAudioEnabled && !!audioTrack
            });

            videoTrack.onended = () => {
                console.log('Screen share ended by user');
                this.stopScreenShare();
            };

            if (audioTrack) {
                audioTrack.onended = () => {
                    console.log('Screen share audio ended');
                };
            }

            console.log('=== SCREEN SHARE STARTED SUCCESSFULLY ===');
        } catch (error) {
            console.error('=== SCREEN SHARE ERROR ===');
            console.error('Error starting screen share:', error);
            
            if (error.name === 'NotAllowedError') {
                console.log('User denied screen sharing permission');
                this.showScreenShareError('Screen sharing permission denied');
            } else if (error.name === 'NotSupportedError') {
                console.log('Screen sharing not supported in this browser');
                this.showScreenShareError('Screen sharing not supported in this browser');
            } else if (error.name === 'TypeError' && error.message.includes('audio')) {
                console.log('Audio capture not available, trying video only');
                this.screenShareAudioEnabled = false;
                await this.startScreenShareVideoOnly();
            } else {
                this.showScreenShareError('Failed to start screen sharing: ' + error.message);
            }
        }
    }

    async startScreenShareVideoOnly() {
        try {
            console.log('=== STARTING SCREEN SHARE VIDEO ONLY ===');
            
            this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always'
                },
                audio: false
            });

            const videoTrack = this.screenShareStream.getVideoTracks()[0];

            this.peers.forEach((peerConnection, userId) => {
                const videoSender = peerConnection.getSenders().find(
                    s => s.track && s.track.kind === 'video'
                );
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                    console.log('Replaced video track for peer:', userId);
                }
            });

            const localVideo = document.getElementById('local');
            if (localVideo) {
                localVideo.srcObject = this.screenShareStream;
            }

            this.isScreenSharing = true;
            this.updateScreenShareButton(true);
            
            this.socket.emit('screen-share-started', {
                userId: this.userId,
                withAudio: false
            });

            videoTrack.onended = () => {
                console.log('Screen share ended by user');
                this.stopScreenShare();
            };

            console.log('=== SCREEN SHARE VIDEO ONLY STARTED ===');
        } catch (error) {
            console.error('Error starting screen share video only:', error);
            this.showScreenShareError('Failed to start screen sharing: ' + error.message);
        }
    }

    showScreenShareError(message) {
        console.error('Screen share error:', message);
        const errorElement = document.getElementById('screen-share-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    toggleScreenShareAudio() {
        this.screenShareAudioEnabled = !this.screenShareAudioEnabled;
        console.log('Screen share audio toggled:', this.screenShareAudioEnabled);
        
        if (this.isScreenSharing) {
            this.updateScreenShareAudio();
        }
        
        this.updateScreenShareButton();
    }

    updateScreenShareAudio() {
        if (!this.isScreenSharing) return;

        this.peers.forEach((peerConnection, userId) => {
            const audioSender = peerConnection.getSenders().find(
                s => s.track && s.track.kind === 'audio'
            );
            
            if (this.screenShareAudioEnabled && this.screenShareAudioTrack) {
                if (audioSender) {
                    audioSender.replaceTrack(this.screenShareAudioTrack);
                    console.log('Enabled screen share audio for peer:', userId);
                }
            } else {
                if (audioSender && this.originalAudioTrack) {
                    audioSender.replaceTrack(this.originalAudioTrack);
                    console.log('Restored original audio for peer:', userId);
                }
            }
        });
    }
    async stopScreenShare() {
        if (this.screenShareStream) {
            console.log('=== STOPPING SCREEN SHARE ===');
            
            this.screenShareStream.getTracks().forEach(track => {
                console.log('Stopping track:', track.kind, track.label);
                track.stop();
            });
            
            const videoTrack = this.localStream.getVideoTracks()[0];
            
            this.peers.forEach((peerConnection, userId) => {
                const videoSender = peerConnection.getSenders().find(
                    s => s.track && s.track.kind === 'video'
                );
                if (videoSender && videoTrack) {
                    videoSender.replaceTrack(videoTrack);
                    console.log('Restored video track for peer:', userId);
                }

                const audioSender = peerConnection.getSenders().find(
                    s => s.track && s.track.kind === 'audio'
                );
                if (audioSender && this.originalAudioTrack) {
                    audioSender.replaceTrack(this.originalAudioTrack);
                    console.log('Restored original audio for peer:', userId);
                }
            });
            
            const localVideo = document.getElementById('local');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            this.screenShareStream = null;
            this.screenShareAudioTrack = null;
            this.originalAudioTrack = null;
            this.isScreenSharing = false;
            
            this.updateScreenShareButton(false);
            
            this.socket.emit('screen-share-stopped', {
                userId: this.userId
            });
            
            console.log('=== SCREEN SHARE STOPPED ===');
        }
    }
    async startRecording() {
        if (this.isRecording) return;
        try {
            const recordedStream = new MediaStream();
            console.log('Local stream tracks before processing:', this.localStream.getTracks().map(t => ({kind: t.kind, label: t.label, enabled: t.enabled})));
            this.localStream.getAudioTracks().forEach(track => {
                console.log('Adding local audio track to recording:', track.kind, track.label, track.enabled);
                recordedStream.addTrack(track);
            });
            if (this.screenShareStream) {
                console.log('🎥 SCREEN SHARE DETECTED - Prioritizing screen content in recording');
                console.log('Screen share tracks before processing:', this.screenShareStream.getTracks().map(t => ({kind: t.kind, label: t.label, enabled: t.enabled})));
                this.screenShareStream.getTracks().forEach(track => {
                    console.log('✅ Adding screen share track to recording:', track.kind, track.label, track.enabled);
                    recordedStream.addTrack(track);
                });
                const localVideoTrack = this.localStream.getVideoTracks()[0];
                if (localVideoTrack) {
                    console.log('📹 Adding local video as PiP overlay during screen share');
                    recordedStream.addTrack(localVideoTrack);
                }
            } else {
                console.log('📹 No screen share - Adding regular local video');
                this.localStream.getVideoTracks().forEach(track => {
                    console.log('Adding local video track to recording:', track.kind, track.label, track.enabled);
                    recordedStream.addTrack(track);
                });
            }
            this.peers.forEach((peerConnection, userId) => {
                peerConnection.getReceivers().forEach(receiver => {
                    if (receiver.track) {
                        console.log('Adding remote track to recording:', receiver.track.kind, receiver.track.label, 'from user:', userId, receiver.track.enabled);
                        recordedStream.addTrack(receiver.track);
                    }
                });
            });
            const allTracks = recordedStream.getTracks();
            const videoTracks = allTracks.filter(track => track.kind === 'video');
            const audioTracks = allTracks.filter(track => track.kind === 'audio');
            console.log('📊 RECORDING COMPOSITION:');
            console.log('Total tracks in recording stream:', allTracks.length);
            console.log('Video tracks:', videoTracks.length, 'Audio tracks:', audioTracks.length);
            console.log('Screen share active:', this.isScreenSharing ? '✅ YES' : '❌ NO');
            console.log('Recording stream tracks:', allTracks.map(t => ({kind: t.kind, label: t.label, enabled: t.enabled, readyState: t.readyState})));
            const hasAudio = audioTracks.length > 0;
            const hasVideo = videoTracks.length > 0;
            console.log('Recording has audio:', hasAudio ? '✅ YES' : '❌ NO', 'has video:', hasVideo ? '✅ YES' : '❌ NO');
            if (this.isScreenSharing) {
                console.log('🎥 RECORDING MODE: Screen Share Priority - Screen content will be primary video');
            } else {
                console.log('📹 RECORDING MODE: Standard Meeting - Regular video feeds');
            }
            if (!hasAudio && this.localStream) {
                console.log('WARNING: No audio tracks found, forcing audio capture...');
                const audioTracks = this.localStream.getAudioTracks();
                console.log('Available audio tracks in local stream:', audioTracks.length);
                audioTracks.forEach((audioTrack, index) => {
                    console.log(`Audio track ${index}:`, {
                        kind: audioTrack.kind,
                        label: audioTrack.label,
                        enabled: audioTrack.enabled,
                        muted: audioTrack.muted,
                        readyState: audioTrack.readyState
                    });
                    recordedStream.addTrack(audioTrack);
                });
            }
            if (!hasVideo && this.localStream) {
                console.log('WARNING: No video tracks found, forcing video capture...');
                const videoTracks = this.localStream.getVideoTracks();
                if (videoTracks.length > 0) {
                    videoTracks.forEach(videoTrack => {
                        console.log('Force adding video track:', videoTrack.kind, videoTrack.label);
                        recordedStream.addTrack(videoTrack);
                    });
                }
            }
            let selectedMimeType = 'video/webm'; 
            if (hasAudio && hasVideo) {
                const mimeTypesToTry = [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus', 
                    'video/webm;codecs=avc1,opus',
                    'video/webm;codecs=h264,opus'
                ];
                for (const mimeTypeToTry of mimeTypesToTry) {
                    if (MediaRecorder.isTypeSupported(mimeTypeToTry)) {
                        selectedMimeType = mimeTypeToTry;
                        console.log('Using supported MIME type:', selectedMimeType);
                        break;
                    }
                }
            } else if (hasVideo) {
                selectedMimeType = 'video/webm;codecs=vp9';
            } else if (hasAudio) {
                selectedMimeType = 'audio/webm;codecs=opus';
            }
            console.log('Final MIME type selected:', selectedMimeType);
            const options = {
                mimeType: selectedMimeType
            };
            if (hasVideo) {
                options.videoBitsPerSecond = 2500000; 
            }
            if (hasAudio) {
                options.audioBitsPerSecond = 128000;   
            }
            console.log('MediaRecorder options:', options);
            this.mediaRecorder = new MediaRecorder(recordedStream, options);
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                console.log('MediaRecorder data available:', {
                    size: event.data.size,
                    dataType: event.data.type,
                    timestamp: new Date().toISOString()
                });
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    console.log('Chunk added. Total chunks:', this.recordedChunks.length);
                } else {
                    console.log('Received empty chunk');
                }
            };
            this.mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped. Total chunks:', this.recordedChunks.length);
                console.log('Chunk sizes:', this.recordedChunks.map((chunk, i) => ({ index: i, size: chunk.size })));
                this.saveRecording();
            };
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event);
                console.error('Error details:', {
                    error: event.error,
                    errorCode: event.errorCode,
                    message: event.message
                });
            };
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateRecordingButton(true);
            
            if (this.socket && this.socket.connected) {
                this.socket.emit('start-recording', {
                    roomId: this.roomId,
                    userId: this.userId
                });
            }
            
            this.showRecordingIndicator(true);
            this.startRecordingTimer();
        } catch (error) {
            console.error('Error starting recording:', error);
        }
    }
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingButton(false);
            
            if (this.socket && this.socket.connected) {
                this.socket.emit('stop-recording', {
                    roomId: this.roomId,
                    userId: this.userId
                });
            }
            
            this.showRecordingIndicator(false);
            this.stopRecordingTimer();
        }
    }
    saveRecording() {
        console.log('=== SAVING RECORDING ===');
        console.log('Total chunks to save:', this.recordedChunks.length);
        console.log('Total blob size:', this.recordedChunks.reduce((total, chunk) => total + chunk.size, 0));
        const blob = new Blob(this.recordedChunks, {
            type: 'video/webm'
        });
        console.log('Blob created:', {
            size: blob.size,
            type: blob.type,
            isEmpty: blob.size === 0
        });
        if (blob.size === 0) {
            console.error('ERROR: Blob is empty! Recording failed.');
            return;
        }
        const url = URL.createObjectURL(blob);
        console.log('Blob URL created:', url);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Recording saved successfully');
        console.log('=== END SAVING RECORDING ===');
    }
    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.virtualBackgroundProcessor = this.audioContext.createScriptProcessor(4096, 2, 2);
            this.virtualBackgroundProcessor.onaudioprocess = this.processVirtualBackground.bind(this);
        } catch (error) {
            console.error('Error setting up audio context:', error);
        }
    }
    processVirtualBackground(audioProcessingEvent) {
    }
    addParticipantToUI(userId, username) {
        this.participants.set(userId, username);
        this.updateParticipantsList();
    }
    handleUserLeft(data) {
        console.log('=== CLIENT: HANDLING USER LEFT ===');
        console.log('Removing user from meeting:', data);
        console.log('User ID to remove:', data.userId);
        console.log('Username to remove:', data.username);
        console.log('Current peers before removal:', Array.from(this.peers.keys()));
        if (this.peers.has(data.userId)) {
            const peerConnection = this.peers.get(data.userId);
            if (peerConnection) {
                console.log('Closing peer connection for user:', data.userId);
                peerConnection.close();
            }
            this.peers.delete(data.userId);
            console.log('Removed peer connection for user:', data.userId);
        } else {
            console.log('No peer connection found for user:', data.userId);
        }
        const videoWrapper = document.getElementById(`wrapper-${data.userId}`);
        if (videoWrapper) {
            console.log('Removing video element for user:', data.userId);
            videoWrapper.remove();
        } else {
            console.log('No video element found for user:', data.userId);
        }
        const wasInParticipants = this.participants.has(data.userId);
        this.participants.delete(data.userId);
        console.log('Removed from participants list:', wasInParticipants ? 'YES' : 'NO');
        console.log('Participants after removal:', Array.from(this.participants.keys()));
        this.updateParticipantsList();
        console.log('Updated participants list in UI');
        console.log('=== END USER LEFT HANDLING ===');
    }
    handleChatMessage(data) {
        console.log('Received chat message:', data);
        this.addChatMessageToUI(data);
    }
    handleMediaToggle(data) {
        console.log('=== RECEIVED MEDIA TOGGLE ===');
        console.log('Data:', data);
        console.log('User ID:', data.userId);
        console.log('Type:', data.type);
        console.log('Enabled:', data.enabled);
        const videoWrapper = document.getElementById(`wrapper-${data.userId}`);
        if (!videoWrapper) {
            console.log('Video wrapper not found for user:', data.userId);
            return;
        }
        const participantInfo = videoWrapper.querySelector('.participant-info');
        if (!participantInfo) {
            console.log('Participant info not found for user:', data.userId);
            return;
        }
        let currentStatus = participantInfo.querySelector('.participant-status');
        if (!currentStatus) {
            currentStatus = document.createElement('div');
            currentStatus.className = 'participant-status';
            participantInfo.appendChild(currentStatus);
        }
        console.log('Found participant status section:', currentStatus);
        if (data.type === 'video') {
            const videoIcon = currentStatus.querySelector('.fa-video, .fa-video-slash');
            if (videoIcon) {
                videoIcon.className = `fas fa-video${data.enabled ? '' : '-slash'}`;
                videoIcon.style.color = data.enabled ? '#4CAF50' : '#ff4444';
                videoIcon.dataset.toggled = 'true'; 
            }
            const videoElement = document.getElementById(`video-${data.userId}`);
            if (videoElement) {
                if (data.enabled) {
                    videoElement.style.display = 'block';
                    console.log('Video enabled for user:', data.userId);
                } else {
                    videoElement.style.display = 'none';
                    console.log('Video disabled for user:', data.userId);
                }
            }
        } else if (data.type === 'audio') {
            const audioIcon = currentStatus.querySelector('.fa-microphone, .fa-microphone-slash');
            if (audioIcon) {
                audioIcon.className = `fas fa-microphone${data.enabled ? '' : '-slash'}`;
                audioIcon.style.color = data.enabled ? '#4CAF50' : '#ff4444';
                audioIcon.dataset.toggled = 'true'; 
            }
            console.log('Audio', data.enabled ? 'enabled' : 'disabled', 'for user:', data.userId);
        }
        this.updateParticipantListMediaStatus(data.userId, data.type, data.enabled);
    }
    updateParticipantListMediaStatus(userId, type, enabled) {
        const participantItem = document.getElementById(`participant-${userId}`);
        if (!participantItem) {
            return;
        }
        const statusIcons = participantItem.querySelector('.participant-status-icons');
        if (!statusIcons) {
            return;
        }
        if (type === 'video') {
            const videoIcon = statusIcons.querySelector('.video-icon');
            if (videoIcon) {
                videoIcon.className = `fas video-icon fa-video${enabled ? '' : '-slash'}`;
                videoIcon.style.color = enabled ? '#4CAF50' : '#ff4444';
                videoIcon.dataset.toggled = 'true'; 
            }
        } else if (type === 'audio') {
            const audioIcon = statusIcons.querySelector('.audio-icon');
            if (audioIcon) {
                audioIcon.className = `fas audio-icon fa-microphone${enabled ? '' : '-slash'}`;
                audioIcon.style.color = enabled ? '#4CAF50' : '#ff4444';
                audioIcon.dataset.toggled = 'true'; 
            }
        }
    }
    addChatMessageToUI(data) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) {
            console.error('Chat messages container not found');
            return;
        }
        console.log('Adding chat message to UI:', data);
        console.log('Current user ID:', this.userId);
        console.log('Message user ID:', data.userId);
        console.log('Is own message:', data.userId === this.userId);
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${data.userId === this.userId ? 'own' : 'other'}`;
        const messageTime = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        let messageContent = `
            <div class="message-info">${data.username || 'User'}</div>
        `;
        if (data.message && data.message.trim()) {
            messageContent += `<div class="message-text">${data.message}</div>`;
        }
        if (data.mediaUrl) {
            messageContent += `<div class="media-content">`;
            if (data.mediaType.startsWith('image/')) {
                messageContent += `<img src="${data.mediaUrl}" alt="${data.fileName || 'Image'}" onclick="window.open('${data.mediaUrl}', '_blank')">`;
            } else if (data.mediaType.startsWith('video/')) {
                messageContent += `<video controls><source src="${data.mediaUrl}" type="${data.mediaType}"></video>`;
            } else if (data.mediaType.startsWith('audio/')) {
                messageContent += `<audio controls><source src="${data.mediaUrl}" type="${data.mediaType}"></audio>`;
            } else {
                const fileIcon = this.getFileIcon(data.mediaType);
                messageContent += `
                    <a href="${data.mediaUrl}" target="_blank" class="media-file-link">
                        <i class="${fileIcon}"></i>
                        <span>${data.fileName || 'File'}</span>
                    </a>
                `;
            }
            messageContent += `</div>`;
        }
        messageContent += `<div class="message-time">${messageTime}</div>`;
        messageElement.innerHTML = messageContent;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        setTimeout(() => {
            messageElement.style.transition = 'all 0.3s ease-out';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 10);
        console.log('Successfully added chat message to UI');
    }
    getFileIcon(mediaType) {
        if (mediaType.includes('pdf')) return 'fas fa-file-pdf';
        if (mediaType.includes('word') || mediaType.includes('document')) return 'fas fa-file-word';
        if (mediaType.includes('excel') || mediaType.includes('spreadsheet')) return 'fas fa-file-excel';
        if (mediaType.includes('powerpoint') || mediaType.includes('presentation')) return 'fas fa-file-powerpoint';
        if (mediaType.includes('text')) return 'fas fa-file-alt';
        if (mediaType.includes('zip') || mediaType.includes('rar')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }
    handleRoomParticipants(data) {
        console.log('Received room participants:', data);
        data.participants.forEach(participant => {
            this.addParticipantToUI(participant.userId, participant.username);
        });
    }
    updateParticipantsList() {
        const participantsList = document.getElementById('participants-list');
        if (participantsList) {
            participantsList.innerHTML = '';
            this.participants.forEach((username, userId) => {
                const participantItem = document.createElement('div');
                participantItem.className = 'participant-item';
                participantItem.innerHTML = `
                    <span>${username}</span>
                    <div class="participant-actions">
                        <button class="btn btn-sm" onclick="videoConference.muteParticipant('${userId}')">
                            <i class="fas fa-microphone-slash"></i>
                        </button>
                        <button class="btn btn-sm" onclick="videoConference.kickParticipant('${userId}')">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                `;
                participantsList.appendChild(participantItem);
            });
        }
    }
    updateVideoButton(isEnabled) {
        const button = document.getElementById('video-btn');
        if (button) {
            button.innerHTML = isEnabled ? 
                '<i class="fas fa-video"></i>' : 
                '<i class="fas fa-video-slash"></i>';
        }
    }
    updateAudioButton(isEnabled) {
        const button = document.getElementById('mic-btn');
        if (button) {
            button.innerHTML = isEnabled ? 
                '<i class="fas fa-microphone"></i>' : 
                '<i class="fas fa-microphone-slash"></i>';
        }
    }
    updateScreenShareButton(isSharing) {
        const button = document.getElementById('screen-btn');
        if (button) {
            let icon = '<i class="fas fa-desktop"></i>';
            let audioIndicator = '';
            
            if (isSharing) {
                icon = '<i class="fas fa-stop"></i>';
                if (this.screenShareAudioEnabled && this.screenShareAudioTrack) {
                    audioIndicator = '<span class="screen-share-audio-indicator"><i class="fas fa-volume-up"></i></span>';
                } else if (!this.screenShareAudioEnabled) {
                    audioIndicator = '<span class="screen-share-audio-indicator muted"><i class="fas fa-volume-mute"></i></span>';
                }
            }
            
            button.innerHTML = icon + audioIndicator;
            button.title = isSharing ? 
                'Stop Screen Sharing (Right-click to toggle audio)' : 
                'Share Screen (Right-click to toggle audio)';
        }
    }
    updateRecordingButton(isRecording) {
        const button = document.getElementById('record-btn');
        if (button) {
            if (isRecording) {
                button.innerHTML = '<i class="fas fa-stop"></i>';
                button.classList.add('recording');
            } else {
                button.innerHTML = '<i class="fas fa-circle"></i>';
                button.classList.remove('recording');
            }
        }
    }
    async initializeProximityDetector(videoElement) {
        try {
            if (window.ProximityDetector) {
                this.proximityDetector = new ProximityDetector();
                const initialized = await this.proximityDetector.initialize(
                    videoElement, 
                    this.handleProximityAlert.bind(this)
                );
                if (initialized) {
                    console.log('Proximity detector initialized successfully');
                    const proximityEnabled = localStorage.getItem('proximityDetectionEnabled');
                    if (proximityEnabled === 'true') {
                        this.startProximityDetection();
                    }
                }
            } else {
                console.warn('ProximityDetector class not available');
            }
        } catch (error) {
            console.error('Error initializing proximity detector:', error);
        }
    }
    startProximityDetection() {
        if (this.proximityDetector) {
            this.proximityDetector.start();
            this.isProximityDetectionEnabled = true;
            this.updateProximityButton();
            localStorage.setItem('proximityDetectionEnabled', 'true');
            console.log('Proximity detection started');
        }
    }
    stopProximityDetection() {
        if (this.proximityDetector) {
            this.proximityDetector.stop();
            this.isProximityDetectionEnabled = false;
            this.updateProximityButton();
            localStorage.setItem('proximityDetectionEnabled', 'false');
            console.log('Proximity detection stopped');
        }
    }
    toggleProximityDetection() {
        if (this.isProximityDetectionEnabled) {
            this.stopProximityDetection();
        } else {
            this.startProximityDetection();
        }
    }
    updateProximityButton() {
        const proximityBtn = document.getElementById('proximity-btn');
        if (proximityBtn) {
            if (this.isProximityDetectionEnabled) {
                proximityBtn.classList.add('active');
                proximityBtn.style.background = 'rgba(40, 167, 69, 0.8)';
                proximityBtn.title = 'Disable Proximity Detection';
            } else {
                proximityBtn.classList.remove('active');
                proximityBtn.style.background = '';
                proximityBtn.title = 'Enable Proximity Detection';
            }
        }
    }
    handleProximityAlert(alertData) {
        console.log('Proximity alert received:', alertData);
        this.showProximityIndicator(alertData);
        if (this.socket && this.socket.connected) {
            this.socket.emit('proximity-alert', {
                userId: this.userId,
                severity: alertData.severity,
                message: 'is sitting too close to the screen!'
            });
        }
    }
    showProximityIndicator(alertData) {
        let indicator = document.getElementById('proximity-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'proximity-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                background: ${alertData.severity === 'high' ? 'rgba(220, 53, 69, 0.9)' : 
                              alertData.severity === 'medium' ? 'rgba(255, 193, 7, 0.9)' : 
                              'rgba(23, 162, 184, 0.9)'};
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 6px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                animation: fadeInOut 2s ease-in-out;
            `;
            indicator.innerHTML = `
                <i class="fas fa-user-check"></i>
                <span>Too Close!</span>
            `;
            document.body.appendChild(indicator);
        }
        indicator.style.background = alertData.severity === 'high' ? 'rgba(220, 53, 69, 0.9)' : 
                                  alertData.severity === 'medium' ? 'rgba(255, 193, 7, 0.9)' : 
                                  'rgba(23, 162, 184, 0.9)';
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }
    disconnect() {
        if (this.proximityDetector) {
            this.proximityDetector.stop();
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.screenShareStream) {
            this.screenShareStream.getTracks().forEach(track => track.stop());
        }
        this.peers.forEach((peerConnection) => {
            peerConnection.close();
        });
        if (this.isRecording) {
            this.stopRecording();
        }
        if (this.virtualBackgroundEnabled) {
            this.disableVirtualBackground();
        }
        if (this.socket) {
            this.socket.disconnect();
        }
        this.peers.clear();
        this.participants.clear();
    }
}
window.VideoConferenceManager = VideoConferenceManager;
