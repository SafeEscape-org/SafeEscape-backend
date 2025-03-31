const admin = require('firebase-admin');

let firebaseApp;
let firestoreDb;

const initializeFirebase = () => {
    try {
        if (admin.apps.length) {
            firebaseApp = admin.app();
            firestoreDb = admin.firestore();
            return;
        }

        // Check if running in Cloud Run with environment variables
        if (process.env.FIREBASE_CREDENTIALS) {
            try {
                // Parse credentials from environment variable
                const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } catch (error) {
                console.error('❌ Error initializing Firebase with env credentials:', error);
                throw error;
            }
        } else {
            // Fallback to local service account file
            try {
                const serviceAccount = require('./firebase-serviceAccount.json');
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
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
        throw error; // Rethrow to allow handling at higher level
    }
};

// Initialize immediately
initializeFirebase();

// Collection references for convenience
const collections = {
    users: firestoreDb.collection('users'),
    alerts: firestoreDb.collection('alerts'),
    disasters: firestoreDb.collection('disasters'),
    emergencies: firestoreDb.collection('emergencies')
};

// Export admin, db, collections, and field values
module.exports = {
    admin,
    db: firestoreDb,
    collections,
    fieldValues: admin.firestore.FieldValue
};