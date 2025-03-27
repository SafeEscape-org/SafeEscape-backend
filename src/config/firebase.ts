import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if running in Cloud Run with secret mounted
  if (process.env.FIREBASE_CREDENTIALS) {
    try {
      // Parse the credentials from the environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (error) {
      console.error('Error initializing Firebase with credentials from environment:', error);
      throw error;
    }
  } else {
    // Fallback to local credentials file for development
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(
          require('../../config/firebase-serviceAccount.json')
        )
      });
    } catch (error) {
      console.error('Error initializing Firebase with local credentials file:', error);
      throw error;
    }
  }

  return firebaseApp;
};

export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};
