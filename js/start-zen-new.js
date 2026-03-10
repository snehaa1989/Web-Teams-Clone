class StartZenManager {
    constructor() {
        this.meetingData = null;
    }
    initialize() {
        console.log('=== START ZEN INITIALIZATION START ===');
        this.setupEventHandlers();
        console.log('=== START ZEN INITIALIZATION COMPLETE ===');
    }
    setupEventHandlers() {
        const startMeetingForm = document.getElementById('startMeetingForm');
        if (startMeetingForm) {
            startMeetingForm.addEventListener('submit', (e) => this.handleStartMeeting(e));
        }
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        const joinMeetingBtn = document.getElementById('joinMeetingBtn');
        if (joinMeetingBtn) {
            joinMeetingBtn.addEventListener('click', () => this.handleJoinMeeting());
        }
    }
    async handleStartMeeting(e) {
        e.preventDefault();
        const topic = document.getElementById('meetingTopic').value.trim();
        if (!topic) {
            alert('Please enter a meeting topic');
            return;
        }
        const sessionData = localStorage.getItem('authSession');
        const parsed = JSON.parse(sessionData);
        const meetingId = this.generateMeetingId();
        const meetingLink = `${window.location.origin}/meeting.html?room=${meetingId}`;
        try {
            const response = await fetch('/api/zen/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${parsed.token}`
                },
                body: JSON.stringify({
                    title: topic,
                    description: `Meeting created by ${parsed.user.username}`,
                    settings: {
                        host: parsed.user,
                        topic: topic
                    }
                })
            });
            const result = await response.json();
            if (result.success) {
                this.meetingData = {
                    id: meetingId,
                    link: meetingLink,
                    topic: topic,
                    host: parsed.user
                };
                this.showMeetingReady();
            } else {
                alert('Failed to create meeting: ' + result.message);
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Error creating meeting. Please try again.');
        }
    }
    generateMeetingId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        result += '-';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    handleJoinMeeting() {
        const meetingLink = document.getElementById('meetingLink');
        if (meetingLink) {
            window.location.href = meetingLink.value;
        }
    }
    showMeetingReady() {
        if (!this.meetingData) return;
        const formContainer = document.querySelector('.meeting-container');
        const meetingReadyDisplay = document.getElementById('meetingReady');
        if (formContainer) {
            formContainer.style.display = 'none';
        }
        if (meetingReadyDisplay) {
            meetingReadyDisplay.style.display = 'block';
        }
        const meetingLinkInput = document.getElementById('meetingLink');
        if (meetingLinkInput) {
            meetingLinkInput.value = this.meetingData.link;
        }
    }
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    }
}
window.backToDashboard = function() {
    window.location.href = '/dashboard.html';
};
window.handleLogout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    }
};
window.copyMeetingLink = function() {
    const meetingLink = document.getElementById('meetingLink');
    if (meetingLink) {
        meetingLink.select();
        document.execCommand('copy');
        const copyBtn = document.getElementById('copyLinkBtn');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const startZenManager = new StartZenManager();
    startZenManager.initialize();
});
