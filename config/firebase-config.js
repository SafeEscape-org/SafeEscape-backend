const admin = require('firebase-admin');
const serviceAccount = require('./firebase-serviceAccount.json');

let firebaseApp;
let firestoreDb;

// Initialize Firebase Admin with Firestore
const initializeFirebase = () => {
    try {
        if (!admin.apps.length) {
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            firebaseApp = admin.app();
        }

        firestoreDb = admin.firestore();
        
        // Configure Firestore settings
        firestoreDb.settings({
            timestampsInSnapshots: true,
            ignoreUndefinedProperties: true
        });

        console.log('✅ Firebase initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
    }
};

// Initialize immediately
initializeFirebase();

// Export both the admin instance and the db
module.exports = {
    admin,
    db: firestoreDb,
    FieldValue: admin.firestore.FieldValue
};