class MeetingManager {
    constructor() {
        this.videoConference = null;
        this.translator = null;
        this.zenModeActive = false;
        this.originalAudioConstraints = null;
        this.originalVideoConstraints = null;
        this.uploadIndicator = null;
        this.mediaPreviewUrl = null;
        this.meetingStartTime = null;
        this.timerInterval = null;
        this.meetingDuration = 0;
        this.audioContext = null;
        this.noiseSuppressionNode = null;
        this.gainNode = null;
        this.handRaised = false;
        this.raisedHands = new Map();
        this.lowLightModeActive = false;
        this.originalVideoSettings = null;
    }
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            return null;
        }
    }
    async initialize() {
        console.log('=== MEETING INITIALIZATION START ===');
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const roomId = urlParams.get('room');
            if (!roomId) {
                console.error('No room ID found in URL');
                alert('Invalid meeting link. Room ID is required.');
                window.location.href = '/dashboard.html';
                return;
            }
            console.log('Room ID extracted from URL:', roomId);
            let userData = null;
            let token = null;
            const sessionData = localStorage.getItem('authSession');
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    token = parsed.token;
                    userData = parsed.user;
                    console.log('=== AUTH SESSION FOUND ===');
                    console.log('User data:', userData);
                } catch (e) {
                    console.error('Error parsing authSession:', e);
                }
            }
            if (!token) {
                token = localStorage.getItem('token');
                if (token) {
                    const decoded = this.parseJWT(token);
                    userData = {
                        _id: decoded.userId,
                        username: decoded.username || `User ${decoded.userId}`
                    };
                    console.log('=== DIRECT TOKEN FOUND ===');
                }
            }
            if (!token || !userData) {
                console.error('No authentication data found');
                alert('Authentication required. Please login again.');
                window.location.href = '/index.html';
                return;
            }
            console.log('=== AUTHENTICATION SUCCESSFUL ===');
            console.log('User ID:', userData._id);
            console.log('Username:', userData.username);
            if (window.VideoConferenceManager) {
                console.log('=== INITIALIZING VIDEO CONFERENCE MANAGER ===');
                this.videoConference = new VideoConferenceManager();
                await this.videoConference.initialize(roomId, userData._id);
                this.setupSocketEventHandlers();
                this.setupUIHandlers();
                this.initializeTranslator();
                this.startTimer();
                console.log('=== MEETING INITIALIZATION COMPLETE ===');
            } else {
                console.error('VideoConferenceManager not available');
                alert('Failed to load video conference module. Please refresh the page.');
            }
        } catch (error) {
            console.error('=== MEETING INITIALIZATION FAILED ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            alert('Failed to join meeting. Please try again.');
            window.location.href = '/dashboard.html';
        }
    }
    startTimer() {
        console.log('=== STARTING MEETING TIMER ===');
        this.meetingStartTime = new Date();
        this.meetingDuration = 0;
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.meetingDuration++;
            this.updateTimerDisplay();
        }, 1000);
        console.log('Meeting timer started at:', this.meetingStartTime);
    }
    stopTimer() {
        console.log('=== STOPPING MEETING TIMER ===');
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('Meeting timer stopped');
        }
    }
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timer-display');
        if (timerDisplay) {
            const formattedTime = this.formatTime(this.meetingDuration);
            timerDisplay.textContent = formattedTime;
        }
    }
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }
    setupSocketEventHandlers() {
        console.log('=== SETTING UP SOCKET EVENT HANDLERS ===');
        setTimeout(() => {
            if (this.videoConference && this.videoConference.socket) {
                console.log('Setting up socket event handlers...');
                this.videoConference.socket.on('user-joined', (data) => {
                    console.log('User joined event received:', data);
                    if (this.videoConference.handleUserJoined) {
                        this.videoConference.handleUserJoined(data);
                    }
                });
                this.videoConference.socket.on('user-left', (data) => {
                    console.log('User left event received:', data);
                    if (this.videoConference.handleUserLeft) {
                        this.videoConference.handleUserLeft(data);
                    }
                });
                this.videoConference.socket.on('chat-message', (data) => {
                    console.log('Chat message received:', data);
                    if (this.videoConference.handleChatMessage) {
                        this.videoConference.handleChatMessage(data);
                    }
                });
                this.videoConference.socket.on('media-toggle', (data) => {
                    console.log('Media toggle received:', data);
                    if (this.videoConference.handleMediaToggle) {
                        this.videoConference.handleMediaToggle(data);
                    }
                });
                this.videoConference.socket.on('offer', (data) => {
                    console.log('Offer received:', data);
                    if (this.videoConference.handleOffer) {
                        this.videoConference.handleOffer(data);
                    }
                });
                this.videoConference.socket.on('answer', (data) => {
                    console.log('Answer received:', data);
                    if (this.videoConference.handleAnswer) {
                        this.videoConference.handleAnswer(data);
                    }
                });
                this.videoConference.socket.on('ice-candidate', (data) => {
                    console.log('ICE candidate received:', data);
                    if (this.videoConference.handleIceCandidate) {
                        this.videoConference.handleIceCandidate(data);
                    }
                });
                console.log('=== SOCKET EVENT HANDLERS SETUP COMPLETE ===');
            } else {
                console.error('Socket not available for event handlers');
            }
        }, 1000);
    }
    setupUIHandlers() {
        console.log('=== SETUP UI HANDLERS START ===');
        const requiredElements = [
            'mic-btn', 'video-btn', 'screen-btn', 'record-btn',
            'floating-chat-btn', 'close-chat', 'participants-btn', 
            'close-participants', 'settings-btn', 'leave-btn', 
            'chat-input', 'send-chat'
        ];
        const optionalElements = ['close-settings', 'chat-badge'];
        const missingElements = [];
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingElements.push(id);
            } else {
                console.log(`Element found: ${id}`);
            }
        });
        const missingOptionalElements = [];
        optionalElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingOptionalElements.push(id);
                console.log(`Optional element missing: ${id}`);
            } else {
                console.log(`Optional element found: ${id}`);
            }
        });
        if (missingElements.length > 0) {
            console.error('Missing required DOM elements:', missingElements);
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
        if (missingOptionalElements.length > 0) {
            console.warn('Some optional elements are missing:', missingOptionalElements);
        }
        this.setupEventListeners();
        console.log('=== SETUP UI HANDLERS COMPLETE ===');
    }
    setupEventListeners() {
        document.getElementById('mic-btn').addEventListener('click', () => {
            if (this.videoConference) {
                this.videoConference.toggleMicrophone();
            }
        });
        document.getElementById('video-btn').addEventListener('click', () => {
            if (this.videoConference) {
                this.videoConference.toggleVideo();
            }
        });
        document.getElementById('screen-btn').addEventListener('click', () => {
            if (this.videoConference) {
                this.videoConference.toggleScreenShare();
            }
        });
        document.getElementById('record-btn').addEventListener('click', () => {
            if (this.videoConference) {
                this.videoConference.toggleRecording();
            }
        });
        document.getElementById('leave-btn').addEventListener('click', () => {
            this.leaveMeeting();
        });
        this.setupChatHandlers();
        this.setupParticipantsHandlers();
        this.setupSettingsHandlers();
    }
    setupChatHandlers() {
        const chatBtn = document.getElementById('floating-chat-btn');
        const closeChat = document.getElementById('close-chat');
        const chatPanel = document.getElementById('chat-panel');
        const chatInput = document.getElementById('chat-input');
        const sendChat = document.getElementById('send-chat');
        chatBtn.addEventListener('click', () => {
            chatPanel.classList.add('show');
            chatBtn.style.display = 'none';
        });
        closeChat.addEventListener('click', () => {
            chatPanel.classList.remove('show');
            chatBtn.style.display = 'flex';
        });
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message && this.videoConference) {
                this.videoConference.sendChatMessage(message);
                chatInput.value = '';
            }
        };
        sendChat.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    setupParticipantsHandlers() {
        const participantsBtn = document.getElementById('participants-btn');
        const closeParticipants = document.getElementById('close-participants');
        const participantsPanel = document.getElementById('participants-panel');
        participantsBtn.addEventListener('click', () => {
            participantsPanel.classList.add('show');
            participantsBtn.style.display = 'none';
        });
        closeParticipants.addEventListener('click', () => {
            participantsPanel.classList.remove('show');
            participantsBtn.style.display = 'flex';
        });
    }
    setupSettingsHandlers() {
        const settingsBtn = document.getElementById('settings-btn');
        const closeSettings = document.getElementById('close-settings');
        const settingsModal = document.getElementById('settings-modal');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.classList.add('show');
                }
            });
        }
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.classList.remove('show');
                }
            });
        }
    }
    initializeTranslator() {
        setTimeout(() => {
            if (window.Translator) {
                this.translator = new Translator();
                console.log('Translator initialized');
            }
        }, 2000);
    }
    leaveMeeting() {
        if (confirm('Are you sure you want to leave the meeting?')) {
            this.stopTimer();
            if (this.videoConference) {
                this.videoConference.disconnect();
            }
            window.location.href = '/dashboard.html';
        }
    }
    toggleZenMode() {
        console.log('=== TOGGLE ZEN MODE ===');
        console.log('Current zen mode state:', this.zenModeActive);
        if (!this.zenModeActive) {
            this.activateZenMode();
        } else {
            this.deactivateZenMode();
        }
    }
    activateZenMode() {
        console.log('=== ACTIVATING ZEN MODE ===');
        if (this.videoConference && this.videoConference.localStream) {
            const audioTrack = this.videoConference.localStream.getAudioTracks()[0];
            const videoTrack = this.videoConference.localStream.getVideoTracks()[0];
            if (audioTrack) {
                this.originalAudioConstraints = audioTrack.getConstraints();
            }
            if (videoTrack) {
                this.originalVideoConstraints = videoTrack.getConstraints();
            }
        }
        if (this.videoConference && this.videoConference.toggleNoiseCancellation) {
            this.videoConference.toggleNoiseCancellation();
        }
        const zenModeBtn = document.getElementById('zen-mode-btn');
        const zenModeIndicator = document.getElementById('zen-mode-indicator');
        const zenModeIcon = document.getElementById('zen-mode-icon');
        if (zenModeBtn) {
            zenModeBtn.classList.add('active');
        }
        if (zenModeIndicator) {
            zenModeIndicator.classList.add('active');
        }
        if (zenModeIcon) {
            zenModeIcon.className = 'fas fa-spa';
        }
        document.body.classList.add('zen-mode-active');
        this.zenModeActive = true;
        this.showZenNotification('🎙️ AI-Powered Noise Cancellation Activated - Background noise reduced');
    }
    deactivateZenMode() {
        console.log('=== DEACTIVATING ZEN MODE ===');
        if (this.videoConference && this.videoConference.toggleNoiseCancellation) {
            this.videoConference.toggleNoiseCancellation();
        }
        const zenModeBtn = document.getElementById('zen-mode-btn');
        const zenModeIndicator = document.getElementById('zen-mode-indicator');
        const zenModeIcon = document.getElementById('zen-mode-icon');
        if (zenModeBtn) {
            zenModeBtn.classList.remove('active');
        }
        if (zenModeIndicator) {
            zenModeIndicator.classList.remove('active');
        }
        if (zenModeIcon) {
            zenModeIcon.className = 'fas fa-spa';
        }
        document.body.classList.remove('zen-mode-active');
        this.zenModeActive = false;
        this.showZenNotification('🔇 AI-Powered Noise Cancellation Deactivated');
    }
    showZenNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'zen-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.showMediaPreview(file);
        this.uploadFile(file);
    }
    showMediaPreview(file) {
        const previewContainer = document.getElementById('media-preview');
        const previewContent = document.getElementById('preview-content');
        if (!previewContainer || !previewContent) return;
        previewContent.innerHTML = '';
        if (file.type.startsWith('image/')) {
            this.mediaPreviewUrl = URL.createObjectURL(file);
            const img = document.createElement('img');
            img.src = this.mediaPreviewUrl;
            previewContent.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            this.mediaPreviewUrl = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.src = this.mediaPreviewUrl;
            video.controls = true;
            previewContent.appendChild(video);
        } else if (file.type.startsWith('audio/')) {
            this.mediaPreviewUrl = URL.createObjectURL(file);
            const audio = document.createElement('audio');
            audio.src = this.mediaPreviewUrl;
            audio.controls = true;
            previewContent.appendChild(audio);
        } else {
            const fileIcon = this.getFileIcon(file.type);
            previewContent.innerHTML = `
                <div class="file-info">
                    <i class="${fileIcon}" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            `;
        }
        previewContainer.style.display = 'block';
    }
    uploadFile(file) {
        const formData = new FormData();
        formData.append('media', file);
        this.uploadIndicator = document.createElement('div');
        this.uploadIndicator.className = 'upload-indicator';
        this.uploadIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        document.querySelector('.chat-input-container').appendChild(this.uploadIndicator);
        const token = localStorage.getItem('token') || 
                     (JSON.parse(localStorage.getItem('authSession') || '{}')?.token);
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        fetch('/api/meeting/upload-media', {
            method: 'POST',
            headers: headers,
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (this.videoConference) {
                    this.videoConference.sendChatMessage('', data.mediaUrl, file.type, file.name, file.size);
                }
            } else {
                alert('Upload failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
        })
        .finally(() => {
            if (this.uploadIndicator && this.uploadIndicator.parentNode) {
                this.uploadIndicator.parentNode.removeChild(this.uploadIndicator);
            }
        });
    }
    getFileIcon(fileType) {
        if (fileType.includes('pdf')) return 'fas fa-file-pdf';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fas fa-file-excel';
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fas fa-file-powerpoint';
        if (fileType.includes('text')) return 'fas fa-file-alt';
        if (fileType.includes('zip') || fileType.includes('rar')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    removeMediaPreview() {
        const previewContainer = document.getElementById('media-preview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        if (this.mediaPreviewUrl) {
            URL.revokeObjectURL(this.mediaPreviewUrl);
            this.mediaPreviewUrl = null;
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM LOADED - INITIALIZING MEETING ===');
    const meetingManager = new MeetingManager();
    window.meetingManager = meetingManager;
    meetingManager.initialize()
        .then(() => {
            console.log('=== MEETING INITIALIZED SUCCESSFULLY ===');
        })
        .catch(error => {
            console.error('=== MEETING INITIALIZATION FAILED ===', error);
        });
    setTimeout(() => {
        if (window.BeRightBack) {
            window.beRightBack = new BeRightBack();
            console.log('Be Right Back feature initialized');
        }
    }, 3000);
});
window.toggleZenMode = function() {
    if (window.meetingManager) {
        window.meetingManager.toggleZenMode();
    }
};
window.toggleProximityDetection = function() {
    if (window.meetingManager && window.meetingManager.videoConference) {
        window.meetingManager.videoConference.toggleProximityDetection();
    }
};
window.toggleTranslation = function() {
    if (window.meetingManager && window.meetingManager.translator) {
        window.meetingManager.translator.toggle();
    }
};
window.handleFileUpload = function(event) {
    if (window.meetingManager) {
        window.meetingManager.handleFileUpload(event);
    }
};
window.removeMediaPreview = function() {
    if (window.meetingManager) {
        window.meetingManager.removeMediaPreview();
    }
};
window.toggleLowLightMode = function() {
    if (window.meetingManager) {
        window.meetingManager.toggleLowLightMode();
    }
};
