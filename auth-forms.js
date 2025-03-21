/**
 * Authentication forms for email/password and Google sign-in
 */
import firebaseManager from './firebase-config.js';

/**
 * Create auth modal for login and signup
 */
export function createAuthModal() {
    // Check if modal already exists
    if (document.getElementById('authModal')) {
        return;
    }
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'auth-modal';
    
    // Modal content
    modal.innerHTML = `
        <div class="auth-modal-content">
            <span class="close">&times;</span>
            <div class="auth-tabs">
                <button class="auth-tab-btn active" data-tab="login">Login</button>
                <button class="auth-tab-btn" data-tab="signup">Sign Up</button>
            </div>
            
            <div class="auth-tab-content active" id="login-tab">
                <h3>Login to Your Account</h3>
                <form id="login-form">
                    <div class="form-group">
                        <label for="login-email">Email:</label>
                        <input type="email" id="login-email" required>
                    </div>
                    <div class="form-group">
                        <label for="login-password">Password:</label>
                        <input type="password" id="login-password" required>
                    </div>
                    <button type="submit" class="auth-btn">Login</button>
                </form>
                <div class="or-divider">
                    <span>OR</span>
                </div>
                <button id="google-signin" class="google-btn">
                    <span class="google-icon">G</span>
                    Sign in with Google
                </button>
                <p class="auth-error" id="login-error"></p>
            </div>
            
            <div class="auth-tab-content" id="signup-tab">
                <h3>Create New Account</h3>
                <form id="signup-form">
                    <div class="form-group">
                        <label for="signup-email">Email:</label>
                        <input type="email" id="signup-email" required>
                    </div>
                    <div class="form-group">
                        <label for="signup-password">Password:</label>
                        <input type="password" id="signup-password" required minlength="6">
                        <small>Password must be at least 6 characters</small>
                    </div>
                    <div class="form-group">
                        <label for="signup-confirm">Confirm Password:</label>
                        <input type="password" id="signup-confirm" required>
                    </div>
                    <button type="submit" class="auth-btn">Sign Up</button>
                    <p class="auth-error" id="signup-error"></p>
                </form>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Setup event listeners
    setupAuthModalEvents();
}

/**
 * Setup auth modal event listeners
 */
function setupAuthModalEvents() {
    const modal = document.getElementById('authModal');
    const closeBtn = modal.querySelector('.close');
    const tabBtns = modal.querySelectorAll('.auth-tab-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleBtn = document.getElementById('google-signin');
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close when clicking outside modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            const tabContents = modal.querySelectorAll('.auth-tab-content');
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        
        try {
            await firebaseManager.signInWithEmail(email, password);
            modal.style.display = 'none';
        } catch (error) {
            errorElement.textContent = getAuthErrorMessage(error);
        }
    });
    
    // Signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        const errorElement = document.getElementById('signup-error');
        
        // Check if passwords match
        if (password !== confirm) {
            errorElement.textContent = "Passwords don't match";
            return;
        }
        
        try {
            await firebaseManager.createUserWithEmail(email, password);
            modal.style.display = 'none';
        } catch (error) {
            errorElement.textContent = getAuthErrorMessage(error);
        }
    });
    
    // Google sign in
    googleBtn.addEventListener('click', async () => {
        try {
            await firebaseManager.signInWithGoogle();
            modal.style.display = 'none';
        } catch (error) {
            document.getElementById('login-error').textContent = getAuthErrorMessage(error);
        }
    });
}

/**
 * Show auth modal
 */
export function showAuthModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('authModal')) {
        createAuthModal();
    }
    
    // Show modal
    document.getElementById('authModal').style.display = 'block';
}

/**
 * Get user-friendly error message
 */
function getAuthErrorMessage(error) {
    const errorCode = error.code;
    
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address format';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Invalid email or password';
        case 'auth/email-already-in-use':
            return 'Email already in use';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/operation-not-allowed':
            return 'This login method is not enabled';
        case 'auth/too-many-requests':
            return 'Too many failed login attempts. Try again later';
        default:
            console.error('Auth error:', error);
            return error.message || 'An error occurred during authentication';
    }
}

// Add styles for auth modal
function addAuthStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .auth-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            padding: 20px;
        }
        
        .auth-modal-content {
            background-color: white;
            margin: 10% auto;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            position: relative;
        }
        
        .close {
            position: absolute;
            right: 15px;
            top: 10px;
            font-size: 24px;
            cursor: pointer;
        }
        
        .auth-tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .auth-tab-btn {
            background: none;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
            flex: 1;
        }
        
        .auth-tab-btn.active {
            opacity: 1;
            border-bottom: 2px solid #3498db;
            font-weight: bold;
        }
        
        .auth-tab-content {
            display: none;
        }
        
        .auth-tab-content.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
        }
        
        .form-group input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .form-group small {
            display: block;
            margin-top: 5px;
            color: #777;
            font-size: 12px;
        }
        
        .auth-btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 4px;
            background-color: #3498db;
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .auth-btn:hover {
            background-color: #2980b9;
        }
        
        .google-btn {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
        }
        
        .google-icon {
            background-color: #4285F4;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 10px;
            font-weight: bold;
        }
        
        .or-divider {
            text-align: center;
            margin: 15px 0;
            position: relative;
        }
        
        .or-divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background-color: #ddd;
            z-index: 1;
        }
        
        .or-divider span {
            display: inline-block;
            background-color: white;
            padding: 0 10px;
            position: relative;
            z-index: 2;
            color: #777;
        }
        
        .auth-error {
            color: #e74c3c;
            margin-top: 15px;
            font-size: 14px;
        }
        
        @media (max-width: 600px) {
            .auth-modal-content {
                width: 90%;
                margin: 15% auto;
                padding: 15px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Add styles when script is loaded
addAuthStyles();