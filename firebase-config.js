// Firebase Configuration Module
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp,
    initializeFirestore,
    persistentLocalCache,
    CACHE_SIZE_UNLIMITED
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

/**
 * Firebase configuration and authentication management
 * This module handles all Firebase-related functionality
 */

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyDclV201cvjXErC8XEDBv2GpO0uMjYrRhs",
    authDomain: "project-x-df666.firebaseapp.com",
    projectId: "project-x-df666",
    storageBucket: "project-x-df666.firebasestorage.app",
    messagingSenderId: "114728325803",
    appId: "1:114728325803:web:e34c69246399bbc33a9dee",
    measurementId: "G-6PLCHTVFYS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with persistence enabled via settings
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
    })
});

// Firebase Manager class
class FirebaseManager {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.user = null;
        this.syncEnabled = false;
        this.listeners = [];
        
        // Set up persistent auth state listener
        onAuthStateChanged(auth, this.handleAuthStateChange.bind(this));
    }
    
    /**
     * Handle authentication state changes
     * @param {Object} user - Firebase user object or null if signed out
     */
    handleAuthStateChange(user) {
        this.user = user;
        this.syncEnabled = !!user;
        
        // Update UI based on auth state
        this.updateAuthUI();
        
        // Notify all registered listeners
        this.notifyListeners({
            type: 'auth-change',
            user: user,
            isLoggedIn: !!user
        });
    }
    
    /**
     * Update UI elements based on authentication state
     */
    updateAuthUI() {
        const loginButton = document.getElementById('loginButton');
        const syncStatus = document.getElementById('syncStatus');
        
        if (loginButton) {
            loginButton.textContent = this.user ? 'Logout' : 'Login to Sync';
        }
        
        if (syncStatus) {
            if (this.user) {
                syncStatus.className = 'sync-status online';
                syncStatus.innerHTML = '<span>Synced</span>';
            } else {
                syncStatus.className = 'sync-status offline';
                syncStatus.innerHTML = '<span>Offline</span>';
            }
        }
    }
    
    /**
     * Register a listener for Firebase events
     * @param {Function} callback - Function to call with event data
     * @returns {number} Listener ID for unregistering
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            return this.listeners.length - 1;
        }
        return -1;
    }
    
    /**
     * Remove a registered listener
     * @param {number} id - Listener ID to remove
     */
    removeListener(id) {
        if (id >= 0 && id < this.listeners.length) {
            this.listeners[id] = null;
        }
    }
    
    /**
     * Notify all listeners of an event
     * @param {Object} event - Event data to send to listeners
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            if (typeof listener === 'function') {
                listener(event);
            }
        });
    }
    
    /**
     * Sign in with Google
     * @returns {Promise} Promise resolving to user credential
     */
    async signInWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            
            // Update UI to show loading state
            this.setUILoadingState(true, 'Signing in...');
            
            const result = await signInWithPopup(auth, provider);
            
            // Success - handled by onAuthStateChanged
            return result;
        } catch (error) {
            console.error('Login error:', error);
            this.setUILoadingState(false);
            
            // Notify application of error
            this.notifyListeners({
                type: 'auth-error',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} Promise resolving to user credential
     */
    async signInWithEmail(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Update UI to show loading state
            this.setUILoadingState(true, 'Signing in...');
            
            const result = await signInWithEmailAndPassword(auth, email, password);
            
            // Success - handled by onAuthStateChanged
            return result;
        } catch (error) {
            console.error('Login error:', error);
            this.setUILoadingState(false);
            
            // Notify application of error
            this.notifyListeners({
                type: 'auth-error',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Create a new user with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} Promise resolving to user credential
     */
    async createUserWithEmail(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            // Update UI to show loading state
            this.setUILoadingState(true, 'Creating account...');
            
            const result = await createUserWithEmailAndPassword(auth, email, password);
            
            // Success - handled by onAuthStateChanged
            return result;
        } catch (error) {
            console.error('Account creation error:', error);
            this.setUILoadingState(false);
            
            // Notify application of error
            this.notifyListeners({
                type: 'auth-error',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Sign out current user
     * @returns {Promise} Promise resolving when sign out is complete
     */
    async signOut() {
        try {
            // Update UI to show loading state
            this.setUILoadingState(true, 'Signing out...');
            
            await signOut(auth);
            
            // Success - handled by onAuthStateChanged
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            this.setUILoadingState(false);
            
            // Notify application of error
            this.notifyListeners({
                type: 'auth-error',
                error: error
            });
            
            throw error;
        }
    }
    
    /**
     * Set UI loading state during authentication operations
     * @param {boolean} isLoading - Whether UI should show loading state
     * @param {string} message - Optional message to display
     */
    setUILoadingState(isLoading, message = '') {
        const loginButton = document.getElementById('loginButton');
        const syncStatus = document.getElementById('syncStatus');
        
        if (loginButton) {
            if (isLoading) {
                loginButton.disabled = true;
                loginButton.classList.add('loading');
                loginButton.dataset.originalText = loginButton.textContent;
                loginButton.textContent = message || 'Loading...';
            } else {
                loginButton.disabled = false;
                loginButton.classList.remove('loading');
                if (loginButton.dataset.originalText) {
                    loginButton.textContent = loginButton.dataset.originalText;
                    delete loginButton.dataset.originalText;
                }
            }
        }
        
        if (syncStatus && isLoading) {
            syncStatus.className = 'sync-status syncing';
            syncStatus.innerHTML = `<span>${message || 'Syncing...'}</span>`;
        }
    }
    
    /**
     * Save data to Firestore
     * @param {string} weekId - Week identifier
     * @param {Array} activeCodes - Active codes
     * @param {Array} deletedCodes - Deleted codes
     * @returns {Promise} Promise resolving when save is complete
     */
    async saveWeekData(weekId, activeCodes, deletedCodes) {
        if (!this.user) {
            throw new Error('User not authenticated');
        }
        
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.className = 'sync-status syncing';
            syncStatus.innerHTML = '<span>Syncing...</span>';
        }
        
        try {
            const userDocRef = doc(db, 'users', this.user.uid);
            const weekDocRef = doc(collection(userDocRef, 'weeks'), weekId.toString());
            
            await setDoc(weekDocRef, {
                activeCodes: activeCodes,
                deletedCodes: deletedCodes,
                lastUpdated: serverTimestamp()
            });
            
            if (syncStatus) {
                syncStatus.className = 'sync-status online';
                syncStatus.innerHTML = '<span>Synced</span>';
            }
            
            // Notify application of successful save
            this.notifyListeners({
                type: 'data-saved',
                weekId: weekId
            });
            
            return true;
        } catch (error) {
            console.error('Save error:', error);
            
            if (syncStatus) {
                syncStatus.className = 'sync-status error';
                syncStatus.innerHTML = '<span>Sync Error</span>';
            }
            
            // Notify application of error
            this.notifyListeners({
                type: 'data-error',
                error: error,
                operation: 'save',
                weekId: weekId
            });
            
            throw error;
        }
    }
    
    /**
     * Load data from Firestore
     * @param {string} weekId - Week identifier
     * @returns {Promise} Promise resolving to week data
     */
    async loadWeekData(weekId) {
        if (!this.user) {
            throw new Error('User not authenticated');
        }
        
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.className = 'sync-status syncing';
            syncStatus.innerHTML = '<span>Loading...</span>';
        }
        
        try {
            const userDocRef = doc(db, 'users', this.user.uid);
            const weekDocRef = doc(collection(userDocRef, 'weeks'), weekId.toString());
            
            const docSnap = await getDoc(weekDocRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                if (syncStatus) {
                    syncStatus.className = 'sync-status online';
                    syncStatus.innerHTML = '<span>Synced</span>';
                }
                
                // Notify application of successful load
                this.notifyListeners({
                    type: 'data-loaded',
                    weekId: weekId,
                    data: data
                });
                
                return data;
            } else {
                if (syncStatus) {
                    syncStatus.className = 'sync-status online';
                    syncStatus.innerHTML = '<span>No Cloud Data</span>';
                }
                
                // Notify application of empty result
                this.notifyListeners({
                    type: 'data-empty',
                    weekId: weekId
                });
                
                return null;
            }
        } catch (error) {
            console.error('Load error:', error);
            
            if (syncStatus) {
                syncStatus.className = 'sync-status error';
                syncStatus.innerHTML = '<span>Load Error</span>';
            }
            
            // Notify application of error
            this.notifyListeners({
                type: 'data-error',
                error: error,
                operation: 'load',
                weekId: weekId
            });
            
            throw error;
        }
    }
    
    /**
     * Merge local and cloud data based on strategy
     * @param {string} weekId - Week identifier
     * @param {Array} localActive - Local active codes
     * @param {Array} localDeleted - Local deleted codes
     * @param {Array} cloudActive - Cloud active codes
     * @param {Array} cloudDeleted - Cloud deleted codes
     * @param {string} strategy - Merge strategy ('replace', 'merge', 'local-wins', 'cloud-wins')
     * @returns {Object} Merged data {activeCodes, deletedCodes}
     */
    mergeData(weekId, localActive, localDeleted, cloudActive, cloudDeleted, strategy = 'replace') {
        // If no cloud data, return local data
        if (!cloudActive || !cloudDeleted) {
            return {
                activeCodes: localActive,
                deletedCodes: localDeleted
            };
        }
        
        // If no local data, return cloud data
        if (!localActive || !localDeleted) {
            return {
                activeCodes: cloudActive,
                deletedCodes: cloudDeleted
            };
        }
        
        let resultActive = [];
        let resultDeleted = [];
        
        switch (strategy) {
            case 'replace':
                // Cloud data completely replaces local data
                resultActive = [...cloudActive];
                resultDeleted = [...cloudDeleted];
                break;
                
            case 'local-wins':
                // Local data takes precedence
                resultActive = [...localActive];
                resultDeleted = [...localDeleted];
                break;
                
            case 'cloud-wins':
                // Cloud data takes precedence
                resultActive = [...cloudActive];
                resultDeleted = [...cloudDeleted];
                break;
                
            case 'merge':
                // Merge both active and deleted lists
                // Create maps for faster lookups
                const localActiveMap = new Map(localActive.map(item => [item.code, item]));
                const cloudActiveMap = new Map(cloudActive.map(item => [item.code, item]));
                const localDeletedMap = new Map(localDeleted.map(item => [item.code, item]));
                const cloudDeletedMap = new Map(cloudDeleted.map(item => [item.code, item]));
                
                // Process active codes
                const allActiveCodes = new Set([
                    ...localActive.map(item => item.code),
                    ...cloudActive.map(item => item.code)
                ]);
                
                // Process deleted codes
                const allDeletedCodes = new Set([
                    ...localDeleted.map(item => item.code),
                    ...cloudDeleted.map(item => item.code)
                ]);
                
                // If a code is in both active lists, sum quantities
                allActiveCodes.forEach(code => {
                    // Skip if in either deleted list
                    if (localDeletedMap.has(code) || cloudDeletedMap.has(code)) {
                        return;
                    }
                    
                    const localItem = localActiveMap.get(code);
                    const cloudItem = cloudActiveMap.get(code);
                    
                    if (localItem && cloudItem) {
                        // In both active lists - sum quantities
                        resultActive.push({
                            code: code,
                            quantity: localItem.quantity + cloudItem.quantity
                        });
                    } else if (localItem) {
                        // Only in local
                        resultActive.push({...localItem});
                    } else if (cloudItem) {
                        // Only in cloud
                        resultActive.push({...cloudItem});
                    }
                });
                
                // If a code is in both deleted lists, sum quantities
                allDeletedCodes.forEach(code => {
                    const localItem = localDeletedMap.get(code);
                    const cloudItem = cloudDeletedMap.get(code);
                    
                    if (localItem && cloudItem) {
                        // In both deleted lists - sum quantities
                        resultDeleted.push({
                            code: code,
                            quantity: localItem.quantity + cloudItem.quantity
                        });
                    } else if (localItem) {
                        // Only in local
                        resultDeleted.push({...localItem});
                    } else if (cloudItem) {
                        // Only in cloud
                        resultDeleted.push({...cloudItem});
                    }
                });
                break;
                
            default:
                // Default to replace strategy
                resultActive = [...cloudActive];
                resultDeleted = [...cloudDeleted];
        }
        
        return {
            activeCodes: resultActive,
            deletedCodes: resultDeleted
        };
    }
}

// Create and export a singleton instance
const firebaseManager = new FirebaseManager();
export default firebaseManager;