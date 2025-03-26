// Instead, import the initialized instances:
const { db, admin } = require('../config/firebase-config');
const FieldValue = admin.firestore.FieldValue;

class AlertService {
  /**
   * Create a new alert in Firestore
   * @param {Object} alertData - Alert details
   * @returns {Promise<Object>} - Saved alert document
   */
  async createAlert(alertData) {
    try {
      const alertRef = db.collection('alerts').doc(); // Generate a new doc ID
      const newAlert = {
        type: alertData.type,
        severity: alertData.severity, // 'low', 'medium', 'high'
        location: {
          type: 'Point',
          coordinates: alertData.coordinates || []
        },
        description: alertData.description || '',
        timestamp: FieldValue.serverTimestamp(),
        affectedUsers: alertData.affectedUsers || []
      };

      await alertRef.set(newAlert);
      return { id: alertRef.id, ...newAlert };
    } catch (error) {
      console.error('❌ Error creating alert:', error);
      throw new Error('Failed to create alert: ' + error.message);
    }
  }

  /**
   * Get an alert by ID
   * @param {string} alertId - Alert document ID
   * @returns {Promise<Object|null>} - Alert data or null if not found
   */
  async getAlertById(alertId) {
    try {
      const alertDoc = await db.collection('alerts').doc(alertId).get();
      if (!alertDoc.exists) return null;
      return { id: alertDoc.id, ...alertDoc.data() };
    } catch (error) {
      console.error('❌ Error fetching alert:', error);
      throw new Error('Failed to fetch alert: ' + error.message);
    }
  }

  /**
   * Get all alerts
   * @returns {Promise<Array>} - List of alerts
   */
  async getAllAlerts() {
    try {
      const snapshot = await db.collection('alerts').orderBy('timestamp', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      throw new Error('Failed to fetch alerts: ' + error.message);
    }
  }

  /**
   * Delete an alert
   * @param {string} alertId - Alert document ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteAlert(alertId) {
    try {
      await db.collection('alerts').doc(alertId).delete();
      return { success: true, message: 'Alert deleted successfully' };
    } catch (error) {
      console.error('❌ Error deleting alert:', error);
      throw new Error('Failed to delete alert: ' + error.message);
    }
  }
}

module.exports = new AlertService();
