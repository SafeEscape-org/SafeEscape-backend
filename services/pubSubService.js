const { PubSub } = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

// Add a flag to use existing topics/subscriptions
const USE_EXISTING_PUBSUB = true;

// Publish a message to a specific topic
async function publishMessage(topicName, data) {
    const dataBuffer = Buffer.from(JSON.stringify(data));

    try {
        const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
        console.log(`Message ${messageId} published to topic ${topicName}`);
        return messageId;
    } catch (error) {
        console.error('Error publishing message:', error);
        throw new Error('Failed to publish message');
    }
}

// Subscribe to a specific subscription
async function subscribeToMessages(subscriptionName, messageHandler) {
    const subscription = pubSubClient.subscription(subscriptionName);

    const messageHandlerWrapper = (message) => {
        messageHandler(message);
        message.ack(); // Acknowledge the message after processing
    };

    subscription.on('message', messageHandlerWrapper);
    console.log(`Listening for messages on subscription ${subscriptionName}`);
}

// Example message handler
const exampleMessageHandler = (message) => {
    const data = JSON.parse(message.data.toString());
    console.log('Received message:', data);
};

// Initialize Pub/Sub service
async function initialize() {
    try {
        console.log('Initializing Pub/Sub service...');
        
        // Load credentials file if available
        const projectId = this.getProjectId();
        
        // Create PubSub client
        this.pubSubClient = new PubSub({ projectId });
        
        if (!USE_EXISTING_PUBSUB) {
            // Skip topic and subscription creation when using existing ones
            await this.createTopicsAndSubscriptions();
        } else {
            console.log('Using existing Pub/Sub topics and subscriptions');
        }
        
        console.log('Pub/Sub service initialized successfully.');
        return true;
    } catch (error) {
        console.error('Failed to initialize Pub/Sub service:', error);
        return false;
    }
}

// Example code to add to your pubSubService.js
async function createSampleSubscription() {
    try {
        const sampleTopicName = 'safescape-sample-topic';
        const sampleSubscriptionName = 'safescape-sample-subscription';
        
        console.log(`Creating sample topic: ${sampleTopicName}`);
        const [topic] = await this.pubSubClient.createTopic(sampleTopicName);
        
        console.log(`Creating sample subscription: ${sampleSubscriptionName}`);
        await topic.createSubscription(sampleSubscriptionName);
        
        console.log('Sample PubSub resources created successfully');
        return true;
    } catch (error) {
        console.error('Error creating sample resources:', error);
        return false;
    }
}

// Export the functions for use in other parts of the application
module.exports = {
    publishMessage,
    subscribeToMessages,
    exampleMessageHandler,
    initialize,
    createSampleSubscription,
};