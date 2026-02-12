class MeetingManager {
    constructor() {
        this.meetings = [];
        this.upcomingMeetings = [];
        this.pastMeetings = [];
        this.initializeMeetings();
    }
    initializeMeetings() {
        const storedMeetings = localStorage.getItem('zenMeetings');
        if (storedMeetings) {
            this.meetings = JSON.parse(storedMeetings);
            this.categorizeMeetings();
        } else {
            this.fetchUserMeetings();
        }
    }
    async fetchUserMeetings() {
        try {
            const userData = await this.getCurrentUserData();
            if (userData && userData.meetings && userData.meetings.length > 0) {
                this.meetings = userData.meetings;
                this.categorizeMeetings();
                this.saveMeetings();
                console.log('Loaded user meetings from profile:', userData.meetings.length, 'meetings');
            } else {
                console.log('No meetings found in user profile, using sample data');
                this.initializeSampleMeetings();
            }
        } catch (error) {
            console.error('Error fetching user meetings:', error);
            this.initializeSampleMeetings();
        }
    }
    async getCurrentUserData() {
        try {
            if (window.currentUser) {
                return window.currentUser;
            }
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                return JSON.parse(userData);
            }
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                window.currentUser = userData;
                localStorage.setItem('currentUser', JSON.stringify(userData));
                return userData;
            }
            return null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }
    initializeSampleMeetings() {
        const now = new Date();
        const sampleMeetings = [
            {
                id: 'zen_' + Date.now(),
                topic: 'Weekly Team Standup',
                date: new Date(now.getTime() - 86400000).toISOString().split('T')[0], 
                time: '10:00 AM',
                duration: '30 min',
                participants: ['John Doe', 'Sarah Smith', 'Mike Johnson'],
                type: 'completed',
                summary: 'Discussed Q1 goals and assigned tasks for the week'
            },
            {
                id: 'zen_' + Date.now() + 1,
                topic: 'Product Review Meeting',
                date: new Date(now.getTime() - 172800000).toISOString().split('T')[0], 
                time: '2:00 PM',
                duration: '1 hour',
                participants: ['Alice Brown', 'Bob Wilson', 'Carol Davis'],
                type: 'completed',
                summary: 'Reviewed product features and decided on Q2 roadmap'
            },
            {
                id: 'zen_' + Date.now() + 2,
                topic: 'Client Presentation',
                date: new Date(now.getTime() + 86400000).toISOString().split('T')[0], 
                time: '3:00 PM',
                duration: '45 min',
                participants: ['You', 'Client Team'],
                type: 'upcoming',
                summary: 'Q1 results presentation to key stakeholders'
            },
            {
                id: 'zen_' + Date.now() + 3,
                topic: 'Sprint Planning',
                date: new Date(now.getTime() + 172800000).toISOString().split('T')[0], 
                time: '11:00 AM',
                duration: '2 hours',
                participants: ['Dev Team', 'Product Manager', 'Designer'],
                type: 'upcoming',
                summary: 'Plan sprint tasks and timeline for next iteration'
            }
        ];
        this.meetings = sampleMeetings;
        this.categorizeMeetings();
        this.saveMeetings();
    }
    categorizeMeetings() {
        const now = new Date();
        this.pastMeetings = this.meetings.filter(meeting => {
            const meetingDateTime = new Date(meeting.date + ' ' + meeting.time);
            return meetingDateTime < now;
        });
        this.upcomingMeetings = this.meetings.filter(meeting => {
            const meetingDateTime = new Date(meeting.date + ' ' + meeting.time);
            return meetingDateTime >= now;
        }).sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    }
    addMeeting(meeting) {
        const newMeeting = {
            id: 'zen_' + Date.now(),
            ...meeting,
            type: 'upcoming'
        };
        this.meetings.unshift(newMeeting);
        this.categorizeMeetings();
        this.saveMeetings();
        this.updateDashboard();
        console.log('Meeting added:', newMeeting);
        return newMeeting;
    }
    updateMeeting(meetingId, updates) {
        const index = this.meetings.findIndex(m => m.id === meetingId);
        if (index !== -1) {
            this.meetings[index] = { ...this.meetings[index], ...updates };
            this.categorizeMeetings();
            this.saveMeetings();
            this.updateDashboard();
            console.log('Meeting updated:', this.meetings[index]);
        }
    }
    markMeetingCompleted(meetingId) {
        const index = this.meetings.findIndex(m => m.id === meetingId);
        if (index !== -1) {
            this.meetings[index].type = 'completed';
            this.categorizeMeetings();
            this.saveMeetings();
            this.updateDashboard();
            console.log('Meeting marked as completed:', this.meetings[index]);
        }
    }
    deleteMeeting(meetingId) {
        this.meetings = this.meetings.filter(m => m.id !== meetingId);
        this.categorizeMeetings();
        this.saveMeetings();
        this.updateDashboard();
        console.log('Meeting deleted:', meetingId);
    }
    saveMeetings() {
        localStorage.setItem('zenMeetings', JSON.stringify(this.meetings));
    }
    updateDashboard() {
        this.updateRecentMeetings();
        this.updateUpcomingMeetings();
    }
    updateRecentMeetings() {
        const recentContainer = document.getElementById('recent-meetings');
        if (!recentContainer) return;
        if (this.pastMeetings.length === 0) {
            recentContainer.innerHTML = '<p class="text-center" style="font-weight: 600;">No recent meetings found</p>';
            return;
        }
        const recentHTML = this.pastMeetings.slice(0, 5).map(meeting => `
            <div class="meeting-item ${meeting.type}" style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid ${meeting.type === 'completed' ? '#4CAF50' : '#FF9800'};">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="text-white mb-1" style="font-size: 14px; font-weight: 600;">${meeting.topic}</h6>
                        <div class="text-white-50" style="font-size: 12px;">
                            <i class="fas fa-calendar-alt mr-1"></i>${meeting.date}
                            <i class="fas fa-clock ml-2 mr-1"></i>${meeting.time}
                            <i class="fas fa-hourglass-half ml-2 mr-1"></i>${meeting.duration}
                        </div>
                        <div class="text-white" style="font-size: 11px; margin-top: 5px;">
                            <i class="fas fa-users mr-1"></i>${meeting.participants.length} participants
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="badge ${meeting.type === 'completed' ? 'badge-success' : 'badge-warning'}" style="font-size: 10px; padding: 4px 8px; border-radius: 12px;">
                            ${meeting.type === 'completed' ? 'Completed' : 'Missed'}
                        </span>
                    </div>
                </div>
                ${meeting.summary ? `
                    <div class="mt-2 text-white-50" style="font-size: 11px; font-style: italic; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                        <i class="fas fa-sticky-note mr-1"></i>${meeting.summary}
                    </div>
                ` : ''}
            </div>
        `).join('');
        recentContainer.innerHTML = recentHTML;
    }
    updateUpcomingMeetings() {
        const upcomingContainer = document.getElementById('upcoming-meetings');
        if (!upcomingContainer) return;
        if (this.upcomingMeetings.length === 0) {
            upcomingContainer.innerHTML = '<p class="text-center" style="font-weight: 600;">No upcoming meetings scheduled</p>';
            return;
        }
        const upcomingHTML = this.upcomingMeetings.slice(0, 3).map(meeting => `
            <div class="upcoming-meeting" style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.2) 100%); border-radius: 12px; padding: 20px; margin-bottom: 15px; border: 1px solid rgba(76, 175, 80, 0.3);">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h6 class="text-white mb-1" style="font-size: 16px; font-weight: 600;">
                            <i class="fas fa-calendar-check mr-2"></i>${meeting.topic}
                        </h6>
                        <div class="text-white" style="font-size: 13px;">
                            <i class="fas fa-calendar-day mr-2"></i>${meeting.date}
                            <i class="fas fa-clock ml-2 mr-1"></i>${meeting.time}
                            <i class="fas fa-hourglass-half ml-2 mr-1"></i>${meeting.duration}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-success" onclick="meetingManager.markMeetingCompleted('${meeting.id}')" style="font-size: 11px;">
                            <i class="fas fa-check"></i> Complete
                        </button>
                        <button class="btn btn-sm btn-outline-light ml-2" onclick="meetingManager.deleteMeeting('${meeting.id}')" style="font-size: 11px;">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <div class="text-white" style="font-size: 12px;">
                    <i class="fas fa-users mr-2"></i>${meeting.participants.join(', ')}
                </div>
                ${meeting.summary ? `
                    <div class="mt-3 text-white-50" style="font-size: 11px; font-style: italic; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <i class="fas fa-sticky-note mr-1"></i>${meeting.summary}
                    </div>
                ` : ''}
            </div>
        `).join('');
        upcomingContainer.innerHTML = upcomingHTML;
    }
    getMeetingStats() {
        const total = this.meetings.length;
        const completed = this.pastMeetings.length;
        const upcoming = this.upcomingMeetings.length;
        const thisWeek = this.meetings.filter(m => {
            const meetingDate = new Date(m.date);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return meetingDate >= weekAgo;
        }).length;
        return { total, completed, upcoming, thisWeek };
    }
}
window.MeetingManager = MeetingManager;
