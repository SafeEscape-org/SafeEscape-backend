const express = require('express');
const router = express.Router();
const noaaWeatherService = require('../services/alertServices/noaaWeatherService');
const usgsEarthquakeService = require('../services/alertServices/usgsEarthquakeService');
const openFemaService = require('../services/alertServices/openFemaService');
const openWeatherService = require('../services/alertServices/openWeatherService'); // Add this import

// NOAA Weather Alerts endpoint
router.get('/weather/noaa', async (req, res) => {
    try {
        const weatherAlerts = await noaaWeatherService.getWeatherAlerts();
        res.json(weatherAlerts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching NOAA weather alerts' });
    }
});

// Add a simple weather endpoint that matches your request pattern
router.get('/weather/:city', async (req, res) => {
    try {
        const city = req.params.city;
        const currentWeather = await openWeatherService.getCurrentWeather(city);
        res.json(currentWeather);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching weather for ' + req.params.city });
    }
});

// USGS Earthquakes endpoint
router.get('/earthquakes', async (req, res) => {
    try {
        const recentEarthquakes = await usgsEarthquakeService.getRecentEarthquakes();
        res.json(recentEarthquakes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching earthquake data' });
    }
});

// OpenFEMA Disaster Declarations endpoint
router.get('/disasters', async (req, res) => {
    try {
        const disasterDeclarations = await openFemaService.getDisasterDeclarations();
        res.json(disasterDeclarations);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching disaster declarations' });
    }
});

// OpenWeather Current Weather endpoint
router.get('/weather/current/:city', async (req, res) => {
    try {
        const city = req.params.city;
        const currentWeather = await openWeatherService.getCurrentWeather(city);
        res.json(currentWeather);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching current weather' });
    }
});

// OpenWeather Alerts endpoint
router.get('/weather/openweather/:city', async (req, res) => {
    try {
        const city = req.params.city;
        const weatherAlerts = await openWeatherService.getWeatherAlerts(city);
        res.json(weatherAlerts);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching OpenWeather alerts' });
    }
});

module.exports = router;