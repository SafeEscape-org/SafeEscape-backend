const admin = require('../../../config/firebase-config');
const { collections } = require('../../../config/firebase-config');
const geolib = require('geolib');

class PushNotificationService {
  /**
   * Fetch latest disaster data and notify affected users
   */
  async notifyUsersOfDisaster() {
    try {
      // Fetch latest disaster event
      const disasterSnapshot = await collections.disasters.orderBy('timestamp', 'desc').limit(1).get();
      if (disasterSnapshot.empty) throw new Error('No disasters found in database');

      const disaster = disasterSnapshot.docs[0].data();
      console.log(`🔥 Disaster Alert: ${disaster.type} in ${disaster.location.city}`);

      // Fetch all users (Optimize with Firestore pagination if needed)
      const usersSnapshot = await collections.users.get();
      if (usersSnapshot.empty) return console.log('✅ No users found in database');

      // Filter users within the affected area and collect valid FCM tokens
      const userTokens = usersSnapshot.docs
        .map(doc => doc.data())
        .filter(user => user.location && user.location.latitude && user.location.longitude)
        .filter(user => geolib.getDistance(
          { latitude: user.location.latitude, longitude: user.location.longitude },
          { latitude: disaster.location.latitude, longitude: disaster.location.longitude }
        ) <= disaster.radius)
        .flatMap(user => user.fcmTokens?.map(tokenObj => tokenObj.token) || []);

      if (!userTokens.length) return console.log('🚨 No users with valid FCM tokens in affected area');

      console.log(`📢 Sending notifications to ${userTokens.length} users`);

      // Send notifications
      const response = await admin.admin.messaging().sendEachForMulticast({
        tokens: userTokens,
        notification: { title: `🚨 Disaster Alert: ${disaster.type}`, body: disaster.description }
      });

      console.log(`✅ Notifications sent: Success(${response.successCount}), Failed(${response.failureCount})`);

      // Log failed tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) console.error(`❌ Failed to send notification to token ${userTokens[idx]}:`, resp.error);
      });

    } catch (error) {
      console.error('❌ Error sending disaster notifications:', error.message);
    }
  }
}

module.exports = new PushNotificationService();
