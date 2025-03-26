const express = require('express');
const router = express.Router();
const { getEvacuationRoutes, findSafeLocations, getDistanceMatrix, geocodeLocation } = require('../controllers/mapController');

router.get('/directions', getEvacuationRoutes);
router.get('/safe-locations', findSafeLocations);
router.get('/distance-matrix', getDistanceMatrix);
router.get('/geocode', geocodeLocation);

module.exports = router;