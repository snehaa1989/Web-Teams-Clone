class BeRightBack {
    constructor() {
        this.isActive = false;
        this.meetingSummary = [];
        this.startTime = null;
        this.summaryInterval = null;
        this.participantMessages = [];
        this.keyEvents = [];
        this.decisions = [];
        this.actionItems = [];
        this.summarySettings = {
            maxSummaryLength: 500,
            includeTimestamps: true,
            includeParticipants: true,
            includeDecisions: true,
            includeActionItems: true
        };
        this.initializeUI();
    }
    initializeUI() {
        const controlBar = document.querySelector('.control-bar');
        if (controlBar) {
            const brbButton = document.createElement('button');
            brbButton.id = 'brb-btn';
            brbButton.className = 'control-btn';
            brbButton.title = 'Be Right Back - Meeting Summary Mode';
            brbButton.innerHTML = '<i class="fas fa-mug-hot"></i><div class="brb-bubbles"><div class="bubble bubble-1"></div><div class="bubble bubble-2"></div><div class="bubble bubble-3"></div></div>';
            const leaveButton = document.getElementById('leave-btn');
            if (leaveButton) {
                controlBar.insertBefore(brbButton, leaveButton);
            } else {
                controlBar.appendChild(brbButton);
            }
            brbButton.addEventListener('click', () => this.toggleBRB());
        }
        this.createBRBStatus();
    }
    createBRBStatus() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'brb-status';
        statusDiv.className = 'brb-status';
        statusDiv.style.display = 'none';
        statusDiv.innerHTML = `
            <div class="brb-header">
                <i class="fas fa-coffee"></i>
                <span>Be Right Back Mode</span>
                <button class="brb-close" onclick="window.beRightBack.toggleBRB()">×</button>
            </div>
            <div class="brb-content">
                <div class="brb-timer">
                    <i class="fas fa-clock"></i>
                    <span id="brb-timer-text">00:00</span>
                </div>
                <div class="brb-summary">
                    <h4>Meeting Summary</h4>
                    <div id="brb-summary-content" class="summary-content">
                        <p class="summary-placeholder">Capturing meeting events...</p>
                    </div>
                </div>
                <div class="brb-actions">
                    <button class="brb-download-btn" onclick="window.beRightBack.downloadSummary()">
                        <i class="fas fa-download"></i> Download Summary
                    </button>
                    <button class="brb-share-btn" onclick="window.beRightBack.shareSummary()">
                        <i class="fas fa-share"></i> Share Summary
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(statusDiv);
    }
    toggleBRB() {
        if (this.isActive) {
            this.stopBRB();
        } else {
            this.startBRB();
        }
    }
    startBRB() {
        this.isActive = true;
        this.startTime = Date.now();
        this.meetingSummary = [];
        this.participantMessages = [];
        this.keyEvents = [];
        this.decisions = [];
        this.actionItems = [];
        const brbButton = document.getElementById('brb-btn');
        const brbStatus = document.getElementById('brb-status');
        if (brbButton) {
            brbButton.classList.add('active');
            brbButton.innerHTML = '<i class="fas fa-mug-hot"></i><div class="brb-bubbles"><div class="bubble bubble-1"></div><div class="bubble bubble-2"></div><div class="bubble bubble-3"></div></div>';
        }
        if (brbStatus) {
            brbStatus.style.display = 'block';
        }
        this.startMeetingMonitoring();
        this.startTimer();
        console.log('🟢 Be Right Back mode activated');
        this.addSummaryEvent('BRB Mode Started', 'User stepped away from meeting');
    }
    stopBRB() {
        this.isActive = false;
        if (this.summaryInterval) {
            clearInterval(this.summaryInterval);
        }
        const brbButton = document.getElementById('brb-btn');
        const brbStatus = document.getElementById('brb-status');
        if (brbButton) {
            brbButton.classList.remove('active');
            brbButton.innerHTML = '<i class="fas fa-mug-hot"></i><div class="brb-bubbles"><div class="bubble bubble-1"></div><div class="bubble bubble-2"></div><div class="bubble bubble-3"></div></div>';
        }
        if (brbStatus) {
            brbStatus.style.display = 'none';
        }
        this.generateFinalSummary();
        console.log('🔴 Be Right Back mode deactivated');
    }
    startMeetingMonitoring() {
        this.monitorChatMessages();
        this.monitorParticipants();
        this.monitorScreenSharing();
        this.summaryInterval = setInterval(() => {
            this.updateSummary();
        }, 30000);
        this.updateSummary();
    }
    monitorChatMessages() {
        const chatObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const messageElement = node.querySelector('.chat-message');
                        if (messageElement) {
                            const message = messageElement.textContent;
                            const sender = node.querySelector('.chat-sender')?.textContent || 'Unknown';
                            const timestamp = new Date().toLocaleTimeString();
                            this.participantMessages.push({
                                sender,
                                message,
                                timestamp
                            });
                            this.analyzeMessageForActions(message, sender);
                        }
                    }
                });
            });
        });
        const chatContainer = document.querySelector('#chat-messages');
        if (chatContainer) {
            chatObserver.observe(chatContainer, { childList: true, subtree: true });
        }
    }
    monitorParticipants() {
        const participantObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('participant')) {
                        const name = node.querySelector('.participant-name')?.textContent || 'Unknown';
                        this.addSummaryEvent('Participant Joined', `${name} joined the meeting`);
                    }
                });
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('participant')) {
                        const name = node.querySelector('.participant-name')?.textContent || 'Unknown';
                        this.addSummaryEvent('Participant Left', `${name} left the meeting`);
                    }
                });
            });
        });
        const participantsContainer = document.querySelector('#participants-list');
        if (participantsContainer) {
            participantObserver.observe(participantsContainer, { childList: true });
        }
    }
    monitorScreenSharing() {
        const screenShareObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('screen-share')) {
                        if (target.classList.contains('active')) {
                            this.addSummaryEvent('Screen Share Started', 'Someone started sharing their screen');
                        } else {
                            this.addSummaryEvent('Screen Share Stopped', 'Screen sharing ended');
                        }
                    }
                }
            });
        });
        document.querySelectorAll('.screen-share').forEach(element => {
            screenShareObserver.observe(element, { attributes: true });
        });
    }
    analyzeMessageForActions(message, sender) {
        const decisionKeywords = ['decided', 'agreed', 'confirmed', 'finalized', 'approved'];
        const actionKeywords = ['will', 'should', 'need to', 'going to', 'assigned', 'responsible'];
        if (decisionKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            this.decisions.push({
                message,
                sender,
                timestamp: new Date().toLocaleTimeString()
            });
        }
        if (actionKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
            this.actionItems.push({
                message,
                sender,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    }
    addSummaryEvent(type, description) {
        this.keyEvents.push({
            type,
            description,
            timestamp: new Date().toLocaleTimeString()
        });
    }
    startTimer() {
        const timerElement = document.getElementById('brb-timer-text');
        if (!timerElement) return;
        const updateTimer = () => {
            if (!this.isActive) return;
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        updateTimer();
        setInterval(updateTimer, 1000);
    }
    updateSummary() {
        const summaryContent = document.getElementById('brb-summary-content');
        if (!summaryContent) return;
        const summary = this.generateSummary();
        summaryContent.innerHTML = summary;
    }
    generateSummary() {
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        const duration = Math.floor(elapsed / 60000);
        let summary = `<div class="summary-section">
            <h5><i class="fas fa-clock"></i> Duration: ${duration} minutes</h5>
        </div>`;
        if (this.keyEvents.length > 0) {
            summary += `<div class="summary-section">
                <h5><i class="fas fa-list"></i> Key Events</h5>
                <ul>`;
            this.keyEvents.slice(-5).forEach(event => {
                summary += `<li><strong>${event.timestamp}:</strong> ${event.description}</li>`;
            });
            summary += `</ul></div>`;
        }
        if (this.participantMessages.length > 0) {
            summary += `<div class="summary-section">
                <h5><i class="fas fa-comments"></i> Recent Messages</h5>
                <ul>`;
            this.participantMessages.slice(-5).forEach(msg => {
                summary += `<li><strong>${msg.sender} (${msg.timestamp}):</strong> ${msg.message}</li>`;
            });
            summary += `</ul></div>`;
        }
        if (this.decisions.length > 0) {
            summary += `<div class="summary-section">
                <h5><i class="fas fa-check-circle"></i> Decisions Made</h5>
                <ul>`;
            this.decisions.slice(-3).forEach(decision => {
                summary += `<li><strong>${decision.sender}:</strong> ${decision.message}</li>`;
            });
            summary += `</ul></div>`;
        }
        if (this.actionItems.length > 0) {
            summary += `<div class="summary-section">
                <h5><i class="fas fa-tasks"></i> Action Items</h5>
                <ul>`;
            this.actionItems.slice(-3).forEach(action => {
                summary += `<li><strong>${action.sender}:</strong> ${action.message}</li>`;
            });
            summary += `</ul></div>`;
        }
        return summary || '<p class="summary-placeholder">No meeting activity captured yet.</p>';
    }
    generateFinalSummary() {
        const finalSummary = this.generateCompleteSummary();
        const summaryContent = document.getElementById('brb-summary-content');
        if (summaryContent) {
            summaryContent.innerHTML = finalSummary;
        }
        const elapsed = Date.now() - this.startTime;
        if (elapsed > 300000) { 
            setTimeout(() => {
                this.downloadSummary();
            }, 2000);
        }
    }
    generateCompleteSummary() {
        const elapsed = this.startTime ? Date.now() - this.startTime : 0;
        const duration = Math.floor(elapsed / 60000);
        const endTime = new Date().toLocaleString();
        let summary = `# Meeting Summary\n\n`;
        summary += `**Duration:** ${duration} minutes\n`;
        summary += `**End Time:** ${endTime}\n\n`;
        if (this.keyEvents.length > 0) {
            summary += `## Key Events\n\n`;
            this.keyEvents.forEach(event => {
                summary += `- **${event.timestamp}** - ${event.description}\n`;
            });
            summary += `\n`;
        }
        if (this.participantMessages.length > 0) {
            summary += `## Discussion Summary\n\n`;
            this.participantMessages.forEach(msg => {
                summary += `- **${msg.sender}** (${msg.timestamp}): ${msg.message}\n`;
            });
            summary += `\n`;
        }
        if (this.decisions.length > 0) {
            summary += `## Decisions Made\n\n`;
            this.decisions.forEach(decision => {
                summary += `- **${decision.sender}**: ${decision.message}\n`;
            });
            summary += `\n`;
        }
        if (this.actionItems.length > 0) {
            summary += `## Action Items\n\n`;
            this.actionItems.forEach(action => {
                summary += `- [ ] **${action.sender}**: ${action.message}\n`;
            });
            summary += `\n`;
        }
        summary += `---\n`;
        summary += `*Generated by Be Right Back mode on ${new Date().toLocaleString()}*\n`;
        return summary;
    }
    downloadSummary() {
        const summary = this.generateCompleteSummary();
        const blob = new Blob([summary], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-summary-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('📄 Meeting summary downloaded');
        this.showNotification('Meeting summary downloaded successfully!');
    }
    shareSummary() {
        const summary = this.generateCompleteSummary();
        if (navigator.share) {
            navigator.share({
                title: 'Meeting Summary',
                text: summary,
                files: [new File([summary], 'meeting-summary.md', { type: 'text/markdown' })]
            }).then(() => {
                console.log('📤 Meeting summary shared');
                this.showNotification('Meeting summary shared successfully!');
            }).catch(error => {
                console.log('Share failed:', error);
                this.copyToClipboard(summary);
            });
        } else {
            this.copyToClipboard(summary);
        }
    }
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Meeting summary copied to clipboard!');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification('Meeting summary copied to clipboard!');
        });
    }
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'brb-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}
window.BeRightBack = BeRightBack;
