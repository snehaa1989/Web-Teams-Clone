class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.handleRegister());
        }
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        this.setupActivityTracking();
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const loginForm = document.getElementById('login-form');
                const registerForm = document.getElementById('register-form');
                if (loginForm && loginForm.style.display !== 'none') {
                    const email = document.getElementById('login-email');
                    const password = document.getElementById('login-password');
                    if (email && password && email.value.trim() && password.value.trim()) {
                        this.handleLogin();
                    }
                } 
                else if (registerForm && registerForm.style.display !== 'none') {
                    const username = document.getElementById('register-username');
                    const email = document.getElementById('register-email');
                    const password = document.getElementById('register-password');
                    if (username && email && password && 
                        username.value.trim() && email.value.trim() && password.value.trim()) {
                        this.handleRegister();
                    }
                }
            }
        });
    }
    async handleRegister() {
        const username = document.getElementById('register-username')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;
        const confirmPassword = document.getElementById('register-confirm-password')?.value;
        if (!username || !email || !password || !confirmPassword) {
            this.showError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (data.success) {
                if (data.requiresEmailConfirmation) {
                    this.showSuccess('Registration successful! Please check your email to confirm your account.');
                    setTimeout(() => this.showLoginForm(), 2000); 
                } else {
                    this.showSuccess('Registration successful! Please login to continue.');
                    setTimeout(() => this.showLoginForm(), 1500); 
                }
            } else {
                this.showError(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Network error. Please try again.');
        }
    }
    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        if (!email || !password) {
            this.showError('Please enter email and password');
            return;
        }
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                this.setAuthData(data.token, data.user);
                this.showSuccess('Login successful! Redirecting...');
                const storedToken = localStorage.getItem('authSession');
                if (storedToken && JSON.parse(storedToken).token === data.token) {
                    setTimeout(() => this.showMainApp(), 1500);
                } else {
                    this.showError('Failed to store authentication token');
                }
            } else {
                if (data.requiresEmailConfirmation) {
                    this.showError(data.message);
                    this.showResendConfirmationOption(email);
                } else {
                    this.showError(data.message || 'Login failed');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        }
    }
    async handleLogout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        this.clearAuthData();
        this.showLoginForm();
    }
    setAuthData(token, user) {
        this.token = token;
        this.user = user;
        const sessionData = {
            token: token,                                    
            user: user,                                      
            sessionStart: new Date().toISOString(),          
            lastActivity: new Date().toISOString()           
        };
        localStorage.setItem('authSession', JSON.stringify(sessionData));
        console.log('Auth session stored:', sessionData);
        this.startInactivityTimer();
    }
    clearAuthData() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authSession');
        localStorage.removeItem('token');        
        localStorage.removeItem('user');         
        this.clearInactivityTimer();
    }
    startInactivityTimer() {
        this.clearInactivityTimer();
        this.inactivityTimer = setTimeout(() => {
            this.handleSessionExpiration();
        }, 10 * 60 * 1000); 
    }
    clearInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }
    resetInactivityTimer() {
        const sessionData = localStorage.getItem('authSession');
        if (sessionData) {
            try {
                const parsed = JSON.parse(sessionData);
                parsed.lastActivity = new Date().toISOString();
                localStorage.setItem('authSession', JSON.stringify(parsed));
                this.startInactivityTimer();
            } catch (error) {
                console.error('Error updating activity:', error);
            }
        }
    }
    handleSessionExpiration() {
        console.log('Session expired due to inactivity');
        this.clearAuthData();
        this.showError('Session expired due to inactivity. Please login again.');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
    setupActivityTracking() {
        const events = [
            'mousedown',    
            'mousemove',    
            'keypress',     
            'scroll',       
            'touchstart',   
            'click',        
            'keydown'       
        ];
        const resetTimer = () => this.resetInactivityTimer();
        events.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
    }
    showError(message) {
        const errorElement = document.getElementById('auth-error');
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
    showResendConfirmationOption(email) {
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
            const resendButton = document.createElement('button');
            resendButton.textContent = 'Resend Confirmation Email';
            resendButton.className = 'btn btn-link btn-sm';
            resendButton.style.color = '#86efac';
            resendButton.style.textDecoration = 'underline';
            resendButton.style.border = 'none';
            resendButton.style.background = 'none';
            resendButton.style.padding = '5px';
            resendButton.style.marginTop = '10px';
            resendButton.onclick = () => this.resendConfirmationEmail(email);
            errorElement.appendChild(resendButton);
        }
    }
    async resendConfirmationEmail(email) {
        try {
            const response = await fetch('/api/auth/resend-confirmation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Confirmation email sent! Please check your inbox.');
            } else {
                this.showError(data.message || 'Failed to resend confirmation email');
            }
        } catch (error) {
            console.error('Resend confirmation error:', error);
            this.showError('Network error. Please try again.');
        }
    }
    showSuccess(message) {
        const successElement = document.getElementById('auth-success');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 3000);
        } else {
            alert(message);
        }
    }
    toggleAuthForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        if (loginForm && registerForm) {
            if (loginForm.style.display === 'none') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
        }
    }
    showLoginForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authContainer = document.getElementById('auth-container');
        if (loginForm && registerForm) {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            authContainer.style.display = 'flex';
        }
    }
    showRegisterForm() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authContainer = document.getElementById('auth-container');
        if (loginForm && registerForm) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            authContainer.style.display = 'flex';
        }
    }
    showMainApp() {
        window.location.href = '/dashboard.html';
    }
    isAuthenticated() {
        const sessionData = localStorage.getItem('authSession');
        if (!sessionData || sessionData === 'null') {
            return false;
        }
        try {
            const parsed = JSON.parse(sessionData);
            return parsed && parsed.token && parsed.user;
        } catch (error) {
            console.error('Error parsing session data:', error);
            return false;
        }
    }
    init() {
        const sessionData = localStorage.getItem('authSession');
        if (this.isAuthenticated()) {
            try {
                const parsed = JSON.parse(sessionData);
                this.token = parsed.token;
                this.user = parsed.user;
                const currentPage = window.location.pathname;
                if (currentPage === '/' || currentPage === '/index.html') {
                    this.showMainApp();
                }
                else if (currentPage === '/dashboard.html') {
                    if (typeof document.getElementById('meeting-dashboard') !== 'undefined') {
                        document.getElementById('meeting-dashboard').style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Error loading session data:', error);
                this.clearAuthData();
                this.showLoginForm();
            }
        } else {
            if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                window.location.href = '/';
            } else {
                this.showLoginForm();
            }
        }
    }
}
const authManager = new AuthManager();
document.addEventListener('DOMContentLoaded', () => {
    authManager.init();
});
window.toggleAuthForm = () => {
    authManager.toggleAuthForm();
};
window.AuthManager = AuthManager;
