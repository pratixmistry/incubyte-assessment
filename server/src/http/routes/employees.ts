import { Router } from 'express';
import { z } from 'zod';
import { employeeInputSchema, employeeListQuerySchema } from '../../domain/employee.js';
import type { EmployeeService } from '../../services/employeeService.js';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function employeesRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(service.list(employeeListQuerySchema.parse(req.query)));
  });

  router.get('/:id', (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(service.get(id));
  });

  router.post('/', (req, res) => {
    const created = service.create(employeeInputSchema.parse(req.body));
    res.status(201).location(`/api/employees/${created.id}`).json(created);
  });

  router.put('/:id', (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(service.update(id, employeeInputSchema.parse(req.body)));
  });

  router.delete('/:id', (req, res) => {
    const { id } = idParam.parse(req.params);
    service.delete(id);
    res.status(204).end();
  });

  return router;
}
