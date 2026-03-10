class DashboardManager {
    constructor() {
        this.sessionData = null;
        this.parsedSession = null;
        this.invitedParticipants = [];
        this.meetingManager = null;
    }
    initialize() {
        console.log('=== DASHBOARD INITIALIZATION START ===');
        this.checkAuthentication();
        this.displayUserInfo();
        this.setupEventHandlers();
        this.loadScheduledZens();
        this.setupEventListeners();
        console.log('=== DASHBOARD INITIALIZATION COMPLETE ===');
    }
    setupEventListeners() {
        const scheduleZenBtn = document.getElementById('scheduleZenBtn');
        if (scheduleZenBtn) {
            scheduleZenBtn.addEventListener('click', () => this.scheduleZen());
        }
        const addInvitesBtn = document.getElementById('addInvitesBtn');
        if (addInvitesBtn) {
            addInvitesBtn.addEventListener('click', () => this.addInvites());
        }
    }
    checkAuthentication() {
        const sessionData = localStorage.getItem('authSession');
        console.log('Dashboard checking auth session:', sessionData);
        if (!sessionData) {
            console.log('No session data found, redirecting to login');
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
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Session expired due to inactivity. Please login again.');
                window.location.href = '/';
                return;
            }
        } catch (error) {
            console.error('Error parsing session data:', error);
            localStorage.removeItem('authSession');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
            return;
        }
        document.getElementById('meeting-dashboard').style.display = 'block';
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
                        userInfo.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                }
            }
        }
    }
    setupEventHandlers() {
        this.setupKeyboardShortcuts();
        this.setupBrowserNavigation();
        this.setupLogoutHandler();
        this.setupMeetingHandlers();
    }
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn && !logoutBtn.disabled) {
                    logoutBtn.click();
                }
            }
        });
    }
    setupBrowserNavigation() {
        window.addEventListener('popstate', (e) => {
            e.preventDefault();
            this.backToDashboard();
        });
        if (window.history.state === null) {
            window.history.pushState({dashboard: true}, '', window.location.href);
        }
    }
    backToDashboard() {
        document.getElementById('username-set').style.display = 'none';
        document.getElementById('meeting-dashboard').style.display = 'block';
        window.history.pushState({dashboard: true}, '', window.location.href);
    }
    setupLogoutHandler() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    this.cleanupMeeting();
                    localStorage.clear();
                    sessionStorage.clear();
                    logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
                    logoutBtn.disabled = true;
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                }
            });
        }
    }
    setupMeetingHandlers() {
        const startMeetingBtn = document.getElementById('start-meeting-btn');
        if (startMeetingBtn) {
            startMeetingBtn.addEventListener('click', () => {
                document.getElementById('room-create').hidden = false;
                document.querySelector('.container-fluid.mt-5').style.display = 'none';
            });
        }
        const joinMeetingBtn = document.getElementById('join-meeting-btn');
        if (joinMeetingBtn) {
            joinMeetingBtn.addEventListener('click', () => {
                document.getElementById('username-set').hidden = false;
                document.querySelector('.container-fluid.mt-5').style.display = 'none';
            });
        }
    }
    cleanupMeeting() {
        const localVideo = document.getElementById('local');
        if (localVideo && localVideo.srcObject) {
            const stream = localVideo.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            localVideo.srcObject = null;
        }
        const remoteVideos = document.querySelectorAll('#videos video');
        remoteVideos.forEach(video => {
            if (video.srcObject) {
                const stream = video.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach(track => track.stop());
                video.srcObject = null;
            }
        });
        if (window.socket) {
            window.socket.disconnect();
            window.socket = null;
        }
        localStorage.clear();
        sessionStorage.clear();
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
    }
    openScheduleModal() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('zenDate').min = today;
        document.getElementById('scheduleZenForm').reset();
        this.invitedParticipants = [];
        this.updateInvitedList();
        $('#scheduleZenModal').modal('show');
    }
    addInvites() {
        const input = document.getElementById('inviteParticipants');
        const participants = input.value.split(',').map(p => p.trim()).filter(p => p);
        participants.forEach(participant => {
            if (!this.invitedParticipants.includes(participant)) {
                this.invitedParticipants.push(participant);
            }
        });
        input.value = '';
        this.updateInvitedList();
    }
    updateInvitedList() {
        const listContainer = document.getElementById('invitedList');
        if (this.invitedParticipants.length === 0) {
            listContainer.innerHTML = '';
            return;
        }
        const listHTML = this.invitedParticipants.map((participant, index) => `
            <span class="badge badge-info mr-2 mb-2">
                ${participant}
                <button type="button" class="ml-1 btn btn-sm btn-outline-light" onclick="dashboardManager.removeParticipant(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
        listContainer.innerHTML = listHTML;
    }
    removeParticipant(index) {
        this.invitedParticipants.splice(index, 1);
        this.updateInvitedList();
    }
    async scheduleZen() {
        const topic = document.getElementById('zenTopic').value;
        const duration = document.getElementById('zenDuration').value;
        const date = document.getElementById('zenDate').value;
        const time = document.getElementById('zenTime').value;
        const description = document.getElementById('zenDescription').value;
        if (!topic || !date || !time) {
            alert('Please fill in all required fields');
            return;
        }
        const sessionData = localStorage.getItem('authSession');
        if (!sessionData) {
            alert('Please login to schedule a zen');
            return;
        }
        const parsed = JSON.parse(sessionData);
        const zenData = {
            topic,
            duration,
            date,
            time,
            description,
            host: parsed.user,
            participants: this.invitedParticipants,
            createdAt: new Date().toISOString()
        };
        try {
            const response = await fetch('/api/zen/schedule', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${parsed.token}`
                },
                body: JSON.stringify(zenData)
            });
            const result = await response.json();
            if (result.success) {
                alert('Zen scheduled successfully!');
                $('#scheduleZenModal').modal('hide');
                this.loadScheduledZens();
                if (this.invitedParticipants.length > 0) {
                    this.sendEmailInvitations(result.zenId, zenData);
                }
            } else {
                alert('Failed to schedule zen: ' + result.message);
            }
        } catch (error) {
            console.error('Error scheduling zen:', error);
            alert('Error scheduling zen. Please try again.');
        }
    }
    async sendEmailInvitations(zenId, zenData) {
        try {
            const response = await fetch('/api/zen/send-invites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    zenId,
                    zenData,
                    participants: this.invitedParticipants
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log('Invitations sent successfully');
            }
        } catch (error) {
            console.error('Error sending invitations:', error);
        }
    }
    async loadScheduledZens() {
        try {
            console.log('Loading scheduled zens...');
            const sessionData = localStorage.getItem('authSession');
            if (!sessionData) {
                console.log('No auth session found');
                return;
            }
            const parsed = JSON.parse(sessionData);
            const response = await fetch('/api/zen/my-scheduled', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${parsed.token}`
                }
            });
            const result = await response.json();
            if (result.success) {
                this.displayScheduledZens(result.zens);
                console.log(`Loaded ${result.zens.length} scheduled zens`);
            } else {
                console.error('Failed to load scheduled zens:', result.message);
            }
        } catch (error) {
            console.error('Error loading scheduled zens:', error);
        }
    }
    displayScheduledZens(zens) {
        const scheduledZensList = document.getElementById('scheduled-zens-list');
        if (!scheduledZensList) {
            console.log('Scheduled zens list container not found');
            return;
        }
        scheduledZensList.innerHTML = '';
        if (zens.length === 0) {
            scheduledZensList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-calendar-times fa-3x mb-3"></i>
                    <p>No scheduled meetings yet.</p>
                    <button class="btn btn-primary" onclick="dashboardManager.openScheduleModal()">
                        <i class="fas fa-plus mr-2"></i>Schedule Your First Meeting
                    </button>
                </div>
            `;
            return;
        }
        const groupedZens = {};
        zens.forEach(zen => {
            const date = zen.date || 'No Date Set';
            if (!groupedZens[date]) {
                groupedZens[date] = [];
            }
            groupedZens[date].push(zen);
        });
        Object.keys(groupedZens).sort().forEach(date => {
            const dateSection = document.createElement('div');
            dateSection.className = 'mb-4';
            const dateHeader = document.createElement('h5');
            dateHeader.className = 'mb-3 text-primary';
            dateHeader.innerHTML = `<i class="fas fa-calendar-day mr-2"></i>${date}`;
            dateSection.appendChild(dateHeader);
            groupedZens[date].forEach(zen => {
                const zenCard = this.createZenCard(zen);
                dateSection.appendChild(zenCard);
            });
            scheduledZensList.appendChild(dateSection);
        });
    }
    createZenCard(zen) {
        const card = document.createElement('div');
        card.className = 'card mb-3 zen-card';
        card.style.cssText = 'border-left: 4px solid var(--sea-blue);';
        const isHost = zen.host && zen.host.id && localStorage.getItem('authSession') && 
                              JSON.parse(localStorage.getItem('authSession')).userId === zen.host.id;
        const statusColor = zen.status === 'scheduled' ? 'warning' : 
                                  zen.status === 'active' ? 'success' : 'secondary';
        card.innerHTML = `
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h6 class="card-title mb-1">
                            <i class="fas fa-video mr-2"></i>${zen.topic || 'Untitled Meeting'}
                        </h6>
                        <p class="card-text text-muted mb-2">
                            <small>
                                <i class="fas fa-clock mr-1"></i>${zen.time || 'No Time Set'} 
                                <span class="mx-2">•</span>
                                <i class="fas fa-hourglass-half mr-1"></i>${zen.duration || 60} minutes
                            </small>
                        </p>
                        <div class="d-flex align-items-center text-muted small">
                            <i class="fas fa-user mr-2"></i>
                            <span>Host: ${zen.host ? zen.host.username : 'Unknown'}</span>
                            ${zen.participants && zen.participants.length > 0 ? 
                                `<span class="mx-2">•</span>
                                 <i class="fas fa-users mr-1"></i>
                                 <span>${zen.participants.length} invited</span>` : ''}
                        </div>
                    </div>
                    <div class="col-md-4 text-right">
                        <span class="badge badge-${statusColor} mb-2">
                            ${zen.status || 'scheduled'}
                        </span>
                        <div class="btn-group-vertical" role="group">
                            <a href="${zen.meetingLink}" class="btn btn-primary btn-sm mb-1">
                                <i class="fas fa-sign-in-alt mr-1"></i>Join
                            </a>
                            ${isHost ? `
                                <button class="btn btn-outline-info btn-sm mb-1" onclick="dashboardManager.sendEmailInvitations('${zen.zenId}', ${JSON.stringify(zen).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-envelope mr-1"></i>Invite
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="dashboardManager.copyMeetingLink('${zen.meetingLink}')">
                                    <i class="fas fa-copy mr-1"></i>Copy Link
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        return card;
    }
    copyMeetingLink(link) {
        navigator.clipboard.writeText(link).then(() => {
            alert('Meeting link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy link:', err);
            alert('Failed to copy link. Please copy manually: ' + link);
        });
    }
}
window.openScheduleModal = function() {
    if (window.dashboardManager) {
        window.dashboardManager.openScheduleModal();
    }
};
window.DashboardManager = DashboardManager;
window.dashboardManager = new DashboardManager();
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager.initialize();
});
