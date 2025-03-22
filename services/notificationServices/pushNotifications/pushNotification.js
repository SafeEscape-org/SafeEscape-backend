// const admin = require('../../../config/firebase-config');

// class PushNotificationService {
//   async sendToUser(userId, notification) {
//     try {
//       const message = {
//         notification: {
//           title: notification.title,
//           body: notification.body
//         },
//         token: userId
//       };

//       const response = await admin.messaging().send(message);
//       return response;
//     } catch (error) {
//       throw new Error('Failed to send push notification: ' + error.message);
//     }
//   }

//   async sendToAffectedUsers(alert) {
//     try {
//       const messages = alert.affectedUsers.map(userId => ({
//         notification: {
//           title: `Emergency Alert: ${alert.type}`,
//           body: alert.description
//         },
//         token: userId
//       }));

//       const response = await admin.messaging().sendAll(messages);
//       return response;
//     } catch (error) {
//       throw new Error('Failed to send bulk notifications: ' + error.message);
//     }
//   }
// }

// module.exports = new PushNotificationService(); 
// const admin = require('../../../config/firebase-config');
// const { collections } = require('../../../config/firebase-config');

// class PushNotificationService {
//   /**
//    * Send a push notification to a specific user
//    * @param {string} userId - Firestore user ID
//    * @param {Object} notification - Notification details { title, body }
//    */
//   async sendToUser(userId, notification) {
//     try {
//       // Fetch user from Firestore
//       const userDoc = await collections.users.doc(userId).get();
//       console.log("user data is", userDoc.data())
//       if (!userDoc.exists) {
//         throw new Error('User not found');
//       }

//       const user = userDoc.data();
//       if (!user.fcmTokens || user.fcmTokens.length === 0) {
//         throw new Error('No FCM token found for this user');
//       }

//       // Prepare messages for all user tokens
//       const messages = user.fcmTokens.map(token => ({
//         notification: {
//           title: notification.title,
//           body: notification.body
//         },
//         token
//       }));

//       // Send notifications
//       const response = await admin.messaging().sendAll(messages);
//       return response;
//     } catch (error) {
//       console.error('❌ Error sending push notification:', error.message);
//       throw new Error('Failed to send push notification: ' + error.message);
//     }
//   }

//   /**
//    * Send a push notification to multiple affected users
//    * @param {Object} alert - Alert object { type, description, affectedUsers }
//    */
//   async sendToAffectedUsers(alert) {
//     try {
//       const userTokens = [];

//       // Fetch all affected users' FCM tokens
//       for (const userId of alert.affectedUsers) {
//         const userDoc = await collections.users.doc(userId).get();
//         if (userDoc.exists) {
//           const user = userDoc.data();
//           if (user.fcmTokens && user.fcmTokens.length > 0) {
//             userTokens.push(...user.fcmTokens);
//           }
//         }
//       }

//       if (userTokens.length === 0) {
//         throw new Error('No FCM tokens found for affected users');
//       }

//       // Prepare messages
//       const messages = userTokens.map(token => ({
//         notification: {
//           title: `🚨 Emergency Alert: ${alert.type}`,
//           body: alert.description
//         },
//         token
//       }));

//       // Send notifications
//       const response = await admin.messaging().sendAll(messages);
//       return response;
//     } catch (error) {
//       console.error('❌ Error sending bulk notifications:', error.message);
//       throw new Error('Failed to send bulk notifications: ' + error.message);
//     }
//   }
//   /**
//  * Send a push notification to users based on their location
//  * @param {Object} alert - Alert object { type, description, location }
//  */
//   async sendToUsersByLocation(alert) {
//     try {
//       const userTokens = [];
//       const usersSnapshot = await collections.users.where('location', '==', alert.location).get();

//       if (usersSnapshot.empty) {
//         throw new Error('No users found in the specified location');
//       }

//       usersSnapshot.forEach(userDoc => {
//         const user = userDoc.data();
//         if (user.fcmTokens && user.fcmTokens.length > 0) {
//           userTokens.push(...user.fcmTokens);
//         }
//       });

//       if (userTokens.length === 0) {
//         throw new Error('No FCM tokens found for users in the specified location');
//       }

//       // Prepare messages
//       const messages = userTokens.map(token => ({
//         notification: {
//           title: `🚨 Location-Based Alert: ${alert.type}`,
//           body: alert.description
//         },
//         token
//       }));

//       // Send notifications
//       const response = await admin.messaging().sendAll(messages);
//       return response;
//     } catch (error) {
//       console.error('❌ Error sending location-based notifications:', error.message);
//       throw new Error('Failed to send location-based notifications: ' + error.message);
//     }
//   }
// }

// module.exports = new PushNotificationService();
const admin = require('../../../config/firebase-config');
const { collections } = require('../../../config/firebase-config');

class PushNotificationService {
  /**
   * Fetch disaster data and send notifications to affected users
   */
  async notifyUsersOfDisaster() {
    try {
      // Step 1: Fetch latest disaster (fake data)
      const disasterSnapshot = await collections.disasters.orderBy('timestamp', 'desc').limit(1).get();
      if (disasterSnapshot.empty) {
        throw new Error('No disasters found in database');
      }

      const disaster = disasterSnapshot.docs[0].data();
      console.log("disaster data is", disaster)
      console.log(`🔥 Disaster Alert: ${disaster.type} in ${disaster.location.city}`);

      // Step 2: Fetch users in the affected location
      const usersSnapshot = await collections.users.where('location', '==', disaster.location).get();
      if (usersSnapshot.empty) {
        console.log('✅ No users in the affected area');
        return;
      }

      const userTokens = [];
      usersSnapshot.forEach(userDoc => {
        const user = userDoc.data();
        if (user.fcmTokens && user.fcmTokens.length > 0) {
          userTokens.push(...user.fcmTokens);
        }
      });

      if (userTokens.length === 0) {
        console.log('🚨 No users with valid FCM tokens in this location');
        return;
      }

      // Step 3: Send push notifications
      const message = {
        tokens: userTokens,
        notification: {
          title: `🚨 Disaster Alert: ${disaster.type}`,
          body: disaster.description
        }
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`📢 Sent notifications: Success(${response.successCount}), Failed(${response.failureCount})`);
    } catch (error) {
      console.error('❌ Error sending disaster notifications:', error.message);
    }
  }
}

module.exports = new PushNotificationService();
