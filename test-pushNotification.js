const admin = require('./config/firebase-config');

async function checkFCMTokenValidity(fcmToken) {
    try {
        const message = {
            token: fcmToken,
            notification: {
                title: "Test Notification",
                body: "Checking if this token is valid",
            },
        };

        await admin.admin.messaging().send(message);
        console.log(`✅ Token is valid: ${fcmToken}`);
        return true;
    } catch (error) {
        console.error(`❌ Invalid token: ${fcmToken}`, error.message);
        if (error.code === "messaging/registration-token-not-registered") {
            console.log("🚨 This token is expired or unregistered. Remove it from your database.");
            return false;
        }
        return false;
    }
}

// Example usage
const testToken = "eBp_fQVkR2C05nYJ0LAYk6:APA91bEyOUelP9vHAaOisTmkUDJwA5w08baXWtpydTZx8zVcyUmJy0_jFldrInHt03wj4RhA51bZZeKYZvQGKRtqK0O69NKDqGfB-1fd8wQZGmtGIx7j8OI";
checkFCMTokenValidity(testToken);
