class RealTimeTranslator {
    constructor() {
        this.isTranslating = false;
        this.sourceLanguage = 'en'; 
        this.targetLanguage = 'en'; 
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.translatedText = '';
        this.originalText = '';
        this.participantTranslations = new Map(); 
        this.translationHistory = [];
        this.maxHistorySize = 100;
        this.supportedLanguages = {
            'en': { name: 'English', code: 'en' },
            'es': { name: 'Spanish', code: 'es' },
            'fr': { name: 'French', code: 'fr' },
            'de': { name: 'German', code: 'de' },
            'it': { name: 'Italian', code: 'it' },
            'pt': { name: 'Portuguese', code: 'pt' },
            'ru': { name: 'Russian', code: 'ru' },
            'ja': { name: 'Japanese', code: 'ja' },
            'ko': { name: 'Korean', code: 'ko' },
            'zh': { name: 'Chinese', code: 'zh' },
            'ar': { name: 'Arabic', code: 'ar' },
            'hi': { name: 'Hindi', code: 'hi' }
        };
        this.initializeSpeechRecognition();
    }
    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            this.enableManualInputMode();
            this.showErrorMessage('Speech recognition not supported - using manual input mode');
            return;
        }
        this.testSpeechRecognitionAvailability()
            .then(isAvailable => {
                if (isAvailable) {
                    this.setupSpeechRecognition();
                } else {
                    console.log('Speech recognition service unavailable - using manual mode');
                    this.enableManualInputMode();
                    this.showErrorMessage('Speech recognition service unavailable - using manual input mode');
                }
            })
            .catch(error => {
                console.error('Error testing speech recognition:', error);
                this.enableManualInputMode();
                this.showErrorMessage('Speech recognition test failed - using manual input mode');
            });
    }
    async testSpeechRecognitionAvailability() {
        return new Promise((resolve) => {
            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const testRecognition = new SpeechRecognition();
                const timeout = setTimeout(() => {
                    testRecognition.abort();
                    console.log('Speech recognition test timed out - service likely unavailable');
                    resolve(false);
                }, 3000);
                testRecognition.onstart = () => {
                    clearTimeout(timeout);
                    testRecognition.abort();
                    console.log('Speech recognition service is available');
                    resolve(true);
                };
                testRecognition.onerror = (event) => {
                    clearTimeout(timeout);
                    if (event.error === 'network') {
                        console.log('Speech recognition network error detected during test');
                        resolve(false);
                    } else {
                        console.log('Speech recognition other error:', event.error);
                        resolve(false);
                    }
                };
                testRecognition.maxAlternatives = 1;
                testRecognition.continuous = false;
                testRecognition.interimResults = false;
                testRecognition.start();
            } catch (error) {
                console.error('Speech recognition test failed:', error);
                resolve(false);
            }
        });
    }
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.sourceLanguage;
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            if (finalTranscript) {
                this.originalText = finalTranscript;
                this.translateText(finalTranscript);
            }
            this.updateInterimText(interimTranscript);
        };
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            switch(event.error) {
                case 'network':
                    console.log('🌐 Network error - switching to manual mode');
                    this.handleNetworkError();
                    break;
                case 'no-speech':
                    console.log('No speech detected, continuing...');
                    break;
                case 'audio-capture':
                    console.log('🎤 Audio capture error - checking microphone');
                    this.handleAudioError();
                    break;
                case 'not-allowed':
                    console.log('🔒 Permission denied - microphone blocked');
                    this.handlePermissionError();
                    break;
                case 'service-not-allowed':
                    console.log('🚫 Service not allowed - speech disabled');
                    this.handleServiceNotAllowed();
                    break;
                default:
                    console.log('⚠️ Generic error - attempting restart');
                    this.handleGenericError();
            }
        };
        console.log('Speech recognition initialized successfully');
    }
    handleNetworkError() {
        console.log('🌐 Network error detected - switching to manual input mode');
        this.stopTranslation();
        this.showErrorMessage('Speech recognition unavailable - please use manual text input for translation');
        this.enableManualInputMode();
    }
    handleAudioError() {
        console.log('🎤 Audio capture error - checking microphone availability');
        this.stopTranslation();
        this.showErrorMessage('Microphone not available - please check audio permissions');
    }
    handlePermissionError() {
        console.log('🔒 Permission denied - microphone access blocked');
        this.stopTranslation();
        this.showErrorMessage('Microphone permission denied - please allow microphone access');
    }
    handleServiceNotAllowed() {
        console.log('🚫 Service not allowed - speech recognition disabled');
        this.stopTranslation();
        this.showErrorMessage('Speech recognition service disabled - using manual input mode');
        this.enableManualInputMode();
    }
    handleGenericError() {
        console.log('⚠️ Generic error - restarting speech recognition');
        this.restartRecognition();
    }
    showErrorMessage(message) {
        const container = document.getElementById('translation-container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'translation-error';
            errorDiv.innerHTML = `
                <div class="error-icon">⚠️</div>
                <div class="error-message">${message}</div>
                <button class="error-close" onclick="this.parentElement.remove()">×</button>
            `;
            container.appendChild(errorDiv);
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }
    enableManualInputMode() {
        const container = document.getElementById('translation-container');
        if (container) {
            const inputDiv = document.createElement('div');
            inputDiv.className = 'manual-input-container';
            inputDiv.innerHTML = `
                <input type="text" id="manual-translation-input" placeholder="Type text to translate..." />
                <button id="manual-translate-btn">Translate</button>
            `;
            const translationList = container.querySelector('.translation-list');
            if (translationList) {
                container.insertBefore(inputDiv, translationList);
            }
            document.getElementById('manual-translate-btn').addEventListener('click', () => {
                const input = document.getElementById('manual-translation-input');
                if (input.value.trim()) {
                    this.translateText(input.value.trim());
                    input.value = '';
                }
            });
            document.getElementById('manual-translation-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const btn = document.getElementById('manual-translate-btn');
                    btn.click();
                }
            });
        }
    }
    restartRecognition() {
        if (this.recognition && this.isTranslating) {
            try {
                this.recognition.stop();
                setTimeout(() => {
                    if (this.isTranslating) {
                        this.recognition.start();
                    }
                }, 1000);
            } catch (error) {
                console.error('Failed to restart recognition:', error);
                this.handleNetworkError();
            }
        }
    }
    async translateText(text, sourceLang = null, targetLang = null) {
        try {
            console.log('🌍 Starting translation:', { text, sourceLang, targetLang });
            const source = sourceLang || this.sourceLanguage;
            const target = targetLang || this.targetLanguage;
            console.log('🔍 Translation parameters:', { source, target, text: text.substring(0, 50) + '...' });
            if (source === target) {
                console.log('⚠️ Source and target are the same, returning original text');
                this.translatedText = text;
                this.displayTranslation(text, text);
                return text;
            }
            const translated = await this.callTranslationAPI(text, source, target);
            this.translatedText = translated;
            this.displayTranslation(text, translated);
            this.addToHistory(text, translated, source, target);
            console.log('✅ Translation completed:', { original: text, translated });
            return translated;
        } catch (error) {
            console.error('❌ Translation error:', error);
            this.translatedText = text; 
            this.displayTranslation(text, text);
            return text;
        }
    }
    async callTranslationAPI(text, sourceLang, targetLang) {
        console.log('🔄 Calling translation API:', { sourceLang, targetLang, text: text.substring(0, 30) + '...' });
        await new Promise(resolve => setTimeout(resolve, 300));
        const translations = {
            'en-es': {
                'hello': 'hola',
                'hi': 'hola',
                'goodbye': 'adiós',
                'bye': 'adiós',
                'thank you': 'gracias',
                'thanks': 'gracias',
                'please': 'por favor',
                'sorry': 'lo siento',
                'yes': 'sí',
                'no': 'no',
                'how are you': 'cómo estás',
                'good morning': 'buenos días',
                'good night': 'buenas noches',
                'welcome': 'bienvenido',
                'meeting': 'reunión',
                'presentation': 'presentación',
                'video': 'video',
                'audio': 'audio',
                'screen': 'pantalla',
                'share': 'compartir',
                'chat': 'chat',
                'message': 'mensaje',
                'participant': 'participante',
                'join': 'unirse',
                'leave': 'salir',
                'start': 'empezar',
                'stop': 'parar',
                'record': 'grabar',
                'translate': 'traducir',
                'language': 'idioma',
                'microphone': 'micrófono',
                'camera': 'cámara'
            },
            'en-fr': {
                'hello': 'bonjour',
                'hi': 'salut',
                'goodbye': 'au revoir',
                'bye': 'au revoir',
                'thank you': 'merci',
                'thanks': 'merci',
                'please': 's\'il vous plaît',
                'sorry': 'désolé',
                'yes': 'oui',
                'no': 'non',
                'how are you': 'comment allez-vous',
                'good morning': 'bonjour',
                'good night': 'bonne nuit',
                'welcome': 'bienvenue',
                'meeting': 'réunion',
                'presentation': 'présentation',
                'video': 'vidéo',
                'audio': 'audio',
                'screen': 'écran',
                'share': 'partager',
                'chat': 'chat',
                'message': 'message',
                'participant': 'participant',
                'join': 'rejoindre',
                'leave': 'partir',
                'start': 'commencer',
                'stop': 'arrêter',
                'record': 'enregistrer',
                'translate': 'traduire',
                'language': 'langue',
                'microphone': 'microphone',
                'camera': 'caméra'
            },
            'en-de': {
                'hello': 'hallo',
                'hi': 'hallo',
                'goodbye': 'auf wiedersehen',
                'bye': 'tschüss',
                'thank you': 'danke',
                'thanks': 'danke',
                'please': 'bitte',
                'sorry': 'entschuldigung',
                'yes': 'ja',
                'no': 'nein',
                'how are you': 'wie geht es dir',
                'good morning': 'guten morgen',
                'good night': 'gute nacht',
                'welcome': 'willkommen',
                'meeting': 'besprechung',
                'presentation': 'präsentation',
                'video': 'video',
                'audio': 'audio',
                'screen': 'bildschirm',
                'share': 'teilen',
                'chat': 'chat',
                'message': 'nachricht',
                'participant': 'teilnehmer',
                'join': 'beitreten',
                'leave': 'verlassen',
                'start': 'starten',
                'stop': 'stoppen',
                'record': 'aufnehmen',
                'translate': 'übersetzen',
                'language': 'sprache',
                'microphone': 'mikrofon',
                'camera': 'kamera'
            },
            'es-en': {
                'hola': 'hello',
                'adiós': 'goodbye',
                'gracias': 'thank you',
                'por favor': 'please',
                'lo siento': 'sorry',
                'sí': 'yes',
                'no': 'no',
                'cómo estás': 'how are you',
                'buenos días': 'good morning',
                'bienvenido': 'welcome',
                'reunión': 'meeting',
                'presentación': 'presentation',
                'video': 'video',
                'audio': 'audio',
                'pantalla': 'screen',
                'compartir': 'share',
                'chat': 'chat',
                'mensaje': 'message',
                'participante': 'participant'
            },
            'fr-en': {
                'bonjour': 'hello',
                'au revoir': 'goodbye',
                'merci': 'thank you',
                's\'il vous plaît': 'please',
                'désolé': 'sorry',
                'oui': 'yes',
                'non': 'no',
                'comment allez-vous': 'how are you',
                'bienvenue': 'welcome',
                'réunion': 'meeting',
                'présentation': 'presentation',
                'vidéo': 'video',
                'audio': 'audio',
                'écran': 'screen',
                'partager': 'share',
                'chat': 'chat',
                'message': 'message',
                'participant': 'participant'
            }
        };
        const key = `${sourceLang}-${targetLang}`;
        const translationMap = translations[key] || {};
        console.log('📚 Translation map found:', key, Object.keys(translationMap).length, 'entries');
        console.log('🔍 Available translations:', Object.keys(translationMap));
        let translatedText = text.toLowerCase();
        let translationFound = false;
        Object.entries(translationMap).forEach(([sourceWord, targetWord]) => {
            const regex = new RegExp(`\\b${sourceWord}\\b`, 'gi');
            if (regex.test(translatedText)) {
                translatedText = translatedText.replace(regex, targetWord);
                translationFound = true;
                console.log(`✅ Translated "${sourceWord}" → "${targetWord}"`);
            }
        });
        if (text.charAt(0) === text.charAt(0).toUpperCase()) {
            translatedText = translatedText.charAt(0).toUpperCase() + translatedText.slice(1);
        }
        console.log('✨ Translation result:', { 
            original: text, 
            translated: translatedText,
            translationFound: translationFound,
            sourceTarget: `${sourceLang}-${targetLang}`
        });
        if (!translationFound && Object.keys(translationMap).length > 0) {
            console.log('⚠️ No exact translation found, returning original text');
            return `[${targetLang.toUpperCase()}] ${text}`;
        }
        return translatedText;
    }
    displayTranslation(original, translated) {
        console.log('📱 Displaying translation:', { original, translated });
        let container = document.getElementById('translation-container');
        if (!container) {
            console.log('🔧 Creating translation container - not found');
            this.createTranslationContainer();
            container = document.getElementById('translation-container');
        }
        if (!container) {
            console.error('❌ Failed to create translation container');
            return;
        }
        const translationElement = document.createElement('div');
        translationElement.className = 'translation-item';
        const sourceLangName = this.supportedLanguages[this.sourceLanguage]?.name || 'Auto-Detect';
        const targetLangName = this.supportedLanguages[this.targetLanguage]?.name || this.targetLanguage.toUpperCase();
        translationElement.innerHTML = `
            <div class="translation-header-info">
                <span class="source-lang">${sourceLangName}</span>
                <i class="fas fa-arrow-right translation-arrow"></i>
                <span class="target-lang">${targetLangName}</span>
                <div class="translation-time">${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="original-text">
                <span class="lang-label">${sourceLangName}:</span>
                ${original}
            </div>
            <div class="translated-text">
                <span class="lang-label">${targetLangName}:</span>
                ${translated}
            </div>
        `;
        const translationList = container.querySelector('.translation-list');
        if (translationList) {
            translationList.insertBefore(translationElement, translationList.firstChild);
        } else {
            container.appendChild(translationElement);
        }
        const allTranslations = container.querySelectorAll('.translation-item');
        while (allTranslations.length > 10) {
            allTranslations[allTranslations.length - 1].remove();
        }
        console.log('✅ Translation displayed successfully');
    }
    updateInterimText(text) {
        const interimElement = document.getElementById('interim-translation');
        if (interimElement) {
            interimElement.textContent = text;
        }
    }
    createTranslationContainer() {
        const container = document.createElement('div');
        container.id = 'translation-container';
        container.className = 'translation-container';
        container.innerHTML = `
            <div class="translation-header">
                <h4>Live Translation</h4>
                <div class="language-selectors">
                    <select id="source-language-select">
                        <option value="auto">Auto-Detect</option>
                        ${Object.entries(this.supportedLanguages).map(([code, lang]) => 
                            `<option value="${code}">${lang.name}</option>`
                        ).join('')}
                    </select>
                    <i class="fas fa-arrow-right language-arrow"></i>
                    <select id="target-language-select">
                        ${Object.entries(this.supportedLanguages).map(([code, lang]) => 
                            `<option value="${code}">${lang.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <button id="toggle-translation">Start Translation</button>
            </div>
            <div class="translation-status">
                <div class="status-dot manual"></div>
                <span>Manual Input Mode</span>
            </div>
            <div id="interim-translation" class="interim-text"></div>
            <div class="translation-list"></div>
        `;
        document.body.appendChild(container);
        document.getElementById('source-language-select').addEventListener('change', (e) => {
            this.sourceLanguage = e.target.value;
            console.log('Source language set to:', this.sourceLanguage);
        });
        document.getElementById('target-language-select').addEventListener('change', (e) => {
            this.targetLanguage = e.target.value;
            console.log('Target language set to:', this.targetLanguage);
        });
        document.getElementById('toggle-translation').addEventListener('click', () => {
            this.toggleTranslation();
        });
        if (!this.recognition) {
            this.enableManualInputMode();
        }
    }
    toggleTranslation() {
        if (this.isTranslating) {
            this.stopTranslation();
        } else {
            this.startTranslation();
        }
    }
    startTranslation() {
        if (!this.recognition) {
            console.error('Speech recognition not available');
            return;
        }
        this.isTranslating = true;
        this.recognition.start();
        const button = document.getElementById('toggle-translation');
        if (button) {
            button.textContent = 'Stop Translation';
            button.classList.add('active');
        }
        console.log('Translation started');
    }
    stopTranslation() {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.isTranslating = false;
        const button = document.getElementById('toggle-translation');
        if (button) {
            button.textContent = 'Start Translation';
            button.classList.remove('active');
        }
        console.log('Translation stopped');
    }
    addToHistory(original, translated, sourceLang, targetLang) {
        this.translationHistory.unshift({
            original,
            translated,
            sourceLang,
            targetLang,
            timestamp: new Date().toISOString()
        });
        if (this.translationHistory.length > this.maxHistorySize) {
            this.translationHistory = this.translationHistory.slice(0, this.maxHistorySize);
        }
    }
    setTargetLanguage(languageCode) {
        if (this.supportedLanguages[languageCode]) {
            this.targetLanguage = languageCode;
            console.log(`Target language set to: ${this.supportedLanguages[languageCode].name}`);
        }
    }
    getTranslationHistory() {
        return this.translationHistory;
    }
    translateParticipantAudio(audioStream, participantId) {
        console.log(`Translating audio from participant: ${participantId}`);
    }
}
window.RealTimeTranslator = RealTimeTranslator;
