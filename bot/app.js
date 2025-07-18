const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const multer = require('multer');
const sharp = require('sharp');

// Import your existing alert services
const noaaWeatherService = require('./services/alertServices/noaaWeatherService');
const usgsEarthquakeService = require('./services/alertServices/usgsEarthquakeService');
const openFemaService = require('./services/alertServices/openFemaService');
const openWeatherService = require('./services/alertServices/openWeatherService');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SAFETY_PROMPT = `You are an emergency medical assistant. Analyze the image and provide:
1. Injury assessment
2. Immediate first-aid steps
3. Warning signs to watch for
4. When to seek professional help
Include relevant emergency alerts from the area if available.`;

// Import secure file upload middleware
const { imageUpload, handleUploadError, validateFileBuffer } = require('../middleware/security/fileUpload');

app.post('/analyze-image', imageUpload.single('image'), handleUploadError, validateFileBuffer, async (req, res) => {
    try {
        // Process image with sharp
        const imageBuffer = await sharp(req.file.buffer)
            .resize(800, 800, { fit: 'inside' })
            .toBuffer();

        // Convert to base64
        const imageBase64 = imageBuffer.toString('base64');

        // Get Gemini vision model
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

        // Prepare image part
        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg'
            }
        };

        // Get local alerts
        const city = req.body.city || 'Default City';
        const [weatherAlerts, earthquakes, disasters, currentWeather] = await Promise.all([
            noaaWeatherService.getWeatherAlerts(),
            usgsEarthquakeService.getRecentEarthquakes(),
            openFemaService.getDisasterDeclarations(),
            openWeatherService.getCurrentWeather(city)
        ]);

        // Add alerts context to prompt
        const contextPrompt = `
            ${SAFETY_PROMPT}
            
            Current local conditions:
            Weather: ${JSON.stringify(currentWeather)}
            Active Alerts: ${JSON.stringify(weatherAlerts)}
            Recent Earthquakes: ${JSON.stringify(earthquakes)}
            Disaster Declarations: ${JSON.stringify(disasters)}
        `;

        // Generate response
        const result = await model.generateContent([contextPrompt, imagePart]);
        const response = await result.response;

        res.json({
            response: response.text(),
            alerts: {
                weather: weatherAlerts,
                earthquakes,
                disasters,
                currentWeather
            }
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 