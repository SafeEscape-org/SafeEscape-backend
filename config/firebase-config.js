const admin = require('firebase-admin');

let firebaseApp;
let firestoreDb;

const initializeFirebase = () => {
    try {
        // Check if already initialized
        if (admin.apps.length) {
            console.log('Firebase already initialized, reusing existing app');
            firebaseApp = admin.app();
            firestoreDb = admin.firestore();
            return;
        }

        console.log('Initializing Firebase...');
        
        // Check if running in Cloud Run with environment variables
        if (process.env.FIREBASE_CREDENTIALS) {
            try {
                // Parse credentials from environment variable with better error handling
                let serviceAccount;
                try {
                    serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
                    console.log('Successfully parsed Firebase credentials from environment variable');
                } catch (parseError) {
                    console.error('❌ Failed to parse FIREBASE_CREDENTIALS JSON:', parseError);
                    throw new Error('Invalid Firebase credentials format. Must be valid JSON.');
                }
                
                // Initialize Firebase with environment credentials
                console.log('Initializing Firebase with environment credentials...');
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('Firebase initialized with environment credentials');
            } catch (error) {
                console.error('❌ Error initializing Firebase with env credentials:', error);
                throw error;
            }
        } else {
            // Fallback to local service account file
            try {
                console.log('Attempting to use local service account file...');
                const serviceAccount = require('./firebase-serviceAccount.json');
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                console.log('Firebase initialized with local credentials');
            } catch (error) {
                console.error('❌ Error initializing Firebase with local credentials:', error);
                throw error;
            }
        }

        firestoreDb = admin.firestore();
        
        // Configure Firestore settings
        firestoreDb.settings({
            ignoreUndefinedProperties: true
        });

        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
        console.error('Error details:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        throw error; // Rethrow to allow handling at higher level
    }
};

// Defer initialization to avoid immediate errors
console.log('Firebase config loaded, initialization pending...');
let initialized = false;

// Get or initialize firebase
const getFirebase = () => {
    if (!initialized) {
        initializeFirebase();
        initialized = true;
    }
    return { admin, db: firestoreDb };
};

// Collection references convenience function
const getCollections = () => {
    if (!firestoreDb) {
        initializeFirebase();
    }
    
    return {
        users: firestoreDb.collection('users'),
        alerts: firestoreDb.collection('alerts'),
        disasters: firestoreDb.collection('disasters'),
        emergencies: firestoreDb.collection('emergencies')
    };
};

// Function to test Firebase connection
const testConnection = async () => {
    try {
        if (!initialized) {
            initializeFirebase();
            initialized = true;
        }
        
        if (!firestoreDb) {
            throw new Error('Firestore DB not initialized');
        }
        
        // Try to access a system document or create one if it doesn't exist
        const systemRef = firestoreDb.collection('system').doc('status');
        
        // Write a timestamp to verify write access
        await systemRef.set({
            lastChecked: admin.firestore.FieldValue.serverTimestamp(),
            status: 'online'
        }, { merge: true });
        
        // Read it back to verify read access
        const doc = await systemRef.get();
        
        console.log('✅ Firebase connection test successful');
        return {
            connected: true,
            timestamp: new Date().toISOString(),
            exists: doc.exists
        };
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error.message);
        return {
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Export getters instead of direct objects
module.exports = {
    getFirebase,
    testConnection,  // Add this new function
    get admin() { return getFirebase().admin; },
    get db() { return getFirebase().db; },
    get collections() { return getCollections(); },
    get fieldValues() { return admin.firestore.FieldValue; }
};