class ProximityDetector {
    constructor() {
        this.isActive = false;
        this.alertThreshold = 0.45; 
        this.safeThreshold = 0.65; 
        this.alertCooldown = 500; 
        this.lastAlertTime = 0;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.faceDetectionInterval = null;
        this.alertCallback = null;
        this.currentAlert = null; 
        this.consecutiveCloseReadings = 0; 
        this.consecutiveSafeReadings = 0; 
        this.readingsRequired = 3; 
        this.dismissReadingsRequired = 1; 
        this.alertSound = null; 
        this.startTime = null; 
        this.stabilizationPeriod = 3000; 
    }
    async initialize(videoElement, alertCallback) {
        try {
            this.video = videoElement;
            this.alertCallback = alertCallback;
            this.canvas = document.createElement('canvas');
            this.context = this.canvas.getContext('2d', { willReadFrequently: true });
            this.initializeAlertSound();
            if (!('FaceDetector' in window)) {
                console.warn('Face detection API not available, using fallback method');
                this.useFallbackMethod = true;
            } else {
                this.useFallbackMethod = false;
                const faceDetector = new FaceDetector();
                this.detector = faceDetector;
            }
            console.log('Proximity detector initialized');
            setTimeout(() => {
                console.log('Auto-starting proximity detection...');
                this.start();
            }, 2000);
            return true;
        } catch (error) {
            console.error('Error initializing proximity detector:', error);
            return false;
        }
    }
    initializeAlertSound() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.playWaterDropletSound = () => {
                if (!this.audioContext) return;
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.3);
            };
            console.log('Water droplet sound initialized');
        } catch (error) {
            console.warn('Could not initialize audio context:', error);
        }
    }
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.startTime = Date.now(); 
        this.consecutiveCloseReadings = 0;
        this.consecutiveSafeReadings = 0;
        this.currentAlert = null;
        console.log('Proximity detection started - real-time monitoring active');
        this.faceDetectionInterval = setInterval(() => {
            this.detectProximity();
        }, 200); 
    }
    stop() {
        if (!this.isActive) return;
        this.isActive = false;
        if (this.faceDetectionInterval) {
            clearInterval(this.faceDetectionInterval);
            this.faceDetectionInterval = null;
        }
        console.log('Proximity detection stopped');
    }
    async detectProximity() {
        if (!this.isActive || !this.video) {
            return;
        }
        try {
            if (this.video.videoWidth === 0 || this.video.videoHeight === 0) {
                return;
            }
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            let distance;
            if (this.useFallbackMethod) {
                distance = this.estimateDistanceByFaceSize();
            } else {
                distance = await this.detectFaceDistance();
            }
            if (distance !== null) {
                this.processDistanceReading(distance);
            }
        } catch (error) {
            console.error('Error in proximity detection:', error);
        }
    }
    processDistanceReading(distance) {
        const timeSinceStart = Date.now() - this.startTime;
        if (timeSinceStart < this.stabilizationPeriod) {
            console.log('Stabilizing... time elapsed:', (timeSinceStart / 1000).toFixed(1) + 's');
            return;
        }
        const isTooClose = distance < this.alertThreshold;
        const isSafe = distance >= this.safeThreshold;
        console.log('Threshold check:', {
            distance: distance.toFixed(3),
            alertThreshold: this.alertThreshold,
            safeThreshold: this.safeThreshold,
            isTooClose: isTooClose,
            isSafe: isSafe,
            consecutiveClose: this.consecutiveCloseReadings,
            consecutiveSafe: this.consecutiveSafeReadings
        });
        if (isTooClose) {
            this.consecutiveCloseReadings++;
            this.consecutiveSafeReadings = 0;
            if (this.consecutiveCloseReadings >= this.readingsRequired && this.currentAlert !== 'close') {
                this.triggerProximityAlert(distance);
                this.currentAlert = 'close';
            }
        } else if (isSafe) {
            this.consecutiveSafeReadings++;
            this.consecutiveCloseReadings = 0;
            if (this.consecutiveSafeReadings >= this.dismissReadingsRequired && this.currentAlert === 'close') {
                this.dismissProximityAlert();
                this.currentAlert = 'safe';
            }
        }
    }
    estimateDistanceByFaceSize() {
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        let brightness = 0;
        let pixelCount = 0;
        let motion = 0;
        const centerX = Math.floor(this.canvas.width / 2);
        const centerY = Math.floor(this.canvas.height / 2);
        const sampleSize = 150;
        for (let y = centerY - sampleSize; y < centerY + sampleSize; y++) {
            for (let x = centerX - sampleSize; x < centerX + sampleSize; x++) {
                if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
                    const index = (y * this.canvas.width + x) * 4;
                    const pixelBrightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
                    brightness += pixelBrightness;
                    pixelCount++;
                    if (x > 0 && y > 0) {
                        const prevIndex = (y * this.canvas.width + (x - 1)) * 4;
                        const prevBrightness = (data[prevIndex] + data[prevIndex + 1] + data[prevIndex + 2]) / 3;
                        motion += Math.abs(pixelBrightness - prevBrightness);
                    }
                }
            }
        }
        const avgBrightness = brightness / pixelCount;
        const avgMotion = motion / pixelCount;
        const brightnessFactor = Math.max(0, Math.min(1, (255 - avgBrightness) / 200));
        const motionFactor = Math.max(0, Math.min(1, avgMotion / 50));
        const estimatedDistance = (brightnessFactor * 0.7 + motionFactor * 0.3);
        const noise = (Math.random() - 0.5) * 0.1;
        const finalDistance = Math.max(0, Math.min(1, estimatedDistance + noise));
        return finalDistance;
    }
    async detectFaceDistance() {
        try {
            const faces = await this.detector.detect(this.canvas);
            if (faces.length === 0) {
                return null; 
            }
            const largestFace = faces.reduce((largest, face) => {
                const faceArea = face.boundingBox.width * face.boundingBox.height;
                const largestArea = largest.boundingBox.width * largest.boundingBox.height;
                return faceArea > largestArea ? face : largest;
            });
            const faceArea = largestFace.boundingBox.width * largestFace.boundingBox.height;
            const canvasArea = this.canvas.width * this.canvas.height;
            const faceRatio = faceArea / canvasArea;
            const estimatedDistance = Math.max(0, Math.min(1, 1 - (faceRatio * 3)));
            return estimatedDistance;
        } catch (error) {
            console.error('Face detection error:', error);
            return this.estimateDistanceByFaceSize();
        }
    }
    triggerProximityAlert(distance) {
        const now = Date.now();
        if (now - this.lastAlertTime < this.alertCooldown) {
            return;
        }
        this.lastAlertTime = now;
        const alertData = {
            type: 'proximity',
            distance: distance,
            message: 'You are too close to the screen! Please move back for better posture and eye comfort.',
            severity: this.getAlertSeverity(distance),
            timestamp: new Date().toISOString(),
            action: 'show'
        };
        console.log('Proximity alert triggered:', alertData);
        if (this.playWaterDropletSound) {
            this.playWaterDropletSound();
        }
        if (this.alertCallback) {
            this.alertCallback(alertData);
        }
        this.showProximityAlert(alertData);
    }
    dismissProximityAlert() {
        const alertData = {
            type: 'proximity',
            message: 'Safe distance maintained',
            action: 'dismiss',
            timestamp: new Date().toISOString()
        };
        console.log('Proximity alert dismissed:', alertData);
        if (this.alertCallback) {
            this.alertCallback(alertData);
        }
        this.hideProximityAlert();
    }
