class IndexManager {
    constructor() {
        this.loginForm = null;
        this.registerForm = null;
    }
    initialize() {
        console.log('=== INDEX INITIALIZATION START ===');
        this.setupFormElements();
        this.setupEventHandlers();
        console.log('=== INDEX INITIALIZATION COMPLETE ===');
    }
    setupFormElements() {
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        console.log('Login form:', this.loginForm);
        console.log('Register form:', this.registerForm);
    }
    setupEventHandlers() {
        this.setupAuthFormToggle();
        this.setupAuthManager();
    }
    setupAuthFormToggle() {
        let toggleAuthForm = () => {
            if (this.loginForm.style.display === 'none') {
                console.log('Toggling to login form');
                this.loginForm.style.display = 'block';
                this.registerForm.style.display = 'none';
            } else {
                console.log('Toggling to register form');
                this.loginForm.style.display = 'none';
                this.registerForm.style.display = 'block';
            }
        };
        window.toggleAuthForm = toggleAuthForm;
    }
    setupAuthManager() {
        document.addEventListener('DOMContentLoaded', () => {
            window.toggleAuthForm = window.toggleAuthForm;
            if (typeof authManager !== 'undefined') {
                authManager.init();
            }
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const indexManager = new IndexManager();
    indexManager.initialize();
});
