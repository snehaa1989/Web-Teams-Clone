class JoinZenManager {
    constructor() {
        this.sessionData = null;
        this.parsedSession = null;
    }
    initialize() {
        console.log('=== JOIN ZEN INITIALIZATION START ===');
        this.checkAuthentication();
        this.displayUserInfo();
        this.getZenIdFromUrl();
        this.setupFormHandlers();
        console.log('=== JOIN ZEN INITIALIZATION COMPLETE ===');
    }
    checkAuthentication() {
        const sessionData = localStorage.getItem('authSession');
        if (!sessionData) {
            window.location.href = '/';
            return;
        }
        try {
            this.parsedSession = JSON.parse(sessionData);
            const sessionStart = new Date(this.parsedSession.sessionStart);
            const lastActivity = new Date(this.parsedSession.lastActivity);
            const now = new Date();
            const sessionAge = now - sessionStart;
            const maxSessionAge = 24 * 60 * 60 * 1000; 
            const inactivityTime = now - lastActivity;
            const maxInactivity = 10 * 60 * 1000; 
            if (sessionAge > maxSessionAge || inactivityTime > maxInactivity || !this.parsedSession.token || !this.parsedSession.user) {
                localStorage.removeItem('authSession');
                window.location.href = '/';
                return;
            }
            console.log('Session valid:', this.parsedSession.user.username);
        } catch (error) {
            console.error('Error parsing session:', error);
            localStorage.removeItem('authSession');
            window.location.href = '/';
        }
    }
    displayUserInfo() {
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        if (userInfo && userName && userEmail) {
            const sessionData = localStorage.getItem('authSession');
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData);
                    if (parsed.user) {
                        userName.textContent = parsed.user.username || 'User';
                        userEmail.textContent = parsed.user.email || 'user@example.com';
                    }
                } catch (error) {
                    console.error('Error displaying user info:', error);
                }
            }
        }
    }
    getZenIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const zenId = urlParams.get('zen');
        if (zenId) {
            document.getElementById('zen-id').value = zenId;
            this.fetchMeetingDetails(zenId);
        }
    }
    setupFormHandlers() {
        const joinForm = document.getElementById('join-form');
        const joinBtn = document.getElementById('join-zen-btn');
        if (joinForm) {
            joinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
        this.setupLogoutHandler();
    }
    async handleFormSubmit() {
        const zenIdInput = document.getElementById('zen-id').value.trim();
        const usernameInput = document.getElementById('username').value.trim();
        if (!zenIdInput || !usernameInput) {
            this.showError('Please enter both Zen ID and your name');
            return;
        }
        try {
            const meetingUrl = `/meeting.html?zen=${encodeURIComponent(zenIdInput)}&username=${encodeURIComponent(usernameInput)}`;
            window.location.href = meetingUrl;
        } catch (error) {
            console.error('Error joining meeting:', error);
            this.showError('Failed to join meeting. Please try again.');
        }
    }
    async fetchMeetingDetails(zenId) {
        try {
            const response = await fetch(`/api/zen/meeting/${zenId}`);
            if (response.ok) {
                const meeting = await response.json();
                this.displayMeetingInfo(meeting);
            }
        } catch (error) {
            console.error('Error fetching meeting details:', error);
        }
    }
    displayMeetingInfo(meeting) {
        const meetingInfo = document.getElementById('meeting-info');
        const meetingDetails = document.getElementById('meeting-details');
        if (meeting.success && meeting.data) {
            const data = meeting.data;
            meetingDetails.innerHTML = `
                <div class="mb-2"><strong>📅 Date:</strong> ${data.date || 'TBD'}</div>
                <div class="mb-2"><strong>⏰ Time:</strong> ${data.time || 'TBD'}</div>
                <div class="mb-2"><strong>👤 Host:</strong> ${data.host || 'TBD'}</div>
                <div class="mb-2"><strong>📝 Description:</strong> ${data.description || 'No description'}</div>
            `;
            meetingInfo.style.display = 'block';
        } else {
            meetingDetails.innerHTML = '<div class="text-warning">Meeting not found or access denied</div>';
            meetingInfo.style.display = 'block';
        }
    }
    showError(message) {
        const errorContainer = document.getElementById('error-container');
        errorContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle mr-2"></i>${message}
            </div>
        `;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    localStorage.removeItem('authSession');
                    window.location.href = '/';
                }
            });
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const joinZenManager = new JoinZenManager();
    joinZenManager.initialize();
});