getAlertSeverity(distance) {
if (distance < 0.15) return 'high';
if (distance < 0.25) return 'medium';
return 'low';
}
showProximityAlert(alertData) {
const existingAlert = document.getElementById('proximity-alert');
if (existingAlert) {
existingAlert.remove();
}
const alertElement = document.createElement('div');
alertElement.id = 'proximity-alert';
alertElement.style.cssText = `
position: fixed;
top: 20px;
right: 20px;
background: ${alertData.severity === 'high' ? 'rgba(220, 53, 69, 0.9)' : 
alertData.severity === 'medium' ? 'rgba(255, 193, 7, 0.9)' : 
'rgba(23, 162, 184, 0.9)'};
color: white;
padding: 15px 20px;
border-radius: 8px;
font-family: Arial, sans-serif;
font-size: 14px;
font-weight: 600;
z-index: 10000;
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
max-width: 300px;
animation: slideIn 0.3s ease-out;
cursor: pointer;
transition: all 0.2s ease;
`;
alertElement.innerHTML = `
<div style="display: flex; align-items: center; margin-bottom: 8px;">
<i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
<span>Proximity Alert</span>
</div>
<div style="font-size: 12px; opacity: 0.9;">
${alertData.message}
</div>
<div style="font-size: 11px; opacity: 0.7; margin-top: 8px;">
Moves away to dismiss • Click to close manually
</div>
`;
alertElement.addEventListener('click', () => {
this.hideProximityAlert();
});
document.body.appendChild(alertElement);
if (!document.getElementById('proximity-alert-styles')) {
const style = document.createElement('style');
style.id = 'proximity-alert-styles';
style.textContent = `
@keyframes slideIn {
from {
transform: translateX(100%);
opacity: 0;
}
to {
transform: translateX(0);
opacity: 1;
}
}
@keyframes slideOut {
from {
transform: translateX(0);
opacity: 1;
}
to {
transform: translateX(100%);
opacity: 0;
}
}
`;
document.head.appendChild(style);
}
}
hideProximityAlert() {
const alertElement = document.getElementById('proximity-alert');
if (alertElement) {
alertElement.style.animation = 'slideOut 0.2s ease-in';
setTimeout(() => {
if (alertElement.parentNode) {
alertElement.remove();
}
}, 200);
}
}
setThreshold(threshold) {
this.alertThreshold = Math.max(0.1, Math.min(0.8, threshold));
console.log('Proximity threshold set to:', this.alertThreshold);
}
setCooldown(cooldownMs) {
this.alertCooldown = Math.max(1000, cooldownMs);
console.log('Proximity alert cooldown set to:', this.alertCooldown + 'ms');
}
getStatus() {
return {
isActive: this.isActive,
threshold: this.alertThreshold,
cooldown: this.alertCooldown,
lastAlert: this.lastAlertTime
};
}
}
window.ProximityDetector = ProximityDetector;
