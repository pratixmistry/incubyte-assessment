import { Router } from 'express';
import { FX_RATES_VERSION, USD_PER_UNIT } from '../../domain/currency.js';
import { COUNTRIES, DEPARTMENTS } from '../../domain/reference.js';
import type { EmployeeService } from '../../services/employeeService.js';

/** Reference data the UI needs for forms and filters. */
export function metaRouter(employees: EmployeeService): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json({
      countries: COUNTRIES,
      departments: DEPARTMENTS,
      jobTitles: employees.jobTitles(),
      fxRates: { version: FX_RATES_VERSION, usdPerUnit: USD_PER_UNIT },
    });
  });
  return router;
}
