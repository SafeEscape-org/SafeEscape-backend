const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Simple mock SMS service that just logs messages
class SMSService {
  constructor() {
    console.log('📱 SMS Service initialized in stub mode - messages will be logged but not sent');
  }

  /**
   * Formats phone number to E.164 (global format)
   * @param {string} phone - User's phone number
   * @param {string} countryCode - User's country code (e.g., "US", "IN")
   * @returns {string|null} - Formatted number or null if invalid
   */
  formatPhoneNumber(phone, countryCode) {
    try {
      const number = phoneUtil.parseAndKeepRawInput(phone, countryCode);
      if (!phoneUtil.isValidNumber(number)) throw new Error("Invalid phone number");
      return phoneUtil.format(number, 0); // Correct E.164 format
    } catch (error) {
      console.error(`❌ Invalid phone number (${phone} - ${countryCode}): ${error.message}`);
      return null;
    }
  }

  /**
   * Logs SMS messages instead of sending them
   * @param {string} phone - User's phone number
   * @param {string} countryCode - Country code (e.g., "US", "IN")
   * @param {string} message - SMS message body
   */
  async sendSMS(phone, countryCode, message) {
    try {
      const formattedPhone = this.formatPhoneNumber(phone, countryCode);
      if (!formattedPhone) return { success: false, error: "Invalid phone number" };

      // Log the message instead of sending it
      console.log(`📱 [SMS STUB] Would send to ${formattedPhone}: "${message}"`);
      
      // Return a mock success response
      return { 
        success: true, 
        response: { 
          sid: `MOCK_${Date.now()}`,
          status: 'simulated' 
        }
      };
    } catch (error) {
      console.error(`❌ Failed to process SMS to ${phone}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logs emergency alerts instead of sending them
   * @param {Object} alert - Alert details (type, description, affectedUsers)
   */
  async sendEmergencyAlerts(alert) {
    try {
      const message = `🚨 Emergency Alert: ${alert.type} - ${alert.description}`;
      
      console.log(`📱 [EMERGENCY SMS STUB] Would send ${alert.affectedUsers.length} alerts:`);
      alert.affectedUsers.forEach(user => {
        console.log(`   - To: ${user.phone} (${user.countryCode}): "${message}"`);
      });

      return { 
        successCount: alert.affectedUsers.length,
        failureCount: 0,
        results: alert.affectedUsers.map(user => ({
          success: true,
          response: { sid: `MOCK_${Date.now()}`, status: 'simulated' }
        }))
      };
    } catch (error) {
      console.error(`❌ Failed to process emergency alerts: ${error.message}`);
      throw new Error(error.message);
    }
  }
}

module.exports = new SMSService();
