const evacuationRouteService = require('../routes/evacuationRoutes');

class RouteController {
  async getEvacuationRoute(req, res) {
    try {
      const { location, disasterType } = req.body;
      
      const route = await evacuationRouteService.calculateEvacuationRoute(
        location,
        disasterType
      );
      
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new RouteController();