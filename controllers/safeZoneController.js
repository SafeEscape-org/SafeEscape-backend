const evacuationRouteService = require('../services/mapServices/googleMapsClient');

class SafeZoneController {
  async getNearestSafeZones(req, res) {
    try {
      const { location, disasterType } = req.body;
      
      const safeZones = await evacuationRouteService.findSafeZones(
        location,
        disasterType
      );
      
      res.json(safeZones);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new SafeZoneController();