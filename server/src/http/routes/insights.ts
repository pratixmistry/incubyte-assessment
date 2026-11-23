import { Router } from 'express';
import { breakdownQuerySchema, type InsightsService, insightsQuerySchema } from '../../services/insightsService.js';

export function insightsRouter(service: InsightsService): Router {
  const router = Router();

  router.get('/summary', (req, res) => {
    const { country } = insightsQuerySchema.parse(req.query);
    res.json(service.summary(country));
  });

  router.get('/breakdown', (req, res) => {
    const { country, groupBy } = breakdownQuerySchema.parse(req.query);
    res.json(service.breakdown(groupBy, country));
  });

  router.get('/distribution', (req, res) => {
    const { country } = insightsQuerySchema.parse(req.query);
    res.json(service.distribution(country));
  });

  return router;
}
